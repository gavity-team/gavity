import { createError, defineEventHandler, readValidatedBody } from 'h3';
import * as z from 'zod';
import { requireAdminRole, requireAuthenticated } from '#server/utils/auth';
import { getDb } from '#server/utils/db';
import { orgs, users } from '#server/utils/db/schema';
import { generateCode } from '#server/utils/id';

const bodySchema = z.object({ name: z.string().trim().min(1).max(200), avatar: z.string().trim().max(500).nullable().optional() });

export default defineEventHandler(async (event) => {
  const authen = await requireAuthenticated(event.headers);
  requireAdminRole(authen);
  const body = await readValidatedBody(event, bodySchema.parse);
  const db = getDb();
  return db.transaction(async (tx) => {
    const orgId = generateCode(16);
    const userId = generateCode(8);
    await tx.insert(users).values({ id: userId, name: body.name, email: `org-${orgId}@invalid.local`, role: 'org', emailVerified: false, createdAt: new Date(), updatedAt: new Date() });
    const [org] = await tx.insert(orgs).values({ id: orgId, name: body.name, avatar: body.avatar ?? null, userId }).returning();
    if (!org)
      throw createError({ status: 500, message: '创建组织失败' });
    return org;
  });
});
