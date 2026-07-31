import { eq } from 'drizzle-orm';
import { createError, defineEventHandler, getRouterParam } from 'h3';
import { requireVerifiedSession } from '#server/utils/auth';
import { getDb } from '#server/utils/db';
import { meetingCodes } from '#server/utils/db/schema';

/** 会议的入会码列表（设置页展示）。 */
export default defineEventHandler(async (event) => {
  await requireVerifiedSession(event.headers);
  const meetingId = Number.parseInt(getRouterParam(event, 'id') ?? '', 10);
  if (!Number.isInteger(meetingId)) {
    throw createError({ statusCode: 400, message: '无效的会议 ID' });
  }
  const rows = await getDb().select({ code: meetingCodes.code }).from(meetingCodes).where(eq(meetingCodes.meetingId, meetingId));
  return { codes: rows.map(r => r.code) };
});
