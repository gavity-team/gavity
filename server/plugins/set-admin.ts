import { eq } from 'drizzle-orm';
import { getDb } from '#server/utils/db';
import { users } from '#server/utils/db/schema';
import { getEnvConfig } from '#server/utils/env';
import { createLogger } from '#server/utils/logger';

// upstream: https://github.com/nuxt/nuxt/issues/15088
const defineNitroPlugin = (x: any) => x;

export default defineNitroPlugin(async () => {
  const logger = createLogger('set-admin');
  const email = getEnvConfig().DO_SET_ADMIN_EMAIL;
  if (!email)
    return;

  // upstream: https://github.com/better-auth/better-auth/issues/3717
  const db = getDb();
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user)
    throw new Error(`Failed to set admin: user with email ${email} not found`);

  const roles = user.role ? user.role.split(',') : [];
  if (roles.includes('admin'))
    return logger.warn(`User ${user.id} with email ${email} already has admin role`);
  roles.push('admin');

  await db
    .update(users)
    .set({ role: roles.join(',') })
    .where(eq(users.id, user.id));
  logger.success(`Set user ${user.id} with email ${email} to admin`);
});
