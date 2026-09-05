import { defineEventHandler } from 'h3';
import { requireAuthenticated, requireVerifiedSession } from '#server/utils/auth';
import { getDb } from '#server/utils/db';

export default defineEventHandler(async (event) => {
  const authen = await requireAuthenticated(event.headers);
  requireVerifiedSession(authen);
  const memberships = await getDb().query.usersToOrgs.findMany({
    where: { userId: authen.user.id },
    with: { org: true },
  });
  return memberships.flatMap(({ org, isOwner }) => {
    if (!org)
      return [];
    return [{
      id: org.id,
      name: org.name,
      avatar: org.avatar,
      isOwner,
    }];
  });
});
