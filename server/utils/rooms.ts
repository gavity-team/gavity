import type { MeetingEngineState } from '#shared/utils/meeting-engine';
import type { Meeting } from '#shared/utils/mettings';
import type { ClientAction, RosterEntry, ServerMessage } from '#shared/utils/protocol';
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import * as engine from '#shared/utils/meeting-engine';
import { BallotMap, MeetingStatusMap, VoteMethodMap } from '#shared/utils/mettings';
import { roleOf } from '#shared/utils/rules';
import { getDb, getPg } from './db';
import { meetingCodes, meetingPresence, meetings } from './db/schema';

/**
 * 多人会议房间：Postgres 是会议状态的唯一权威。
 * 动作在 advisory lock 事务中应用；实例间广播经 Postgres LISTEN/NOTIFY 中转，
 * 各实例收到事件后从库里加载最新状态推送给本地连接。
 */

/** 所有实例共享的 NOTIFY 频道。 */
const CHANNEL = 'gavity_room';
/** 超过此时长未收到 ping 视为断线（名册标记离线）。 */
const OFFLINE_MS = 20_000;
/** 超过此时长未收到 ping 则关闭连接。 */
const CLOSE_MS = 30_000;
/** 实例崩溃遗留的 presence 行清理阈值。 */
const REAP_MS = 90_000;
/** 定期扫描间隔。 */
const SWEEP_MS = 10_000;
/** state.logs 保留上限，防止 jsonb 无限膨胀。 */
const MAX_LOGS = 500;

const instanceId = crypto.randomUUID();

/** crossws Peer 中本模块用到的最小接口。 */
export interface RoomPeer {
  id: string
  context: Record<string, unknown>
  send: (data: string) => void
  close: (code?: number, reason?: string) => void
}

/** WS 升级时写入 peer.context 的连接身份。 */
export interface PeerIdentity {
  meetingId: number
  userId: string
}

type RoomEvent
  = | { t: 'update', meetingId: number, fromSeq: number, toSeq: number, exclude?: string }
    | { t: 'kick', meetingId: number, userId: string, keepConn: string };

/** 本实例持有的活跃连接，按会议分组。 */
const localRooms = new Map<number, Set<RoomPeer>>();

/** 本实例各连接最后一次收到 ping 的时间。 */
const lastPingAt = new WeakMap<RoomPeer, number>();

function identityOf(peer: RoomPeer): PeerIdentity {
  return peer.context as unknown as PeerIdentity;
}

function sendTo(peer: RoomPeer, msg: ServerMessage): void {
  try {
    peer.send(JSON.stringify(msg));
  } catch { /* 连接异常时忽略，等待 close 回调清理。 */ }
}

async function notify(event: RoomEvent): Promise<void> {
  await getPg().notify(CHANNEL, JSON.stringify(event));
}

// ===== LISTEN / presence 扫描 =====

let listening: Promise<unknown> | null = null;
let sweepTimer: ReturnType<typeof setInterval> | null = null;

/** 惰性建立 LISTEN 专用连接（postgres.js 断线自动重连），并启动 presence 扫描。 */
function ensureListening(): Promise<unknown> {
  listening ??= getPg()
    .listen(CHANNEL, (payload) => {
      try {
        void handleEvent(JSON.parse(payload) as RoomEvent);
      } catch { /* 忽略畸形事件。 */ }
    })
    .catch((err) => {
      listening = null;
      throw err;
    });
  sweepTimer ??= setInterval(() => void sweep(), SWEEP_MS);
  return listening;
}

/**
 * 定期扫描：关闭本实例上超时未 ping 的连接，
 * 广播刚跨过断线阈值的会议，并清理实例崩溃遗留的 presence 行。
 */
async function sweep(): Promise<void> {
  try {
    const now = Date.now();
    // 超过 30s 未 ping：关闭连接（close 回调会清理 presence 并广播）
    for (const peers of localRooms.values()) {
      for (const peer of peers) {
        const at = lastPingAt.get(peer) ?? now;
        if (now - at > CLOSE_MS)
          peer.close(4001, 'ping timeout');
      }
    }
    // 刚跨过 20s 断线阈值的用户：广播其会议名册（窗口取两轮扫描，重复广播无害）
    const justOffline = await getDb().select({ meetingId: meetingPresence.meetingId }).from(meetingPresence).where(and(
      lt(meetingPresence.lastSeenAt, new Date(now - OFFLINE_MS)),
      gte(meetingPresence.lastSeenAt, new Date(now - OFFLINE_MS - SWEEP_MS * 2)),
    ));
    const stale = await getDb().delete(meetingPresence).where(lt(meetingPresence.lastSeenAt, new Date(now - REAP_MS))).returning({ meetingId: meetingPresence.meetingId });
    for (const meetingId of new Set([...justOffline, ...stale].map(r => r.meetingId)))
      await notify({ t: 'update', meetingId, fromSeq: 0, toSeq: 0 });
  } catch (err) {
    console.error('[rooms] presence sweep failed', err);
  }
}

