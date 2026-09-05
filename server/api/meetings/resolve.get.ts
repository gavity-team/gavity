import { eq } from 'drizzle-orm';
import { createError, defineEventHandler, getValidatedQuery } from 'h3';
import * as z from 'zod';
import { requireAuthenticated, requireVerifiedSession } from '#server/utils/auth';
import { getDb } from '#server/utils/db';
import { meetingCodes } from '#server/utils/db/schema';

const querySchema = z.object({ code: z.string().min(1) });

export default defineEventHandler(async (event) => {
  const authen = await requireAuthenticated(event.headers);
  requireVerifiedSession(authen);
  const q = await getValidatedQuery(event, querySchema.parse);
  const code = q.code.trim().toUpperCase();
  const [row] = await getDb()
    .select({ meetingId: meetingCodes.meetingId })
    .from(meetingCodes)
    .where(eq(meetingCodes.code, code));
  if (!row) {
    throw createError({ statusCode: 404, message: '入会码无效或已失效' });
  }
  return { id: row.meetingId };
});
