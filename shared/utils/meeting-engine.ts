import type {
  AgendaItem,
  AgendaItemStatus,
  Ballot,
  Meeting,
  Motion,
  MotionStatus,
  MotionType,
  VoteMethod,
  VoteResult,
  VoteTreshold,
} from './mettings';
import {
  AgendaItemStatusMap,
  BallotMap,
  MeetingStatusMap,
  MotionStatusMap,
  MotionTypeMap,
  VoteMethodMap,
  VoteTresholdMap,
} from './mettings';
import {
  canAssignFloor,
  canCastBallot,
  canEndFloor,
  canEndMeeting,
  canGrabFloor,
  canOpenVote,
  canProposeMotion,
  canResumeMeeting,
  canSecondMotion,
  canStartMeeting,
  canSwitchAgenda,
  canToggleRecordMode,
  isChair,
  isMember,
  laidAsideMotions,
  motionMeta,
  topMotion,
  VOTE_METHOD_LABELS,
} from './rules';

export type LogKind = 'system' | 'meeting' | 'floor' | 'motion' | 'second' | 'vote' | 'ballot' | 'agenda' | 'ruling';
export type LogTone = 'info' | 'success' | 'warning' | 'error';

export interface LogEntry {
  id: number
  kind: LogKind
  at: number
  actor: string | null
  icon: string
  text: string
  tone: LogTone
}

/**
 * 会议引擎状态：客户端 demo 驱动与服务端会议房间共用同一状态形状，
 * 所有动作函数以 (state, userId, ...args) 形式调用，返回错误文案或 null（成功）。
 */
export interface MeetingEngineState {
  meeting: Meeting
  logs: LogEntry[]
  /** 等待主持人裁决的动议 id。 */
  pendingRulingMotionId: number | null
  /** 日志自增序号。 */
  logSeq: number
  /** userId -> 显示名，用于日志文案。 */
  names: Record<string, string>
}

/** 创建一场空会议（实时会议以此初始化，demo 使用自己的预置数据）。 */
export function createEmptyMeeting(id: number, title: string, chair: string): Meeting {
  return {
    schema: 1,
    id,
    profile: { title, chair },
    status: MeetingStatusMap.NOT_STARTED,
    recordMode: false,
    floor: [],
    floorHolder: null,
    floorGrabAt: null,
    members: [],
    observers: [],
    agenda: [],
    currentAgendaId: null,
    motions: [],
    votes: [],
    activeVote: null,
    startedAt: null,
    endedAt: null,
  };
}

export function userNameOf(state: MeetingEngineState, id: string | null | undefined): string {
  if (!id)
    return '系统';
  return state.names[id] ?? id;
}

export function pushLog(state: MeetingEngineState, text: string, opts: { kind?: LogKind, actor?: string | null, icon?: string, tone?: LogTone } = {}): void {
  state.logs.push({
    id: ++state.logSeq,
    kind: opts.kind ?? 'system',
    at: Date.now(),
    actor: opts.actor ?? null,
    icon: opts.icon ?? 'i-lucide-info',
    text,
    tone: opts.tone ?? 'info',
  });
  if (state.logs.length > 200)
    state.logs.splice(0, state.logs.length - 200);
}

function motionById(state: MeetingEngineState, id: number): Motion | undefined {
  return state.meeting.motions.find(m => m.id === id);
}

function nextMotionId(state: MeetingEngineState): number {
  return state.meeting.motions.reduce((max, m) => Math.max(max, m.id), 0) + 1;
}

function nextVoteId(state: MeetingEngineState): number {
  const active = state.meeting.activeVote?.id ?? 0;
  return Math.max(state.meeting.votes.reduce((max, v) => Math.max(max, v.id), 0), active) + 1;
}

function nextAgendaId(state: MeetingEngineState): number {
  return state.meeting.agenda.reduce((max, a) => Math.max(max, a.id), 0) + 1;
}

// ===== 会议控制 =====

export function startMeeting(state: MeetingEngineState, userId: string): string | null {
  const m = state.meeting;
  const check = canStartMeeting(m, userId);
  if (!check.ok)
    return check.reason!;
  m.status = MeetingStatusMap.IN_PROGRESS;
  m.startedAt = Date.now();
  pushLog(state, `@${userNameOf(state, userId)} 宣布会议开始`, { kind: 'meeting', actor: userId, icon: 'i-lucide-play', tone: 'success' });
  return null;
}

