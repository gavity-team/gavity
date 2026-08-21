import { eq } from 'drizzle-orm';
import { defineEventHandler, getValidatedRouterParams } from 'h3';
import { z } from 'zod';
import { requireVerifiedSession } from '#server/utils/auth';
import { getDb } from '#server/utils/db';
import { meetingCodes } from '#server/utils/db/schema';

const routerSchema = z.object({ id: z.coerce.number().int() });

/** 会议的入会码列表（设置页展示）。 */
export default defineEventHandler(async (event) => {
  await requireVerifiedSession(event.headers);
  const { id: meetingId } = await getValidatedRouterParams(event, routerSchema.parse);
  const rows = await getDb().select({ code: meetingCodes.code }).from(meetingCodes).where(eq(meetingCodes.meetingId, meetingId));
  return { codes: rows.map(r => r.code) };
});
