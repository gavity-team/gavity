import { z } from 'zod';

export const EnvConfig = z.object({
  DATABASE_URL: z.url().regex(/^postgres(?:ql)?:\/\//),
  DB_AUTO_MIGRATE: z.stringbool(),
  EXTERNAL_URL: z.url(),
  SECRET: z.string().min(32),
  SMTP_URL: z.url().optional(),
  SMTP_FROM: z.string().optional(),
});

export type EnvConfig = z.infer<typeof EnvConfig>;
