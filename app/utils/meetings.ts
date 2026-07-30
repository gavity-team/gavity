import type {
  AgendaPatch,
  LogEntry,
  MemberStats,
  MotionInput,
  MotionPatch,
} from '#shared/utils/meeting-engine';
import type {
  Ballot,
  Meeting,
  VoteMethod,
  VoteResult,
} from '#shared/utils/mettings';
import * as engine from '#shared/utils/meeting-engine';
import {
  AgendaItemStatusMap,
  MeetingStatusMap,
} from '#shared/utils/mettings';

export type { AgendaPatch, LogEntry, LogKind, LogTone, MemberStats, MotionInput, MotionPatch } from '#shared/utils/meeting-engine';

export interface DemoUser {
  id: string
  name: string
}

/** 原型演示用的与会者名册。 */
export const DEMO_USERS: DemoUser[] = [
  { id: 'u1', name: '张三' },
  { id: 'u2', name: '李四' },
  { id: 'u3', name: '王五' },
  { id: 'u4', name: '赵六' },
  { id: 'u5', name: '孙七' },
  { id: 'u6', name: '周八' },
];

function demoNames(): Record<string, string> {
  return Object.fromEntries(DEMO_USERS.map(u => [u.id, u.name]));
}

function createDemoMeeting(): Meeting {
  return {
    schema: 1,
    id: 1,
    profile: { title: '2026 年度会员大会 · 第一次会议', chair: 'u1' },
    status: MeetingStatusMap.NOT_STARTED,
    recordMode: false,
    floor: [],
    floorHolder: null,
    floorGrabAt: null,
    members: ['u1', 'u2', 'u3', 'u4', 'u5'],
    observers: ['u6'],
    agenda: [
      { id: 1, title: '审议 2025 年度财务报告', details: '由财务委员会汇报年度收支情况，审议后表决是否通过。', status: AgendaItemStatusMap.PENDING, scheduledAt: null, isSpecial: false },
      { id: 2, title: '新会员入会审批', details: '审议本季度三位新会员的入会申请。', status: AgendaItemStatusMap.PENDING, scheduledAt: null, isSpecial: false },
      { id: 3, title: '年度大会筹备方案', details: '讨论年度大会的举办时间、地点与预算安排。', status: AgendaItemStatusMap.PENDING, scheduledAt: null, isSpecial: true },
      { id: 4, title: '章程修订草案（第二条）', details: '就章程第二条关于会员表决权的修订草案进行审议。', status: AgendaItemStatusMap.PENDING, scheduledAt: null, isSpecial: false },
    ],
    currentAgendaId: 1,
    motions: [],
    votes: [],
    activeVote: null,
    startedAt: null,
    endedAt: null,
  };
}

export const meetingState = reactive({
  meeting: createDemoMeeting(),
  /** 当前操作身份（demo 可切换视角；live 为登录用户 id）。 */
  currentUserId: 'u1',
  logs: [] as LogEntry[],
  /** 等待主持人裁决的动议 id。 */
  pendingRulingMotionId: null as number | null,
  logSeq: 0,
  /** userId -> 显示名。 */
  names: demoNames(),
  /** 在线成员 id（live 模式由服务端广播）。 */
  onlineIds: [] as string[],
  /** demo = 本地单人演示；live = 多人实时会议。 */
  mode: 'demo' as 'demo' | 'live',
  /** live 模式下的 WebSocket 连接状态。 */
  connected: false,
});

export function userName(id: string | null | undefined): string {
  if (!id)
    return '系统';
  return meetingState.names[id] ?? id;
}

export function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString('zh-CN', { hour12: false });
}

// ===== 动作驱动 =====

/**
 * 会议动作驱动：demo 页使用 localDriver（本地执行共享引擎），
 * 多人会议页安装 remote 实现（经 WebSocket 交由服务端权威执行）。
 */
