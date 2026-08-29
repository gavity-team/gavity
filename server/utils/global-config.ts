import type { GlobalConfig } from '#shared/utils/global-config';
import { getDb } from './db';
import { globalConfig as globalConfigTable } from './db/schema';

let cache: GlobalConfig | undefined;

export async function initGlobalConfigService(): Promise<void> {
  await refreshCache();
}

export async function refreshCache(): Promise<void> {
  const db = getDb();
  let [config] = await db.select().from(globalConfigTable).limit(1);
  if (!config)
    config = (await db.insert(globalConfigTable).values({}).returning())[0]!;
}

export async function getGlobalConfig(forceRefresh = false): Promise<GlobalConfig> {
  if (forceRefresh || !cache)
    await refreshCache();
  return cache!;
}
