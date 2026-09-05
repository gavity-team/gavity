import { eq, inArray } from 'drizzle-orm';
import { createError, defineEventHandler, getValidatedRouterParams, readValidatedBody } from 'h3';
import * as z from 'zod';
import { getDb } from '#server/utils/db';
import { orgs, users, usersToOrgs } from '#server/utils/db/schema';
import { requireOrgManager } from '#server/utils/orgs';

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({ userIds: z.array(z.string().min(1)).min(1), isOwner: z.boolean().optional() });

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse);
  await requireOrgManager(event.headers, id);
  const body = await readValidatedBody(event, bodySchema.parse);
  const db = getDb();
  const [org] = await db.select({ id: orgs.id }).from(orgs).where(eq(orgs.id, id));
  if (!org)
    throw createError({ status: 404, message: '组织不存在' });
  const existing = await db.select({ id: users.id }).from(users).where(inArray(users.id, body.userIds));
  if (existing.length !== body.userIds.length)
    throw createError({ status: 404, message: '用户不存在' });
  await db.insert(usersToOrgs).values(body.userIds.map(userId => ({ userId, orgId: id, isOwner: body.isOwner ?? false }))).onConflictDoUpdate({ target: [usersToOrgs.userId, usersToOrgs.orgId], set: { isOwner: body.isOwner ?? false } });
  return { success: true };
});
