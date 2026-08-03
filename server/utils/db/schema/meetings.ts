import type { MeetingEngineState } from '#shared/utils/meeting-engine';
import type { MeetingStatus } from '#shared/utils/mettings';
import { integer, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const meetings = pgTable('meetings', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  title: text('title').notNull(),
  chairId: text('chair_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: integer('status').default(0).notNull().$type<MeetingStatus>(),
  state: jsonb('state').$type<MeetingEngineState>(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const meetingCodes = pgTable('meeting_codes', {
  code: text('code').primaryKey(),
  meetingId: integer('meeting_id')
    .notNull()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const meetingPresence = pgTable(
  'meeting_presence',
  {
    meetingId: integer('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    instanceId: text('instance_id').notNull(),
    connId: text('conn_id').notNull(),
    connectedAt: timestamp('connected_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  t => [
    primaryKey({ columns: [t.meetingId, t.userId] }),
  ],
);