export function endMeeting(state: MeetingEngineState, userId: string): string | null {
  const m = state.meeting;
  const check = canEndMeeting(m, userId);
  if (!check.ok)
    return check.reason!;
  doEndMeeting(state, userId);
  return null;
}

function doEndMeeting(state: MeetingEngineState, userId: string | null): void {
  const m = state.meeting;
  m.status = MeetingStatusMap.ENDED;
  m.activeVote = null;
  m.floor = [];
  m.floorHolder = null;
  m.endedAt = Date.now();
  state.pendingRulingMotionId = null;
  for (const motion of m.motions) {
    if (motion.status !== MotionStatusMap.DISPOSED && motion.status !== MotionStatusMap.LAID_ASIDE) {
      motion.status = MotionStatusMap.DISPOSED;
    }
  }
  pushLog(state, userId ? `@${userNameOf(state, userId)} 宣布会议结束` : '休会动议通过，会议结束', {
    kind: 'meeting',
    actor: userId,
    icon: 'i-lucide-square',
    tone: 'warning',
  });
}

export function resumeMeeting(state: MeetingEngineState, userId: string): string | null {
  const m = state.meeting;
  const check = canResumeMeeting(m, userId);
  if (!check.ok)
    return check.reason!;
  m.status = MeetingStatusMap.IN_PROGRESS;
  pushLog(state, `@${userNameOf(state, userId)} 宣布恢复会议`, { kind: 'meeting', actor: userId, icon: 'i-lucide-play', tone: 'success' });
  return null;
}

export function toggleRecordMode(state: MeetingEngineState, userId: string): string | null {
  const m = state.meeting;
  const check = canToggleRecordMode(m, userId);
  if (!check.ok)
    return check.reason!;
  m.recordMode = !m.recordMode;
  pushLog(state, m.recordMode ? '记录模式已开启，操作限制解除' : '记录模式已关闭', {
    kind: 'meeting',
    actor: userId,
    icon: 'i-lucide-pencil-line',
    tone: m.recordMode ? 'warning' : 'info',
  });
  return null;
}

// ===== 发言权 =====

export function grabFloor(state: MeetingEngineState, userId: string): string | null {
  const m = state.meeting;
  const check = canGrabFloor(m, userId);
  if (!check.ok)
    return check.reason!;
  m.floorHolder = userId;
  m.floorGrabAt = null;
  m.floor = [];
  pushLog(state, `@${userNameOf(state, userId)} 获得发言权`, { kind: 'floor', actor: userId, icon: 'i-lucide-mic', tone: 'success' });
  return null;
}

export function endFloor(state: MeetingEngineState, userId: string): string | null {
  const m = state.meeting;
  const check = canEndFloor(m, userId);
  if (!check.ok)
    return check.reason!;
  releaseFloor(state);
  return null;
}

/** 释放发言权，开启 3 秒倒计时后允许请求。 */
function releaseFloor(state: MeetingEngineState): void {
  const m = state.meeting;
  const holder = m.floorHolder;
  if (holder)
    pushLog(state, `@${userNameOf(state, holder)} 结束发言`, { kind: 'floor', actor: holder, icon: 'i-lucide-mic-off' });
  m.floorHolder = null;
  m.floor = [];
  m.floorGrabAt = Date.now() + 3000;
  pushLog(state, '发言权将在 3 秒后开放请求', { kind: 'floor', icon: 'i-lucide-timer' });
}

export function assignFloor(state: MeetingEngineState, userId: string, targetId: string): string | null {
  const m = state.meeting;
  const check = canAssignFloor(m, userId);
  if (!check.ok)
    return check.reason!;
  if (!isMember(m, targetId))
    return '只能分配给会议成员';
  m.floor = [];
  m.floorGrabAt = null;
  m.floorHolder = targetId;
  pushLog(state, `主持人将发言权分配给 @${userNameOf(state, targetId)}`, { kind: 'floor', actor: targetId, icon: 'i-lucide-mic', tone: 'success' });
  return null;
}

