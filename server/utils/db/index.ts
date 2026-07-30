import process from 'node:process';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export const pg = postgres(process.env.DATABASE_URL!, {
  onnotice: () => {},
});

export const db = drizzle({ client: pg });
