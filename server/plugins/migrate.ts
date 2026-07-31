import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { getDb } from '#server/utils/db';
import { getEnvConfig } from '#server/utils/env';

// upstream: https://github.com/nuxt/nuxt/issues/15088
const defineNitroPlugin = (x: any) => x;

export default defineNitroPlugin(async () => {
  if (!getEnvConfig().DB_AUTO_MIGRATE)
    return;
  await migrate(getDb(), { migrationsFolder: 'migrations' });
});
