import type { AgendaItem, AgendaItemStatus, Ballot, Meeting, Motion, MotionStatus, MotionType, VoteMethod, VoteResult, VoteTreshold } from './mettings';
import { AgendaItemStatusMap, BallotMap, MeetingStatusMap, MotionStatusMap, MotionTypeMap, VoteMethodMap, VoteTresholdMap } from './mettings';
import { canAssignFloor, canCastBallot, canEndFloor, canEndMeeting, canGrabFloor, canOpenVote, canProposeMotion, canResumeMeeting, canSecondMotion, canStartMeeting, canSwitchAgenda, canToggleRecordMode, isChair, isMember, laidAsideMotions, motionMeta, topMotion, VOTE_METHOD_LABELS } from './rules';

export type LogKind = 'system' | 'meeting' | 'floor' | 'motion' | 'second' | 'vote' | 'ballot' | 'agenda' | 'ruling';
export type LogTone = 'info' | 'success' | 'warning' | 'error';

export interface LogEntry {
  id: number
  kind: LogKind
  at: number
  actor: string | null
  icon: string
  tone: LogTone
  /** 结构化内容：引擎只记录事实，展示文本由客户端用 formatLog 格式化。 */
  payload: LogPayload
}

/** 结构化日志内容（不含显示名，客户端格式化时自行解析用户名）。 */
export type LogPayload
  = | { type: 'meetingStart' }
    | { type: 'meetingEnd', adjourned: boolean }
    | { type: 'meetingResume' }
    | { type: 'recordMode', enabled: boolean }
    | { type: 'floorGranted' }
    | { type: 'floorEnded' }
    | { type: 'floorOpenSoon' }
    | { type: 'floorAssigned' }
    | { type: 'motionProposed', motionId: number, motionType: MotionType, content: string, viaNoFloor: boolean }
    | { type: 'ruling', motionId: number, motionType: MotionType, upheld: boolean }
    | { type: 'motionSeconded', motionId: number }
    | { type: 'motionPending', motionId: number }
    | { type: 'motionUpdated', motionId: number }
    | { type: 'voteOpened', motionId: number, method: VoteMethod }
    | { type: 'voteDeclared', voteId: number, motionId: number, method: VoteMethod, passed: boolean }
    | { type: 'voteClosed', voteId: number, passed: boolean, yea: number, nay: number, abstain: number }
    | { type: 'mainMotionRejected' }
    | { type: 'motionLaidAside', motionId: number }
    | { type: 'motionDeferred', motionId: number, referred: boolean }
    | { type: 'motionDropped', motionId: number }
    | { type: 'amendmentApplied', motionId: number }
    | { type: 'previousQuestion' }
    | { type: 'motionRestored', motionId: number }
    | { type: 'recess' }
    | { type: 'motionPassed', motionType: MotionType }
    | { type: 'agendaSwitched', title: string }
    | { type: 'agendaAdded', title: string }
    | { type: 'agendaUpdated', title: string }
    | { type: 'agendaMoved', title: string }
    | { type: 'agendaRemoved', title: string }
    | { type: 'chairTransferred' }
    | { type: 'memberRoleChanged', userId: string, role: 'member' | 'observer' }
    | { type: 'memberRemoved', userId: string }
    | { type: 'settingsUpdated' }
    | { type: 'memberJoined' };

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

