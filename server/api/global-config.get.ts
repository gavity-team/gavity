import { defineEventHandler } from 'h3';
import { requireAdminSession } from '#server/utils/auth';
import { getDb } from '#server/utils/db';
import { globalConfig } from '#server/utils/db/schema';

export default defineEventHandler(async (ev) => {
  await requireAdminSession(ev.headers);
  const db = getDb();

  let [config] = await db
    .select()
    .from(globalConfig)
    .limit(1);
  if (!config)
    config = (await db.insert(globalConfig).values({}).returning())[0]!;

  return config;
});