export function revokeFloor(state: MeetingEngineState, userId: string): string | null {
  const m = state.meeting;
  const check = canAssignFloor(m, userId);
  if (!check.ok)
    return check.reason!;
  releaseFloor(state);
  return null;
}

// ===== 动议 =====

export interface MotionInput {
  type: MotionType
  content: string
  details: string
}

export function proposeMotion(state: MeetingEngineState, userId: string, input: MotionInput): string | null {
  const m = state.meeting;
  const check = canProposeMotion(m, userId, input.type);
  if (!check.ok)
    return check.reason!;
  const meta = motionMeta(input.type);
  const motion: Motion = {
    id: nextMotionId(state),
    type: input.type,
    content: input.content.trim(),
    details: input.details.trim(),
    status: meta.needsSecond ? MotionStatusMap.DRAFT : MotionStatusMap.PENDING,
    proposer: userId,
    seconders: [],
    createdAt: Date.now(),
    voteId: null,
  };
  m.motions.push(motion);
  const viaNoFloor = !meta.needsFloor && m.floorHolder !== userId;
  pushLog(
    state,
    `@${userNameOf(state, userId)} 提出动议 #M${motion.id}【${meta.label}】${motion.content}${viaNoFloor ? '，获得临时发言权' : ''}`,
    { kind: 'motion', actor: userId, icon: 'i-lucide-file-plus-2' },
  );
  if (meta.chairRules) {
    state.pendingRulingMotionId = motion.id;
  }
  return null;
}

export function resolveRuling(state: MeetingEngineState, userId: string, uphold: boolean): string | null {
  const m = state.meeting;
  const motionId = state.pendingRulingMotionId;
  if (motionId == null)
    return '当前没有待裁决的事项';
  if (!m.recordMode && !isChair(m, userId))
    return '仅主持人可裁决';
  const motion = motionById(state, motionId);
  state.pendingRulingMotionId = null;
  if (!motion)
    return '动议不存在';
  motion.status = MotionStatusMap.DISPOSED;
  pushLog(
    state,
    `主持人裁决：#M${motion.id}【${motionMeta(motion.type).label}】${uphold ? '成立' : '不成立'}`,
    { kind: 'ruling', actor: userId, icon: 'i-lucide-gavel', tone: uphold ? 'warning' : 'info' },
  );
  return null;
}

export function secondMotion(state: MeetingEngineState, userId: string, motionId: number): string | null {
  const m = state.meeting;
  const motion = motionById(state, motionId);
  if (!motion)
    return '动议不存在';
  const check = canSecondMotion(m, userId, motion);
  if (!check.ok)
    return check.reason!;
  motion.seconders.push(userId);
  pushLog(state, `@${userNameOf(state, userId)} 附议了动议 #M${motionId}`, { kind: 'second', actor: userId, icon: 'i-lucide-thumbs-up' });
  if (motion.seconders.length >= 1) {
    motion.status = MotionStatusMap.PENDING;
    pushLog(state, `动议 #M${motionId} 已获附议，进入辩论阶段`, { kind: 'motion', icon: 'i-lucide-message-square', tone: 'success' });
  }
  return null;
}

export interface MotionPatch {
  type?: MotionType
  content?: string
  details?: string
  status?: MotionStatus
}

/** 主持人可直接修改任意动议的信息与状态（不走表决流程）。 */
export function updateMotion(state: MeetingEngineState, userId: string, motionId: number, patch: MotionPatch): string | null {
  const m = state.meeting;
  if (!m.recordMode && !isChair(m, userId))
    return '仅主持人可修改动议';
  const motion = motionById(state, motionId);
  if (!motion)
    return '动议不存在';
  const changingStatus = patch.status !== undefined && patch.status !== motion.status;
  if (changingStatus) {
    if (m.activeVote?.motionId === motionId)
      return '动议正在投票，请先结束投票';
    if (patch.status === MotionStatusMap.VOTING)
      return '请通过发起表决进入投票状态';
  }
  if (patch.type !== undefined)
    motion.type = patch.type;
  if (patch.content?.trim())
    motion.content = patch.content.trim();
  if (patch.details !== undefined)
    motion.details = patch.details.trim();
  if (changingStatus) {
    motion.status = patch.status!;
    if (state.pendingRulingMotionId === motionId)
      state.pendingRulingMotionId = null;
  }
  pushLog(state, `主持人修改了动议 #M${motionId}`, { kind: 'motion', actor: userId, icon: 'i-lucide-pencil' });
  return null;
}

