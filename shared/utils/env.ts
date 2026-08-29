import * as z from 'zod';

export const EnvConfig = z.object({
  DATABASE_URL: z.url().regex(/^postgres(?:ql)?:\/\//),
  DB_AUTO_MIGRATE: z.stringbool(),
  EXTERNAL_URL: z.url(),
  SECRET: z.string().min(32),
  REDIS_URL: z.url(),
  DO_SET_ADMIN_EMAIL: z.email().optional(),
  LOG_LEVEL: z.enum(['silent', 'fatal', 'error', 'warn', 'log', 'info', 'debug', 'trace', 'verbose'])
    .default(() => import.meta.dev ? 'debug' : 'info'),
});

export type EnvConfig = z.infer<typeof EnvConfig>;
