import { eq } from 'drizzle-orm';
import { createError, defineEventHandler, getValidatedRouterParams } from 'h3';
import * as z from 'zod';
import { requireAdminRole, requireAuthenticated } from '#server/utils/auth';
import { getDb } from '#server/utils/db';
import { orgs, users, usersToOrgs } from '#server/utils/db/schema';

const paramsSchema = z.object({ id: z.string().min(1) });

export default defineEventHandler(async (event) => {
  const authen = await requireAuthenticated(event.headers);
  requireAdminRole(authen);
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse);

  await getDb().transaction(async (tx) => {
    const org = await tx.query.orgs.findFirst({ where: { id } });
    if (!org)
      throw createError({ status: 404, message: '组织不存在' });
    await tx.delete(usersToOrgs).where(eq(usersToOrgs.orgId, id));
    await tx.delete(orgs).where(eq(orgs.id, id));
    await tx.delete(users).where(eq(users.id, org.userId));
  });
});