// ===== 表决 =====

/** 开启需逐人投票的表决（记名/不记名）；一致同意与口头表决请用 declareVote。 */
export function openVote(state: MeetingEngineState, userId: string, motionId: number, method: VoteMethod = VoteMethodMap.SIGNED_BALLOT): string | null {
  const m = state.meeting;
  const motion = motionById(state, motionId);
  if (!motion)
    return '动议不存在';
  const check = canOpenVote(m, userId, motion);
  if (!check.ok)
    return check.reason!;
  if (method !== VoteMethodMap.SIGNED_BALLOT && method !== VoteMethodMap.SECRET_BALLOT)
    return '该表决方式无需投票，请直接宣布结果';
  const now = Date.now();
  motion.status = MotionStatusMap.VOTING;
  m.status = MeetingStatusMap.VOTING;
  m.activeVote = {
    id: nextVoteId(state),
    motionId,
    threshold: motionMeta(motion.type).threshold,
    method,
    ballots: {},
    startedAt: now,
  };
  pushLog(state, `主持人对动议 #M${motionId} 发起${VOTE_METHOD_LABELS[method]}`, { kind: 'vote', actor: userId, icon: 'i-lucide-vote', tone: 'warning' });
  return null;
}

/** 主持人直接宣布表决结果（一致同意/口头表决，不需逐人投票）。 */
export function declareVote(state: MeetingEngineState, userId: string, motionId: number, method: VoteMethod, passed: boolean): string | null {
  const m = state.meeting;
  const motion = motionById(state, motionId);
  if (!motion)
    return '动议不存在';
  const check = canOpenVote(m, userId, motion);
  if (!check.ok)
    return check.reason!;
  if (method !== VoteMethodMap.UNANIMOUS && method !== VoteMethodMap.VOICE)
    return '该表决方式需要逐人投票，请开启投票';
  const threshold = motionMeta(motion.type).threshold;
  const base = { id: nextVoteId(state), threshold, voter: m.members.length };
  const result: VoteResult = method === VoteMethodMap.UNANIMOUS
    ? { ...base, method, passed: true }
    : { ...base, method, passed };
  m.votes.push(result);
  motion.status = MotionStatusMap.DISPOSED;
  motion.voteId = result.id;
  applyMotionEffects(state, motion, result.passed);
  pushLog(
    state,
    `#V${result.id} ${VOTE_METHOD_LABELS[method]}：动议 #M${motionId} ${result.passed ? '通过' : '否决'}`,
    { kind: 'vote', actor: userId, icon: result.passed ? 'i-lucide-check-circle-2' : 'i-lucide-x-circle', tone: result.passed ? 'success' : 'error' },
  );
  return null;
}

export function castBallot(state: MeetingEngineState, userId: string, ballot: Ballot): string | null {
  const m = state.meeting;
  const check = canCastBallot(m, userId);
  if (!check.ok)
    return check.reason!;
  m.activeVote!.ballots[userId] = ballot;
  if (Object.keys(m.activeVote!.ballots).length >= m.members.length) {
    closeVote(state);
  }
  return null;
}