export interface MeetingDriver {
  startMeeting: (userId: string) => string | null
  endMeeting: (userId: string) => string | null
  resumeMeeting: (userId: string) => string | null
  toggleRecordMode: (userId: string) => string | null
  grabFloor: (userId: string) => string | null
  endFloor: (userId: string) => string | null
  assignFloor: (userId: string, targetId: string) => string | null
  revokeFloor: (userId: string) => string | null
  proposeMotion: (userId: string, input: MotionInput) => string | null
  resolveRuling: (userId: string, uphold: boolean) => string | null
  secondMotion: (userId: string, motionId: number) => string | null
  openVote: (userId: string, motionId: number, method: VoteMethod) => string | null
  declareVote: (userId: string, motionId: number, method: VoteMethod, passed: boolean) => string | null
  castBallot: (userId: string, ballot: Ballot) => string | null
  closeVote: (userId?: string) => string | null
  switchAgenda: (userId: string, itemId: number) => string | null
  addAgendaItem: (userId: string, title: string, details: string) => string | null
  updateAgendaItem: (userId: string, itemId: number, patch: AgendaPatch) => string | null
  moveAgendaItem: (userId: string, itemId: number, direction: 'up' | 'down') => string | null
  removeAgendaItem: (userId: string, itemId: number) => string | null
  transferChair: (userId: string, targetId: string) => string | null
  setMemberRole: (userId: string, targetId: string, role: 'member' | 'observer') => string | null
  updateMotion: (userId: string, motionId: number, patch: MotionPatch) => string | null
  updateSettings: (userId: string, patch: { title?: string }) => string | null
  resetMeeting: () => string | null
}

function resetDemoState(): void {
  meetingState.meeting = createDemoMeeting();
  meetingState.currentUserId = 'u1';
  meetingState.logs = [];
  meetingState.pendingRulingMotionId = null;
  meetingState.logSeq = 0;
  meetingState.names = demoNames();
  meetingState.onlineIds = [];
  meetingState.mode = 'demo';
  meetingState.connected = false;
}

export const localDriver: MeetingDriver = {
  startMeeting: userId => engine.startMeeting(meetingState, userId),
  endMeeting: userId => engine.endMeeting(meetingState, userId),
  resumeMeeting: userId => engine.resumeMeeting(meetingState, userId),
  toggleRecordMode: userId => engine.toggleRecordMode(meetingState, userId),
  grabFloor: userId => engine.grabFloor(meetingState, userId),
  endFloor: userId => engine.endFloor(meetingState, userId),
  assignFloor: (userId, targetId) => engine.assignFloor(meetingState, userId, targetId),
  revokeFloor: userId => engine.revokeFloor(meetingState, userId),
  proposeMotion: (userId, input) => engine.proposeMotion(meetingState, userId, input),
  resolveRuling: (userId, uphold) => engine.resolveRuling(meetingState, userId, uphold),
  secondMotion: (userId, motionId) => engine.secondMotion(meetingState, userId, motionId),
  openVote: (userId, motionId, method) => engine.openVote(meetingState, userId, motionId, method),
  declareVote: (userId, motionId, method, passed) => engine.declareVote(meetingState, userId, motionId, method, passed),
  castBallot: (userId, ballot) => engine.castBallot(meetingState, userId, ballot),
  closeVote: userId => engine.closeVote(meetingState, userId),
  switchAgenda: (userId, itemId) => engine.switchAgenda(meetingState, userId, itemId),
  addAgendaItem: (userId, title, details) => engine.addAgendaItem(meetingState, userId, title, details),
  updateAgendaItem: (userId, itemId, patch) => engine.updateAgendaItem(meetingState, userId, itemId, patch),
  moveAgendaItem: (userId, itemId, direction) => engine.moveAgendaItem(meetingState, userId, itemId, direction),
  removeAgendaItem: (userId, itemId) => engine.removeAgendaItem(meetingState, userId, itemId),
  transferChair: (userId, targetId) => engine.transferChair(meetingState, userId, targetId),
  setMemberRole: (userId, targetId, role) => engine.setMemberRole(meetingState, userId, targetId, role),
  updateMotion: (userId, motionId, patch) => engine.updateMotion(meetingState, userId, motionId, patch),
  updateSettings: (userId, patch) => engine.updateSettings(meetingState, userId, patch),
  resetMeeting: () => {
    resetDemoState();
    return null;
  },
};

let driver: MeetingDriver = localDriver;

export function setDriver(next: MeetingDriver): void {
  driver = next;
}

export function resetDriver(): void {
  driver = localDriver;
}

// ===== 动作入口（组件调用，签名与历史一致） =====

