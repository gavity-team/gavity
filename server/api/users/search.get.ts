import { eq, ilike } from 'drizzle-orm';
import { defineEventHandler, getValidatedQuery } from 'h3';
import * as z from 'zod';
import { hasAdminRole, requireAuthenticated, requireVerifiedSession } from '#server/utils/auth';
import { getDb } from '#server/utils/db';
import { users } from '#server/utils/db/schema';
import { UserBriefInfo } from '#shared/utils/users';

const QuerySchema = z.object({
  email: z.string().min(1).max(200),
});
const ResponseSchema = z.array(UserBriefInfo);

export default defineEventHandler(async (ev) => {
  const { email } = await getValidatedQuery(ev, QuerySchema.parse);
  const authen = await requireAuthenticated(ev.headers);
  requireVerifiedSession(authen);

  const rows = await getDb()
    .select({ id: users.id, name: users.name, avatar: users.image })
    .from(users)
    .where(hasAdminRole(authen.user) ? ilike(users.email, `%${email}%`) : eq(users.email, email))
    .limit(20);
  return ResponseSchema.parse(rows);
});
