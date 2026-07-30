import type { MeetingEngineState } from '#shared/utils/meeting-engine';
import { integer, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './auth';

/** 会议元数据 + 实时状态（原 Durable Object 存储，现落库到 Postgres）。 */
export const meetings = pgTable('meetings', {
  /** 自增会议 ID，同时作为房间广播频道的路由名。 */
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  title: text('title').notNull(),
  chairId: text('chair_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** MeetingStatusMap 值（0 未开始 / 1 进行中 / 4 已结束等），冗余自 state 便于列表查询。 */
  status: integer('status').default(0).notNull(),
  /** 会议引擎权威状态，首次有人连接时初始化。 */
  state: jsonb('state').$type<MeetingEngineState>(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * 入会码：与会者凭码解析出会议 ID 后加入。
 * 一个会议可有多个码；会议结束时释放（删除）供后续会议复用。
 */
export const meetingCodes = pgTable('meeting_codes', {
  /** 6 位入会码，字符集 0123456789ABCDEFGHJKMNPQRSTVWXYZ。 */
  code: text('code').primaryKey(),
  meetingId: integer('meeting_id')
    .notNull()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * 在线名册：每行代表一个活跃 WebSocket 连接归属。
 * 同一 (meetingId, userId) 仅保留最新连接（单端限制），旧连接经 NOTIFY 被踢。
 */
export const meetingPresence = pgTable(
  'meeting_presence',
  {
    meetingId: integer('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    /** 持有该连接的服务器实例。实例重启时按此清理残留行。 */
    instanceId: text('instance_id').notNull(),
    connId: text('conn_id').notNull(),
    connectedAt: timestamp('connected_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    /** 实例心跳刷新；超时行视为离线并被定期清理。 */
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  t => [
    primaryKey({ columns: [t.meetingId, t.userId] }),
  ],
);
