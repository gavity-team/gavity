import { createError, defineEventHandler, getValidatedRouterParams } from 'h3';
import * as z from 'zod';
import { requireAuthenticated, requireVerifiedSession } from '#server/utils/auth';
import { getDb } from '#server/utils/db';
import { Org } from '#shared/utils/orgs';

const paramsSchema = z.object({ id: z.string().min(1) });

export default defineEventHandler(async (event) => {
  const authen = await requireAuthenticated(event.headers);
  requireVerifiedSession(authen);
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse);
  const org = await getDb().query.orgs.findFirst({
    where: { id },
    with: { user: true },
  });
  if (!org)
    throw createError({ status: 404, message: '组织不存在' });
  return Org.parse({
    id: org.id,
    name: org.name,
    avatar: org.avatar,
    createdAt: org.createdAt,
    user: {
      id: org.user.id,
      name: org.user.name,
      avatar: org.user.image,
    },
  });
});