export function closeVote(state: MeetingEngineState, userId?: string): string | null {
  const m = state.meeting;
  const vote = m.activeVote;
  if (!vote)
    return '当前没有进行中的投票';
  if (userId && !m.recordMode && !isChair(m, userId))
    return '仅主持人可提前结束投票';
  const motion = motionById(state, vote.motionId);
  const yea: string[] = [];
  const nay: string[] = [];
  const abstain: string[] = [];
  for (const [uid, ballot] of Object.entries(vote.ballots)) {
    if (ballot === BallotMap.YEA)
      yea.push(uid);
    else if (ballot === BallotMap.NAY)
      nay.push(uid);
    else abstain.push(uid);
  }
  const passed = isPassed(vote.threshold, yea.length, nay.length);
  const base = { id: vote.id, threshold: vote.threshold, voter: m.members.length };
  // 不记名投票仅保留票数，记名投票保留投票人名单
  const result: VoteResult = vote.method === VoteMethodMap.SECRET_BALLOT
    ? { ...base, method: VoteMethodMap.SECRET_BALLOT, passed, yea: yea.length, nay: nay.length, abstain: abstain.length, invalid: 0 }
    : { ...base, method: VoteMethodMap.SIGNED_BALLOT, passed, yea, nay, abstain, invalid: [] };
  m.votes.push(result);
  m.activeVote = null;
  m.status = MeetingStatusMap.IN_PROGRESS;
  if (motion) {
    motion.status = MotionStatusMap.DISPOSED;
    motion.voteId = result.id;
    applyMotionEffects(state, motion, passed);
  }
  pushLog(
    state,
    `#V${result.id} 投票结果：${passed ? '通过' : '否决'}（赞成 ${yea.length} / 反对 ${nay.length} / 弃权 ${abstain.length}）`,
    { kind: 'vote', icon: passed ? 'i-lucide-check-circle-2' : 'i-lucide-x-circle', tone: passed ? 'success' : 'error' },
  );
  return null;
}

function isPassed(threshold: VoteTreshold, yea: number, nay: number): boolean {
  switch (threshold) {
    case VoteTresholdMap.TWO_THIRDS:
      return yea * 3 >= (yea + nay) * 2 && yea > 0;
    case VoteTresholdMap.UNANIMOUS:
      return nay === 0 && yea > 0;
    default:
      return yea > nay;
  }
}

/** 动议表决通过/否决后的后续效果。 */
function applyMotionEffects(state: MeetingEngineState, motion: Motion, passed: boolean): void {
  const m = state.meeting;
  const target = topMotion(m); // 栈中的下一项动议（本动议已出栈）
  const label = motionMeta(motion.type).label;
  if (!passed) {
    if (motion.type === MotionTypeMap.MAIN)
      pushLog(state, `主动议被否决，议题继续讨论`, { kind: 'motion', icon: 'i-lucide-x' });
    return;
  }
  switch (motion.type) {
    case MotionTypeMap.LAY_ON_TABLE:
      if (target) {
        target.status = MotionStatusMap.LAID_ASIDE;
        pushLog(state, `动议 #M${target.id} 被搁置`, { kind: 'motion', icon: 'i-lucide-pause', tone: 'warning' });
      }
      break;
    case MotionTypeMap.POSTPONE_TO_TIME:
    case MotionTypeMap.REFER_TO_COMMITTEE:
      if (target) {
        target.status = MotionStatusMap.LAID_ASIDE;
        pushLog(state, `动议 #M${target.id} ${motion.type === MotionTypeMap.REFER_TO_COMMITTEE ? '已委托给委员会' : '已推迟'}，暂时移出审议`, { kind: 'motion', icon: 'i-lucide-pause', tone: 'warning' });
      }
      break;
    case MotionTypeMap.POSTPONE_INDEFINITELY:
      if (target) {
        target.status = MotionStatusMap.DISPOSED;
        pushLog(state, `动议 #M${target.id} 被无限期推迟（视同否决）`, { kind: 'motion', icon: 'i-lucide-x', tone: 'error' });
      }
      break;
    case MotionTypeMap.AMEND:
      if (target) {
        target.content = `${target.content}（修正：${motion.content}）`;
        pushLog(state, `修正案通过，动议 #M${target.id} 内容已更新`, { kind: 'motion', icon: 'i-lucide-pencil', tone: 'success' });
      }
      break;
    case MotionTypeMap.PREVIOUS_QUESTION:
      pushLog(state, '辩论已截止，请主持人对下一项动议发起表决', { kind: 'motion', icon: 'i-lucide-mic-off', tone: 'warning' });
      break;
    case MotionTypeMap.TAKE_FROM_TABLE: {
      const laidAside = laidAsideMotions(m);
      const restored = laidAside[laidAside.length - 1];
      if (restored) {
        restored.status = MotionStatusMap.PENDING;
        pushLog(state, `动议 #M${restored.id} 恢复审议`, { kind: 'motion', icon: 'i-lucide-undo-2', tone: 'success' });
      }
      break;
    }
    case MotionTypeMap.ADJOURN:
      doEndMeeting(state, null);
      break;
    case MotionTypeMap.RECESS:
      m.status = MeetingStatusMap.RECESSED;
      m.floor = [];
      m.floorHolder = null;
      pushLog(state, '休息动议通过，会议进入休会状态', { kind: 'meeting', icon: 'i-lucide-coffee', tone: 'warning' });
      break;
    default:
      pushLog(state, `【${label}】动议通过`, { kind: 'motion', icon: 'i-lucide-check', tone: 'success' });
  }
}

