import { defineEventHandler } from 'h3';
import { requireAdminRole, requireAuthenticated } from '#server/utils/auth';
import { getDb } from '#server/utils/db';
import { globalConfig } from '#server/utils/db/schema';

export default defineEventHandler(async (ev) => {
  const authen = await requireAuthenticated(ev.headers);
  requireAdminRole(authen);
  const db = getDb();

  let [config] = await db
    .select()
    .from(globalConfig)
    .limit(1);
  if (!config)
    config = (await db.insert(globalConfig).values({}).returning())[0]!;

  return config;
});