/** 客户端 ping：刷新 presence 心跳；若从断线状态恢复则广播名册。 */
export async function touchPresence(peer: RoomPeer): Promise<void> {
  const { meetingId, userId } = identityOf(peer);
  lastPingAt.set(peer, Date.now());
  const [row] = await getDb().select({ connId: meetingPresence.connId, lastSeenAt: meetingPresence.lastSeenAt }).from(meetingPresence).where(and(eq(meetingPresence.meetingId, meetingId), eq(meetingPresence.userId, userId)));
  if (row && row.connId !== peer.id)
    return; // presence 已被新连接接管，旧连接的 ping 不再续命
  const wasOffline = !row || row.lastSeenAt.getTime() < Date.now() - OFFLINE_MS;
  await getDb().insert(meetingPresence).values({ meetingId, userId, instanceId, connId: peer.id }).onConflictDoUpdate({
    target: [meetingPresence.meetingId, meetingPresence.userId],
    set: { lastSeenAt: new Date() },
  });
  if (wasOffline)
    await notify({ t: 'update', meetingId, fromSeq: 0, toSeq: 0 });
}

// ===== 状态读写 =====

/**
 * 在 advisory lock 事务中加载→变更→持久化会议状态。
 * fn 返回错误文案表示动作被拒绝（不落库）；返回 null 表示成功。
 */