// ===== 议程 =====

export function switchAgenda(state: MeetingEngineState, userId: string, itemId: number): string | null {
  const m = state.meeting;
  const check = canSwitchAgenda(m, userId);
  if (!check.ok)
    return check.reason!;
  const item = m.agenda.find(a => a.id === itemId);
  if (!item)
    return '议题不存在';
  m.currentAgendaId = itemId;
  pushLog(state, `会议切换到议题「${item.title}」`, { kind: 'agenda', actor: userId, icon: 'i-lucide-list-video' });
  return null;
}

export interface AgendaPatch {
  title?: string
  details?: string
  scheduledAt?: number | null
  isSpecial?: boolean
  status?: AgendaItemStatus
}

export function addAgendaItem(state: MeetingEngineState, userId: string, title: string, details: string): string | null {
  const m = state.meeting;
  if (!m.recordMode && !isChair(m, userId))
    return '仅主持人可管理议程';
  const item: AgendaItem = {
    id: nextAgendaId(state),
    title: title.trim(),
    details: details.trim(),
    status: AgendaItemStatusMap.PENDING,
    scheduledAt: null,
    isSpecial: false,
  };
  m.agenda.push(item);
  pushLog(state, `主持人新增议题「${item.title}」`, { kind: 'agenda', actor: userId, icon: 'i-lucide-list-plus' });
  return null;
}

export function updateAgendaItem(state: MeetingEngineState, userId: string, itemId: number, patch: AgendaPatch): string | null {
  const m = state.meeting;
  if (!m.recordMode && !isChair(m, userId))
    return '仅主持人可管理议程';
  const item = m.agenda.find(a => a.id === itemId);
  if (!item)
    return '议题不存在';
  if (patch.title?.trim())
    item.title = patch.title.trim();
  if (patch.details !== undefined)
    item.details = patch.details.trim();
  if (patch.scheduledAt !== undefined)
    item.scheduledAt = patch.scheduledAt;
  if (patch.isSpecial !== undefined)
    item.isSpecial = patch.isSpecial;
  if (patch.status !== undefined)
    item.status = patch.status;
  pushLog(state, `主持人编辑议题「${item.title}」`, { kind: 'agenda', actor: userId, icon: 'i-lucide-pencil' });
  return null;
}

export function moveAgendaItem(state: MeetingEngineState, userId: string, itemId: number, direction: 'up' | 'down'): string | null {
  const m = state.meeting;
  if (!m.recordMode && !isChair(m, userId))
    return '仅主持人可管理议程';
  const index = m.agenda.findIndex(a => a.id === itemId);
  if (index < 0)
    return '议题不存在';
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= m.agenda.length)
    return direction === 'up' ? '已在顶部' : '已在底部';
  const temp = m.agenda[index]!;
  m.agenda[index] = m.agenda[target]!;
  m.agenda[target] = temp;
  pushLog(state, `主持人调整议题「${temp.title}」顺序`, { kind: 'agenda', actor: userId, icon: 'i-lucide-arrow-up-down' });
  return null;
}

export function removeAgendaItem(state: MeetingEngineState, userId: string, itemId: number): string | null {
  const m = state.meeting;
  if (!m.recordMode && !isChair(m, userId))
    return '仅主持人可管理议程';
  const index = m.agenda.findIndex(a => a.id === itemId);
  if (index < 0)
    return '议题不存在';
  const [item] = m.agenda.splice(index, 1);
  if (m.currentAgendaId === itemId) {
    m.currentAgendaId = m.agenda[0]?.id ?? null;
  }
  pushLog(state, `主持人移除议题「${item!.title}」`, { kind: 'agenda', actor: userId, icon: 'i-lucide-list-x', tone: 'warning' });
  return null;
}