export function pushLog(state: MeetingEngineState, payload: LogPayload, opts: { kind?: LogKind, actor?: string | null, icon?: string, tone?: LogTone } = {}): void {
  state.logs.push({
    id: ++state.logSeq,
    kind: opts.kind ?? 'system',
    at: Date.now(),
    actor: opts.actor ?? null,
    icon: opts.icon ?? 'i-lucide-info',
    tone: opts.tone ?? 'info',
    payload,
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
  pushLog(state, { type: 'meetingStart' }, { kind: 'meeting', actor: userId, icon: 'i-lucide-play', tone: 'success' });
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
  pushLog(state, { type: 'meetingEnd', adjourned: userId === null }, {
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
  pushLog(state, { type: 'meetingResume' }, { kind: 'meeting', actor: userId, icon: 'i-lucide-play', tone: 'success' });
  return null;
}

export function toggleRecordMode(state: MeetingEngineState, userId: string): string | null {
  const m = state.meeting;
  const check = canToggleRecordMode(m, userId);
  if (!check.ok)
    return check.reason!;
  m.recordMode = !m.recordMode;
  pushLog(state, { type: 'recordMode', enabled: m.recordMode }, {
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
  pushLog(state, { type: 'floorGranted' }, { kind: 'floor', actor: userId, icon: 'i-lucide-mic', tone: 'success' });
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
    pushLog(state, { type: 'floorEnded' }, { kind: 'floor', actor: holder, icon: 'i-lucide-mic-off' });
  m.floorHolder = null;
  m.floor = [];
  m.floorGrabAt = Date.now() + 3000;
  pushLog(state, { type: 'floorOpenSoon' }, { kind: 'floor', icon: 'i-lucide-timer' });
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
  pushLog(state, { type: 'floorAssigned' }, { kind: 'floor', actor: targetId, icon: 'i-lucide-mic', tone: 'success' });
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
    { type: 'motionProposed', motionId: motion.id, motionType: input.type, content: motion.content, viaNoFloor },
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
    { type: 'ruling', motionId: motion.id, motionType: motion.type, upheld: uphold },
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
  pushLog(state, { type: 'motionSeconded', motionId }, { kind: 'second', actor: userId, icon: 'i-lucide-thumbs-up' });
  if (motion.seconders.length >= 1) {
    motion.status = MotionStatusMap.PENDING;
    pushLog(state, { type: 'motionPending', motionId }, { kind: 'motion', icon: 'i-lucide-message-square', tone: 'success' });
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
  pushLog(state, { type: 'motionUpdated', motionId }, { kind: 'motion', actor: userId, icon: 'i-lucide-pencil' });
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
  pushLog(state, { type: 'voteOpened', motionId, method }, { kind: 'vote', actor: userId, icon: 'i-lucide-vote', tone: 'warning' });
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
    { type: 'voteDeclared', voteId: result.id, motionId, method, passed: result.passed },
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
    { type: 'voteClosed', voteId: vote.id, passed, yea: yea.length, nay: nay.length, abstain: abstain.length },
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
  if (!passed) {
    if (motion.type === MotionTypeMap.MAIN)
      pushLog(state, { type: 'mainMotionRejected' }, { kind: 'motion', icon: 'i-lucide-x' });
    return;
  }
  switch (motion.type) {
    case MotionTypeMap.LAY_ON_TABLE:
      if (target) {
        target.status = MotionStatusMap.LAID_ASIDE;
        pushLog(state, { type: 'motionLaidAside', motionId: target.id }, { kind: 'motion', icon: 'i-lucide-pause', tone: 'warning' });
      }
      break;
    case MotionTypeMap.POSTPONE_TO_TIME:
    case MotionTypeMap.REFER_TO_COMMITTEE:
      if (target) {
        target.status = MotionStatusMap.LAID_ASIDE;
        pushLog(state, { type: 'motionDeferred', motionId: target.id, referred: motion.type === MotionTypeMap.REFER_TO_COMMITTEE }, { kind: 'motion', icon: 'i-lucide-pause', tone: 'warning' });
      }
      break;
    case MotionTypeMap.POSTPONE_INDEFINITELY:
      if (target) {
        target.status = MotionStatusMap.DISPOSED;
        pushLog(state, { type: 'motionDropped', motionId: target.id }, { kind: 'motion', icon: 'i-lucide-x', tone: 'error' });
      }
      break;
    case MotionTypeMap.AMEND:
      if (target) {
        target.content = `${target.content}（修正：${motion.content}）`;
        pushLog(state, { type: 'amendmentApplied', motionId: target.id }, { kind: 'motion', icon: 'i-lucide-pencil', tone: 'success' });
      }
      break;
    case MotionTypeMap.PREVIOUS_QUESTION:
      pushLog(state, { type: 'previousQuestion' }, { kind: 'motion', icon: 'i-lucide-mic-off', tone: 'warning' });
      break;
    case MotionTypeMap.TAKE_FROM_TABLE: {
      const laidAside = laidAsideMotions(m);
      const restored = laidAside[laidAside.length - 1];
      if (restored) {
        restored.status = MotionStatusMap.PENDING;
        pushLog(state, { type: 'motionRestored', motionId: restored.id }, { kind: 'motion', icon: 'i-lucide-undo-2', tone: 'success' });
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
      pushLog(state, { type: 'recess' }, { kind: 'meeting', icon: 'i-lucide-coffee', tone: 'warning' });
      break;
    default:
      pushLog(state, { type: 'motionPassed', motionType: motion.type }, { kind: 'motion', icon: 'i-lucide-check', tone: 'success' });
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
  pushLog(state, { type: 'agendaSwitched', title: item.title }, { kind: 'agenda', actor: userId, icon: 'i-lucide-list-video' });
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
  pushLog(state, { type: 'agendaAdded', title: item.title }, { kind: 'agenda', actor: userId, icon: 'i-lucide-list-plus' });
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
  pushLog(state, { type: 'agendaUpdated', title: item.title }, { kind: 'agenda', actor: userId, icon: 'i-lucide-pencil' });
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
  pushLog(state, { type: 'agendaMoved', title: temp.title }, { kind: 'agenda', actor: userId, icon: 'i-lucide-arrow-up-down' });
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
  pushLog(state, { type: 'agendaRemoved', title: item!.title }, { kind: 'agenda', actor: userId, icon: 'i-lucide-list-x', tone: 'warning' });
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
  pushLog(state, { type: 'chairTransferred' }, { kind: 'meeting', actor: targetId, icon: 'i-lucide-crown', tone: 'warning' });
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
  pushLog(state, { type: 'memberRoleChanged', userId: targetId, role }, { kind: 'meeting', actor: userId, icon: 'i-lucide-user-cog' });
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
  pushLog(state, { type: 'memberRemoved', userId: targetId }, { kind: 'meeting', actor: userId, icon: 'i-lucide-user-x', tone: 'warning' });
  return null;
}

export function updateSettings(state: MeetingEngineState, userId: string, patch: { title?: string }): string | null {
  const m = state.meeting;
  if (!m.recordMode && !isChair(m, userId))
    return '仅主持人可修改会议设置';
  if (patch.title?.trim())
    m.profile.title = patch.title.trim();
  pushLog(state, { type: 'settingsUpdated' }, { kind: 'meeting', actor: userId, icon: 'i-lucide-settings' });
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

// ===== 日志展示（客户端格式化） =====

/** 结构化日志的渲染段：纯文本或用户令牌（客户端用 InlineUser 胶囊渲染）。 */
export type LogSegment = string | { userId: string };

function userSeg(id: string | null): LogSegment[] {
  return id ? [{ userId: id }] : [];
}

/** 将结构化日志格式化为渲染段，用户引用保留为令牌由客户端解析显示名。 */
export function formatLogSegments(entry: LogEntry): LogSegment[] {
  const p = entry.payload;
  switch (p.type) {
    case 'meetingStart':
      return [...userSeg(entry.actor), ' 宣布会议开始'];
    case 'meetingEnd':
      return p.adjourned ? ['休会动议通过，会议结束'] : [...userSeg(entry.actor), ' 宣布会议结束'];
    case 'meetingResume':
      return [...userSeg(entry.actor), ' 宣布恢复会议'];
    case 'recordMode':
      return [p.enabled ? '记录模式已开启，操作限制解除' : '记录模式已关闭'];
    case 'floorGranted':
      return [...userSeg(entry.actor), ' 获得发言权'];
    case 'floorEnded':
      return [...userSeg(entry.actor), ' 结束发言'];
    case 'floorOpenSoon':
      return ['发言权将在 3 秒后开放请求'];
    case 'floorAssigned':
      return ['主持人将发言权分配给 ', ...userSeg(entry.actor)];
    case 'motionProposed':
      return [...userSeg(entry.actor), ` 提出动议 #M${p.motionId}【${motionMeta(p.motionType).label}】${p.content}${p.viaNoFloor ? '，获得临时发言权' : ''}`];
    case 'ruling':
      return [`主持人裁决：#M${p.motionId}【${motionMeta(p.motionType).label}】${p.upheld ? '成立' : '不成立'}`];
    case 'motionSeconded':
      return [...userSeg(entry.actor), ` 附议了动议 #M${p.motionId}`];
    case 'motionPending':
      return [`动议 #M${p.motionId} 已获附议，进入辩论阶段`];
    case 'motionUpdated':
      return [`主持人修改了动议 #M${p.motionId}`];
    case 'voteOpened':
      return [`主持人对动议 #M${p.motionId} 发起${VOTE_METHOD_LABELS[p.method]}`];
    case 'voteDeclared':
      return [`#V${p.voteId} ${VOTE_METHOD_LABELS[p.method]}：动议 #M${p.motionId} ${p.passed ? '通过' : '否决'}`];
    case 'voteClosed':
      return [`#V${p.voteId} 投票结果：${p.passed ? '通过' : '否决'}（赞成 ${p.yea} / 反对 ${p.nay} / 弃权 ${p.abstain}）`];
    case 'mainMotionRejected':
      return ['主动议被否决，议题继续讨论'];
    case 'motionLaidAside':
      return [`动议 #M${p.motionId} 被搁置`];
    case 'motionDeferred':
      return [`动议 #M${p.motionId} ${p.referred ? '已委托给委员会' : '已推迟'}，暂时移出审议`];
    case 'motionDropped':
      return [`动议 #M${p.motionId} 被无限期推迟（视同否决）`];
    case 'amendmentApplied':
      return [`修正案通过，动议 #M${p.motionId} 内容已更新`];
    case 'previousQuestion':
      return ['辩论已截止，请主持人对下一项动议发起表决'];
    case 'motionRestored':
      return [`动议 #M${p.motionId} 恢复审议`];
    case 'recess':
      return ['休息动议通过，会议进入休会状态'];
    case 'motionPassed':
      return [`【${motionMeta(p.motionType).label}】动议通过`];
    case 'agendaSwitched':
      return [`会议切换到议题「${p.title}」`];
    case 'agendaAdded':
      return [`主持人新增议题「${p.title}」`];
    case 'agendaUpdated':
      return [`主持人编辑议题「${p.title}」`];
    case 'agendaMoved':
      return [`主持人调整议题「${p.title}」顺序`];
    case 'agendaRemoved':
      return [`主持人移除议题「${p.title}」`];
    case 'chairTransferred':
      return ['主持人身份移交给 ', ...userSeg(entry.actor)];
    case 'memberRoleChanged':
      return [...userSeg(p.userId), ` 的身份变更为${p.role === 'member' ? '成员' : '旁听成员'}`];
    case 'memberRemoved':
      return [...userSeg(p.userId), ' 被移除出会议'];
    case 'settingsUpdated':
      return ['会议设置已更新'];
    case 'memberJoined':
      return [...userSeg(entry.actor), ' 加入会议'];
  }
}

/** 收集日志中引用的用户 id（前端据此批量获取用户信息）。 */
export function logUserRefs(entry: LogEntry): string[] {
  return formatLogSegments(entry)
    .filter((seg): seg is { userId: string } => typeof seg !== 'string')
    .map(seg => seg.userId);
}
