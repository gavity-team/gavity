import { and, eq } from 'drizzle-orm';
import { createError, defineEventHandler, getValidatedRouterParams } from 'h3';
import * as z from 'zod';
import { getDb } from '#server/utils/db';
import { usersToOrgs } from '#server/utils/db/schema';
import { requireOrgManager } from '#server/utils/orgs';

const paramsSchema = z.object({ id: z.string().min(1), userId: z.string().min(1) });

export default defineEventHandler(async (event) => {
  const { id, userId } = await getValidatedRouterParams(event, paramsSchema.parse);
  await requireOrgManager(event.headers, id);
  const deleted = await getDb().delete(usersToOrgs).where(and(eq(usersToOrgs.orgId, id), eq(usersToOrgs.userId, userId))).returning({ id: usersToOrgs.userId });
  if (!deleted.length)
    throw createError({ status: 404, message: '组织成员不存在' });
  return { success: true };
});