async function mutate(
  meetingId: number,
  fn: (state: MeetingEngineState) => string | null,
): Promise<{ error: string | null, state: MeetingEngineState, fromSeq: number, toSeq: number }> {
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${meetingId})`);
    const [row] = await tx.select().from(meetings).where(eq(meetings.id, meetingId));
    if (!row)
      throw new Error('会议不存在');
    const state: MeetingEngineState = row.state ?? {
      meeting: engine.createEmptyMeeting(row.id, row.title, row.chairId),
      logs: [],
      pendingRulingMotionId: null,
      logSeq: 0,
    };
    const fromSeq = state.logSeq;
    const error = fn(state);
    if (error)
      return { error, state, fromSeq, toSeq: fromSeq };
    if (state.logs.length > MAX_LOGS)
      state.logs.splice(0, state.logs.length - MAX_LOGS);
    await tx.update(meetings)
      .set({ state, status: state.meeting.status })
      .where(eq(meetings.id, meetingId));
    // 会议结束后释放入会码，供后续会议复用（重复删除无害）
    if (state.meeting.status === MeetingStatusMap.ENDED)
      await tx.delete(meetingCodes).where(eq(meetingCodes.meetingId, meetingId));
    return { error: null, state, fromSeq, toSeq: state.logSeq };
  });
}

/** 名册 = 状态中的成员/旁听 + presence 表的在线情况（不含显示名）。 */
async function loadRoster(meetingId: number, state: MeetingEngineState): Promise<RosterEntry[]> {
  const rows = await getDb().select({ userId: meetingPresence.userId, lastSeenAt: meetingPresence.lastSeenAt }).from(meetingPresence).where(eq(meetingPresence.meetingId, meetingId));
  const cutoff = Date.now() - OFFLINE_MS;
  const online = new Set(rows.filter(r => r.lastSeenAt.getTime() > cutoff).map(r => r.userId));
  const m = state.meeting;
  return [...m.members, ...m.observers].map(id => ({
    id,
    role: roleOf(m, id),
    online: online.has(id),
  }));
}

/** 不记名投票对外隐藏票值（保留已投名单以显示进度）。 */
function redactMeeting(meeting: Meeting): Meeting {
  const vote = meeting.activeVote;
  if (!vote || vote.method !== VoteMethodMap.SECRET_BALLOT)
    return meeting;
  return {
    ...meeting,
    activeVote: {
      ...vote,
      ballots: Object.fromEntries(Object.keys(vote.ballots).map(uid => [uid, BallotMap.ABSTAIN])),
    },
  };
}

// ===== 事件分发 =====

async function handleEvent(event: RoomEvent): Promise<void> {
  const peers = localRooms.get(event.meetingId);
  if (!peers?.size)
    return;
  if (event.t === 'kick') {
    kickLocal(event.meetingId, event.userId, event.keepConn);
    return;
  }
  const [row] = await getDb().select({ state: meetings.state }).from(meetings).where(eq(meetings.id, event.meetingId));
  const state = row?.state;
  if (!state)
    return;
  const msg: ServerMessage = {
    type: 'update',
    meeting: redactMeeting(state.meeting),
    logs: state.logs.filter(l => l.id > event.fromSeq && l.id <= event.toSeq),
    pendingRulingMotionId: state.pendingRulingMotionId,
    roster: await loadRoster(event.meetingId, state),
  };
  const text = JSON.stringify(msg);
  for (const peer of peers) {
    if (peer.id === event.exclude)
      continue;
    try {
      peer.send(text);
    } catch { /* 连接异常时忽略。 */ }
  }
}

/** 单端限制：踢掉本实例上同一用户的其他连接。 */
function kickLocal(meetingId: number, userId: string, keepConn: string): void {
  for (const peer of localRooms.get(meetingId) ?? []) {
    if (identityOf(peer).userId === userId && peer.id !== keepConn) {
      sendTo(peer, { type: 'kicked', reason: 'replaced' });
      peer.close(4000, 'replaced');
    }
  }
}

// ===== 连接生命周期 =====

export async function joinRoom(peer: RoomPeer): Promise<void> {
  const { meetingId, userId } = identityOf(peer);
  await ensureListening();
  lastPingAt.set(peer, Date.now());

  const { state, fromSeq, toSeq } = await mutate(meetingId, (s) => {
    const m = s.meeting;
    if (!m.members.includes(userId) && !m.observers.includes(userId)) {
      m.members.push(userId);
      engine.pushLog(s, { type: 'memberJoined' }, { kind: 'meeting', actor: userId, icon: 'i-lucide-log-in' });
    }
    return null;
  });

  // 抢占 presence（单端限制），并踢掉新旧实例上的旧连接
  await getDb().insert(meetingPresence).values({ meetingId, userId, instanceId, connId: peer.id }).onConflictDoUpdate({
    target: [meetingPresence.meetingId, meetingPresence.userId],
    set: { instanceId, connId: peer.id, connectedAt: new Date(), lastSeenAt: new Date() },
  });
  kickLocal(meetingId, userId, peer.id);
  await notify({ t: 'kick', meetingId, userId, keepConn: peer.id });

  let peers = localRooms.get(meetingId);
  if (!peers)
    localRooms.set(meetingId, peers = new Set());
  peers.add(peer);

  sendTo(peer, {
    type: 'snapshot',
    meeting: redactMeeting(state.meeting),
    logs: state.logs,
    pendingRulingMotionId: state.pendingRulingMotionId,
    roster: await loadRoster(meetingId, state),
    you: userId,
  });
  await notify({ t: 'update', meetingId, fromSeq, toSeq, exclude: peer.id });
}

export async function handleAction(peer: RoomPeer, action: ClientAction): Promise<void> {
  const { meetingId, userId } = identityOf(peer);
  const { error, fromSeq, toSeq } = await mutate(meetingId, s => applyAction(s, userId, action));
  if (error) {
    sendTo(peer, { type: 'error', message: error });
    return;
  }
  await notify({ t: 'update', meetingId, fromSeq, toSeq });
}

export async function leaveRoom(peer: RoomPeer): Promise<void> {
  const { meetingId, userId } = identityOf(peer);
  const peers = localRooms.get(meetingId);
  peers?.delete(peer);
  if (peers && !peers.size)
    localRooms.delete(meetingId);
  // 仅当 presence 仍归属本连接时删除（避免误删接替连接的行）
  await getDb().delete(meetingPresence).where(and(
    eq(meetingPresence.meetingId, meetingId),
    eq(meetingPresence.userId, userId),
    eq(meetingPresence.connId, peer.id),
  ));
  await notify({ t: 'update', meetingId, fromSeq: 0, toSeq: 0 });
}

function applyAction(state: MeetingEngineState, userId: string, action: ClientAction): string | null {
  switch (action.action) {
    case 'ping': return null; // 在 ws 入口拦截，不会进入状态变更
    case 'startMeeting': return engine.startMeeting(state, userId);
    case 'endMeeting': return engine.endMeeting(state, userId);
    case 'resumeMeeting': return engine.resumeMeeting(state, userId);
    case 'toggleRecordMode': return engine.toggleRecordMode(state, userId);
    case 'grabFloor': return engine.grabFloor(state, userId);
    case 'endFloor': return engine.endFloor(state, userId);
    case 'assignFloor': return engine.assignFloor(state, userId, action.targetId);
    case 'revokeFloor': return engine.revokeFloor(state, userId);
    case 'proposeMotion': return engine.proposeMotion(state, userId, action.input);
    case 'resolveRuling': return engine.resolveRuling(state, userId, action.uphold);
    case 'secondMotion': return engine.secondMotion(state, userId, action.motionId);
    case 'openVote': return engine.openVote(state, userId, action.motionId, action.method);
    case 'declareVote': return engine.declareVote(state, userId, action.motionId, action.method, action.passed);
    case 'castBallot': return engine.castBallot(state, userId, action.ballot);
    case 'closeVote': return engine.closeVote(state, userId);
    case 'switchAgenda': return engine.switchAgenda(state, userId, action.itemId);
    case 'addAgendaItem': return engine.addAgendaItem(state, userId, action.title, action.details);
    case 'updateAgendaItem': return engine.updateAgendaItem(state, userId, action.itemId, action.patch);
    case 'moveAgendaItem': return engine.moveAgendaItem(state, userId, action.itemId, action.direction);
    case 'removeAgendaItem': return engine.removeAgendaItem(state, userId, action.itemId);
    case 'transferChair': return engine.transferChair(state, userId, action.targetId);
    case 'setMemberRole': return engine.setMemberRole(state, userId, action.targetId, action.role);
    case 'removeMember': return engine.removeMember(state, userId, action.targetId);
    case 'updateMotion': return engine.updateMotion(state, userId, action.motionId, action.patch);
    case 'updateSettings': return engine.updateSettings(state, userId, action.patch);
  }
}
