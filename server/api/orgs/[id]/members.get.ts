import { defineEventHandler, getValidatedRouterParams } from 'h3';
import * as z from 'zod';
import { requireAuthenticated, requireVerifiedSession } from '#server/utils/auth';
import { getDb } from '#server/utils/db';
import { OrgMember } from '#shared/utils/orgs';

const ParamsSchema = z.object({ id: z.string().min(1) });
const ResponseSchema = z.array(OrgMember);

export default defineEventHandler(async (event) => {
  const authen = await requireAuthenticated(event.headers);
  requireVerifiedSession(authen);
  const { id } = await getValidatedRouterParams(event, ParamsSchema.parse);
  const rows = await getDb().query.usersToOrgs.findMany({ where: { orgId: id } });
  return ResponseSchema.parse(rows);
});
