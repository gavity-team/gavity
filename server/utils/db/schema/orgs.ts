import { defineRelationsPart } from 'drizzle-orm';
import { boolean, pgTable, primaryKey, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './auth';
import { buildCommonFields } from './utils';

export const orgs = pgTable('orgs', {
  name: text('name').notNull(),
  avatar: text('avatar'),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  ...buildCommonFields({ idLength: 8 }),
}, t => [
  uniqueIndex('orgs_user_id_uidx').on(t.userId),
]);

export const usersToOrgs = pgTable('users_to_orgs', {
  userId: text('user_id').notNull(),
  orgId: text('org_id').notNull(),
  isOwner: boolean('is_owner').notNull().default(false),
  ...buildCommonFields(),
}, t => [primaryKey({ columns: [t.userId, t.orgId] })]);

export const orgsRelations = defineRelationsPart(
  { users, orgs, usersToOrgs },
  r => ({
    users: {
      orgs: r.many.orgs({
        from: r.users.id.through(r.usersToOrgs.userId),
        to: r.orgs.id.through(r.usersToOrgs.orgId),
      }),
    },
    orgs: {
      user: r.one.users({
        from: r.orgs.userId,
        to: r.users.id,
        optional: false,
      }),
      members: r.many.users(),
    },
    usersToOrgs: {
      user: r.one.users({
        from: r.usersToOrgs.userId,
        to: r.users.id,
      }),
      org: r.one.orgs({
        from: r.usersToOrgs.orgId,
        to: r.orgs.id,
      }),
    },
  }),
);
