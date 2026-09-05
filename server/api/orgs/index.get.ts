import { defineEventHandler } from 'h3';
import { requireAdminRole, requireAuthenticated } from '#server/utils/auth';
import { getDb } from '#server/utils/db';
import { Org } from '#shared/utils/orgs';

export default defineEventHandler(async (event) => {
  const authen = await requireAuthenticated(event.headers);
  requireAdminRole(authen);
  const rows = await getDb().query.orgs.findMany({ with: { user: true } });
  return rows.map(row => Org.parse({
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    createdAt: row.createdAt,
    user: {
      id: row.user.id,
      name: row.user.name,
      avatar: row.user.image,
    },
  }));
});
