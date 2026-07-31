import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { getEnvConfig } from '#server/utils/env';
import { toCachedFn } from '#shared/utils/fn';

export const getPg = toCachedFn(() => {
  const env = getEnvConfig();
  return postgres(env.DATABASE_URL!, {
    onnotice: () => {},
  });
});

export const getDb = toCachedFn(() => drizzle({ client: getPg() }));
