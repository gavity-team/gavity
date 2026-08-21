import { createError, defineEventHandler, readValidatedBody } from 'h3';
import { z } from 'zod';
import { requireVerifiedSession } from '#server/utils/auth';
import { getDb } from '#server/utils/db';
import { meetingCodes, meetings } from '#server/utils/db/schema';
import { generateCode } from '#server/utils/id';
import { MeetingStatusMap } from '#shared/utils/mettings';

const bodySchema = z.object({ title: z.string().optional() });

/** 入会码长度。 */
const CODE_LENGTH = 6;

export default defineEventHandler(async (event) => {
  const session = await requireVerifiedSession(event.headers);
  const body = await readValidatedBody(event, bodySchema.parse);
  const title = body.title?.trim() || '未命名会议';
  const [meeting] = await getDb().insert(meetings).values({
    title,
    chairId: session.user.id,
    status: MeetingStatusMap.NOT_STARTED,
  }).returning({ id: meetings.id });
  let code = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    code = generateCode(CODE_LENGTH);
    const inserted = await getDb().insert(meetingCodes).values({ code, meetingId: meeting!.id }).onConflictDoNothing().returning({ code: meetingCodes.code });
    if (inserted.length)
      return { id: meeting!.id, code, title };
  }
  throw createError({ statusCode: 500, message: '入会码生成失败，请重试' });
});
