import type { LogEntry } from './meeting-engine';
import type { Meeting } from './mettings';
import * as z from 'zod';
import { AgendaItemStatus, Ballot, MotionStatus, MotionType, VoteMethod } from './mettings';

/**
 * 多人会议 WebSocket 协议。
 * Client -> Server 消息用 zod 校验；操作身份由连接决定，不来自消息体。
 */

const motionInput = z.object({
  type: MotionType,
  content: z.string(),
  details: z.string(),
});

const agendaPatch = z.object({
  title: z.string().optional(),
  details: z.string().optional(),
  scheduledAt: z.int().nullable().optional(),
  isSpecial: z.boolean().optional(),
  status: AgendaItemStatus.optional(),
});

const motionPatch = z.object({
  type: MotionType.optional(),
  content: z.string().optional(),
  details: z.string().optional(),
  status: MotionStatus.optional(),
});

export const ClientAction = z.discriminatedUnion('action', [
  z.object({ action: z.literal('ping') }),
  z.object({ action: z.literal('startMeeting') }),
  z.object({ action: z.literal('endMeeting') }),
  z.object({ action: z.literal('resumeMeeting') }),
  z.object({ action: z.literal('toggleRecordMode') }),
  z.object({ action: z.literal('grabFloor') }),
  z.object({ action: z.literal('endFloor') }),
  z.object({ action: z.literal('assignFloor'), targetId: z.string() }),
  z.object({ action: z.literal('revokeFloor') }),
  z.object({ action: z.literal('proposeMotion'), input: motionInput }),
  z.object({ action: z.literal('resolveRuling'), uphold: z.boolean() }),
  z.object({ action: z.literal('secondMotion'), motionId: z.int() }),
  z.object({ action: z.literal('openVote'), motionId: z.int(), method: VoteMethod }),
  z.object({ action: z.literal('declareVote'), motionId: z.int(), method: VoteMethod, passed: z.boolean() }),
  z.object({ action: z.literal('castBallot'), ballot: Ballot }),
  z.object({ action: z.literal('closeVote') }),
  z.object({ action: z.literal('switchAgenda'), itemId: z.int() }),
  z.object({ action: z.literal('addAgendaItem'), title: z.string(), details: z.string() }),
  z.object({ action: z.literal('updateAgendaItem'), itemId: z.int(), patch: agendaPatch }),
  z.object({ action: z.literal('moveAgendaItem'), itemId: z.int(), direction: z.enum(['up', 'down']) }),
  z.object({ action: z.literal('removeAgendaItem'), itemId: z.int() }),
  z.object({ action: z.literal('transferChair'), targetId: z.string() }),
  z.object({ action: z.literal('setMemberRole'), targetId: z.string(), role: z.enum(['member', 'observer']) }),
  z.object({ action: z.literal('updateMotion'), motionId: z.int(), patch: motionPatch }),
  z.object({ action: z.literal('updateSettings'), patch: z.object({ title: z.string().optional() }) }),
]);
export type ClientAction = z.infer<typeof ClientAction>;

/** 与会者名册条目（含在线状态）。 */
export interface RosterEntry {
  id: string
  name: string
  role: 'host' | 'member' | 'observer'
  online: boolean
}

export type ServerMessage
  /** 加入时的全量同步。 */
  = | { type: 'snapshot', meeting: Meeting, logs: LogEntry[], pendingRulingMotionId: number | null, roster: RosterEntry[], you: string }
  /** 动作/进出后的增量同步：meeting 全量 + 新增日志。 */
    | { type: 'update', meeting: Meeting, logs: LogEntry[], pendingRulingMotionId: number | null, roster: RosterEntry[] }
  /** 动作被拒绝。 */
    | { type: 'error', message: string }
  /** 同一账号在其他端加入，本连接被踢下线。 */
    | { type: 'kicked', reason: string };