export function startMeeting(userId = meetingState.currentUserId): string | null {
  return driver.startMeeting(userId);
}

export function endMeeting(userId = meetingState.currentUserId): string | null {
  return driver.endMeeting(userId);
}

export function resumeMeeting(userId = meetingState.currentUserId): string | null {
  return driver.resumeMeeting(userId);
}

export function toggleRecordMode(userId = meetingState.currentUserId): string | null {
  return driver.toggleRecordMode(userId);
}

export function grabFloor(userId = meetingState.currentUserId): string | null {
  return driver.grabFloor(userId);
}

export function endFloor(userId = meetingState.currentUserId): string | null {
  return driver.endFloor(userId);
}

export function assignFloor(targetId: string, userId = meetingState.currentUserId): string | null {
  return driver.assignFloor(userId, targetId);
}

export function revokeFloor(userId = meetingState.currentUserId): string | null {
  return driver.revokeFloor(userId);
}

export function proposeMotion(input: MotionInput, userId = meetingState.currentUserId): string | null {
  return driver.proposeMotion(userId, input);
}

export function resolveRuling(uphold: boolean, userId = meetingState.currentUserId): string | null {
  return driver.resolveRuling(userId, uphold);
}

export function secondMotion(motionId: number, userId = meetingState.currentUserId): string | null {
  return driver.secondMotion(userId, motionId);
}

export function openVote(motionId: number, method: VoteMethod, userId = meetingState.currentUserId): string | null {
  return driver.openVote(userId, motionId, method);
}

export function declareVote(motionId: number, method: VoteMethod, passed: boolean, userId = meetingState.currentUserId): string | null {
  return detectNewVote(() => driver.declareVote(userId, motionId, method, passed));
}

export function castBallot(ballot: Ballot, userId = meetingState.currentUserId): string | null {
  return detectNewVote(() => driver.castBallot(userId, ballot));
}

export function closeVote(userId?: string): string | null {
  return detectNewVote(() => driver.closeVote(userId));
}

/** 会议已产生的最大表决 id（新结果检测基准）。 */
export function maxVoteId(votes: VoteResult[]): number {
  return votes.reduce((max, v) => Math.max(max, v.id), 0);
}

/** demo 模式下动作同步产生新表决结果时弹出结果弹窗（live 由 remote 驱动检测）。 */
function detectNewVote(fn: () => string | null): string | null {
  const before = maxVoteId(meetingState.meeting.votes);
  const result = fn();
  const after = maxVoteId(meetingState.meeting.votes);
  if (after > before)
    uiState.voteResultId = after;
  return result;
}

export function switchAgenda(itemId: number, userId = meetingState.currentUserId): string | null {
  return driver.switchAgenda(userId, itemId);
}

export function addAgendaItem(title: string, details: string, userId = meetingState.currentUserId): string | null {
  return driver.addAgendaItem(userId, title, details);
}

export function updateAgendaItem(itemId: number, patch: AgendaPatch, userId = meetingState.currentUserId): string | null {
  return driver.updateAgendaItem(userId, itemId, patch);
}

export function moveAgendaItem(itemId: number, direction: 'up' | 'down', userId = meetingState.currentUserId): string | null {
  return driver.moveAgendaItem(userId, itemId, direction);
}

export function removeAgendaItem(itemId: number, userId = meetingState.currentUserId): string | null {
  return driver.removeAgendaItem(userId, itemId);
}

export function transferChair(targetId: string, userId = meetingState.currentUserId): string | null {
  return driver.transferChair(userId, targetId);
}

export function setMemberRole(targetId: string, role: 'member' | 'observer', userId = meetingState.currentUserId): string | null {
  return driver.setMemberRole(userId, targetId, role);
}

export function updateMotion(motionId: number, patch: MotionPatch, userId = meetingState.currentUserId): string | null {
  return driver.updateMotion(userId, motionId, patch);
}

export function updateSettings(patch: { title?: string }, userId = meetingState.currentUserId): string | null {
  return driver.updateSettings(userId, patch);
}

export function resetMeeting(): string | null {
  return driver.resetMeeting();
}

// ===== 统计（与会者详情弹窗） =====

export function memberStats(userId: string): MemberStats {
  return engine.memberStats(meetingState, userId);
}
