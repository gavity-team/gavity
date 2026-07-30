import process from 'node:process';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '../utils/db';

/** 启动时自动应用 drizzle 迁移（容器部署用，DB_AUTO_MIGRATE=true 开启）。 */
export default defineNitroPlugin(async () => {
  if (process.env.DB_AUTO_MIGRATE !== 'true')
    return;
  console.warn('[db] auto migrating...');
  await migrate(db, { migrationsFolder: 'migrations' });
  console.warn('[db] migrations applied');
});
