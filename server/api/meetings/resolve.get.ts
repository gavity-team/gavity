import { eq } from 'drizzle-orm';
import { createError, defineEventHandler, getQuery } from 'h3';
import { requireVerifiedSession } from '#server/utils/auth';
import { getDb } from '#server/utils/db';
import { meetingCodes } from '#server/utils/db/schema';

export default defineEventHandler(async (event) => {
  await requireVerifiedSession(event.headers);
  const code = String(getQuery(event).code ?? '').trim().toUpperCase();
  if (!code) {
    throw createError({ statusCode: 400, message: '请输入入会码' });
  }
  const [row] = await getDb()
    .select({ meetingId: meetingCodes.meetingId })
    .from(meetingCodes)
    .where(eq(meetingCodes.code, code));
  if (!row) {
    throw createError({ statusCode: 404, message: '入会码无效或已失效' });
  }
  return { id: row.meetingId };
});
