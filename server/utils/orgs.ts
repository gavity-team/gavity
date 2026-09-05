import { and, eq } from 'drizzle-orm';
import { createError } from 'h3';
import { hasAdminRole, requireAuthenticated, requireVerifiedSession } from './auth';
import { getDb } from './db';
import { usersToOrgs } from './db/schema';

export async function requireOrgManager(headers: Headers, orgId: string) {
  const session = await requireAuthenticated(headers);
  requireVerifiedSession(session);
  if (hasAdminRole(session.user))
    return session;
  const [membership] = await getDb()
    .select({ isOwner: usersToOrgs.isOwner })
    .from(usersToOrgs)
    .where(and(
      eq(usersToOrgs.orgId, orgId),
      eq(usersToOrgs.userId, session.user.id),
    ));
  if (!membership?.isOwner)
    throw createError({ status: 403, message: '无权限管理组织' });
  return session;
}
