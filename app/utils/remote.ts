import type { ClientAction, RosterEntry, ServerMessage } from '#shared/utils/protocol';
import type { MeetingDriver } from './meetings';
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js';
import { navigateTo } from '#app';
import { maxVoteId, meetingState, resetDriver, setDriver } from './meetings';
import { notifyError, uiState } from './ui';

/**
 * 多人会议远程驱动：动作经同源 WebSocket 交由服务端权威执行，
 * 服务端广播的状态直接覆写 meetingState。
 */

let ws: WebSocket | null = null;
let roomId: string | null = null;
let kicked = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let pingTimer: ReturnType<typeof setInterval> | null = null;

/** 心跳间隔：服务端 20s 未收到 ping 标记断线，30s 关闭连接。 */
const PING_INTERVAL_MS = 10_000;

function stopPing(): void {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

function send(action: ClientAction): string | null {
  if (!ws || ws.readyState !== WebSocket.OPEN)
    return '连接未就绪，请稍候';
  ws.send(JSON.stringify(action));
  return null;
}

const remoteDriver: MeetingDriver = {
  startMeeting: () => send({ action: 'startMeeting' }),
  endMeeting: () => send({ action: 'endMeeting' }),
  resumeMeeting: () => send({ action: 'resumeMeeting' }),
  toggleRecordMode: () => send({ action: 'toggleRecordMode' }),
  grabFloor: () => send({ action: 'grabFloor' }),
  endFloor: () => send({ action: 'endFloor' }),
  assignFloor: (_userId, targetId) => send({ action: 'assignFloor', targetId }),
  revokeFloor: () => send({ action: 'revokeFloor' }),
  proposeMotion: (_userId, input) => send({ action: 'proposeMotion', input }),
  resolveRuling: (_userId, uphold) => send({ action: 'resolveRuling', uphold }),
  secondMotion: (_userId, motionId) => send({ action: 'secondMotion', motionId }),
  openVote: (_userId, motionId, method) => send({ action: 'openVote', motionId, method }),
  declareVote: (_userId, motionId, method, passed) => send({ action: 'declareVote', motionId, method, passed }),
  castBallot: (_userId, ballot) => send({ action: 'castBallot', ballot }),
  closeVote: () => send({ action: 'closeVote' }),
  switchAgenda: (_userId, itemId) => send({ action: 'switchAgenda', itemId }),
  addAgendaItem: (_userId, title, details) => send({ action: 'addAgendaItem', title, details }),
  updateAgendaItem: (_userId, itemId, patch) => send({ action: 'updateAgendaItem', itemId, patch }),
  moveAgendaItem: (_userId, itemId, direction) => send({ action: 'moveAgendaItem', itemId, direction }),
  removeAgendaItem: (_userId, itemId) => send({ action: 'removeAgendaItem', itemId }),
  transferChair: (_userId, targetId) => send({ action: 'transferChair', targetId }),
  setMemberRole: (_userId, targetId, role) => send({ action: 'setMemberRole', targetId, role }),
  removeMember: (_userId, targetId) => send({ action: 'removeMember', targetId }),
  updateMotion: (_userId, motionId, patch) => send({ action: 'updateMotion', motionId, patch }),
  updateSettings: (_userId, patch) => send({ action: 'updateSettings', patch }),
  resetMeeting: () => '多人会议不支持重置，请创建新会议',
};

export function connectMeeting(id: string): void {
  roomId = id;
  kicked = false;
  reconnectAttempts = 0;
  setDriver(remoteDriver);
  meetingState.mode = 'live';
  meetingState.connected = false;
  meetingState.logs = [];
  meetingState.onlineIds = [];
  openSocket();
}

export function disconnectMeeting(): void {
  roomId = null;
  kicked = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    const socket = ws;
    ws = null;
    socket.onclose = null;
    socket.close();
  }
  stopPing();
  resetDriver();
  meetingState.connected = false;
}

function openSocket(): void {
  if (!roomId)
    return;
  // 同源连接，身份由 session cookie 在升级阶段验证
  const url = new URL(`/api/meetings/${roomId}/ws`, location.origin);
  url.protocol = url.protocol.replace('http', 'ws');
  const socket = new WebSocket(url);
  ws = socket;
  socket.onopen = () => {
    if (ws !== socket)
      return;
    reconnectAttempts = 0;
    meetingState.connected = true;
    stopPing();
    pingTimer = setInterval(send, PING_INTERVAL_MS, { action: 'ping' });
  };
  socket.onmessage = (ev) => {
    if (ws !== socket)
      return;
    let msg: ServerMessage;
    try {
      msg = JSON.parse(String(ev.data));
    } catch {
      return;
    }
    handleMessage(msg);
  };
  socket.onclose = () => {
    if (ws !== socket)
      return;
    ws = null;
    meetingState.connected = false;
    stopPing();
    if (!kicked && roomId)
      scheduleReconnect();
  };
}

function scheduleReconnect(): void {
  if (reconnectTimer)
    return;
  const delay = Math.min(1000 * 2 ** reconnectAttempts, 10000);
  reconnectAttempts += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    openSocket();
  }, delay);
}

function applyRoster(roster: RosterEntry[]): void {
  meetingState.names = Object.fromEntries(roster.map(r => [r.id, r.name]));
  meetingState.onlineIds = roster.filter(r => r.online).map(r => r.id);
}

function trimLogs(): void {
  if (meetingState.logs.length > 200)
    meetingState.logs.splice(0, meetingState.logs.length - 200);
  meetingState.logSeq = meetingState.logs.reduce((max, l) => Math.max(max, l.id), meetingState.logSeq);
}

function handleMessage(msg: ServerMessage): void {
  switch (msg.type) {
    case 'snapshot':
      meetingState.meeting = msg.meeting;
      meetingState.logs = msg.logs;
      meetingState.pendingRulingMotionId = msg.pendingRulingMotionId;
      meetingState.currentUserId = msg.you;
      meetingState.logSeq = msg.logs.reduce((max, l) => Math.max(max, l.id), 0);
      applyRoster(msg.roster);
      break;
    case 'update': {
      const prevMax = maxVoteId(meetingState.meeting.votes);
      meetingState.meeting = msg.meeting;
      const nextMax = maxVoteId(msg.meeting.votes);
      if (nextMax > prevMax)
        uiState.voteResultId = nextMax;
      if (msg.logs.length) {
        meetingState.logs.push(...msg.logs);
        trimLogs();
      }
      meetingState.pendingRulingMotionId = msg.pendingRulingMotionId;
      applyRoster(msg.roster);
      break;
    }
    case 'error':
      notifyError(msg.message);
      break;
    case 'kicked': {
      kicked = true;
      roomId = null;
      const toast = useToast();
      toast.add({ title: '你已在其他设备加入本会议，当前连接已断开', color: 'warning', icon: 'i-lucide-monitor-x' });
      resetDriver();
      navigateTo('/');
      break;
    }
  }
}