// ===== 与会者 =====

export function transferChair(state: MeetingEngineState, userId: string, targetId: string): string | null {
  const m = state.meeting;
  if (!m.recordMode && !isChair(m, userId))
    return '仅主持人可移交主持人身份';
  if (!isMember(m, targetId))
    return '只能移交给会议成员';
  m.profile.chair = targetId;
  pushLog(state, `主持人身份移交给 @${userNameOf(state, targetId)}`, { kind: 'meeting', actor: userId, icon: 'i-lucide-crown', tone: 'warning' });
  return null;
}

/** 在成员与旁听成员之间调整身份；设为主持人请用 transferChair。 */
export function setMemberRole(state: MeetingEngineState, userId: string, targetId: string, role: 'member' | 'observer'): string | null {
  const m = state.meeting;
  if (!m.recordMode && !isChair(m, userId))
    return '仅主持人可调整成员身份';
  if (targetId === m.profile.chair)
    return '请先移交主持人身份';
  if (!m.members.includes(targetId) && !m.observers.includes(targetId))
    return '该用户不在会议中';
  if (role === 'member') {
    if (m.members.includes(targetId))
      return '该用户已是成员';
    m.observers = m.observers.filter(id => id !== targetId);
    m.members.push(targetId);
  } else {
    if (m.observers.includes(targetId))
      return '该用户已是旁听成员';
    m.members = m.members.filter(id => id !== targetId);
    m.observers.push(targetId);
    m.floor = m.floor.filter(id => id !== targetId);
    if (m.floorHolder === targetId)
      releaseFloor(state);
  }
  pushLog(state, `@${userNameOf(state, targetId)} 的身份变更为${role === 'member' ? '成员' : '旁听成员'}`, { kind: 'meeting', actor: userId, icon: 'i-lucide-user-cog' });
  return null;
}

/** 从会议中移除指定用户（非主持人）。主持人需先移交身份再被移除。 */
export function removeMember(state: MeetingEngineState, userId: string, targetId: string): string | null {
  const m = state.meeting;
  if (!m.recordMode && !isChair(m, userId))
    return '仅主持人可移除与会者';
  if (targetId === m.profile.chair)
    return '请先移交主持人身份';
  const removedFromMembers = m.members.includes(targetId);
  const removedFromObservers = m.observers.includes(targetId);
  if (!removedFromMembers && !removedFromObservers)
    return '该用户不在会议中';
  m.members = m.members.filter(id => id !== targetId);
  m.observers = m.observers.filter(id => id !== targetId);
  m.floor = m.floor.filter(id => id !== targetId);
  if (m.floorHolder === targetId)
    releaseFloor(state);
  pushLog(state, `
@${userNameOf(state, targetId)} 被移除出会议`, { kind: 'meeting', actor: userId, icon: 'i-lucide-user-x', tone: 'warning' });
  return null;
}

export function updateSettings(state: MeetingEngineState, userId: string, patch: { title?: string }): string | null {
  const m = state.meeting;
  if (!m.recordMode && !isChair(m, userId))
    return '仅主持人可修改会议设置';
  if (patch.title?.trim())
    m.profile.title = patch.title.trim();
  pushLog(state, '会议设置已更新', { kind: 'meeting', actor: userId, icon: 'i-lucide-settings' });
  return null;
}

// ===== 统计（与会者详情弹窗） =====

export interface MemberStats {
  floorCount: number
  motionCount: number
  secondCount: number
  voteCount: number
}

export function memberStats(state: MeetingEngineState, userId: string): MemberStats {
  const m = state.meeting;
  return {
    floorCount: state.logs.filter(l => l.kind === 'floor' && l.actor === userId && l.icon === 'i-lucide-mic').length,
    motionCount: m.motions.filter(motion => motion.proposer === userId).length,
    secondCount: state.logs.filter(l => l.kind === 'second' && l.actor === userId).length,
    voteCount: m.votes.filter(v => v.method === VoteMethodMap.SIGNED_BALLOT && [...v.yea, ...v.nay, ...v.abstain].includes(userId)).length,
  };
}
