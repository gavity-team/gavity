import { defineEventHandler, readValidatedBody } from 'h3';
import * as z from 'zod';
import { requireStaffSession } from '#server/utils/auth';
import { getDb } from '#server/utils/db';
import { globalConfig } from '#server/utils/db/schema';
import { publishEvent } from '#server/utils/redis';
import { GlobalConfig } from '#shared/utils/global-config';

const RequestBody = z.object({
  key: z.keyof(GlobalConfig),
  value: z.any(),
}).superRefine((x, ctx) => {
  if (x.value === null)
    return;
  const parsed = GlobalConfig.shape[x.key].safeParse(x.value);
  for (const issue of parsed.error?.issues || [])
    ctx.addIssue({ ...issue, path: ['value', ...issue.path] });
});

export default defineEventHandler(async (ev) => {
  await requireStaffSession(ev.headers);
  const body = await readValidatedBody(ev, RequestBody.parse);
  await getDb().update(globalConfig).set({ [body.key]: body.value });
  await publishEvent('globalConfig.updated', { key: body.key });
});
