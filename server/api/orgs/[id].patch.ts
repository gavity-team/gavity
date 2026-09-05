import { eq } from 'drizzle-orm';
import { createError, defineEventHandler, getValidatedRouterParams, readValidatedBody } from 'h3';
import * as z from 'zod';
import { getDb } from '#server/utils/db';
import { orgs, users } from '#server/utils/db/schema';
import { requireOrgManager } from '#server/utils/orgs';

const paramsSchema = z.object({ id: z.string().min(1) });
const bodySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  avatar: z.string().trim().max(500).nullable().optional(),
});

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse);
  await requireOrgManager(event.headers, id);
  const body = await readValidatedBody(event, bodySchema.parse);

  const db = getDb();
  const [org] = await db.update(orgs).set(body).where(eq(orgs.id, id)).returning();
  if (!org)
    throw createError({ status: 404, message: '组织不存在' });
  if (body.name)
    await db.update(users).set({ name: body.name }).where(eq(users.id, org.userId));
});
