import { eq } from 'drizzle-orm';
import { requireVerifiedSession } from '#server/utils/auth';
import { db } from '#server/utils/db';
import { meetingCodes } from '#server/utils/db/schema';

/** 入会码 → 会议 ID。 */
export default defineEventHandler(async (event) => {
  await requireVerifiedSession(event.headers);
  const code = String(getQuery(event).code ?? '').trim().toUpperCase();
  if (!code) {
    throw createError({ statusCode: 400, message: '请输入入会码' });
  }
  const [row] = await db.select({ meetingId: meetingCodes.meetingId })
    .from(meetingCodes)
    .where(eq(meetingCodes.code, code));
  if (!row) {
    throw createError({ statusCode: 404, message: '入会码无效或已失效' });
  }
  return { id: row.meetingId };
});
