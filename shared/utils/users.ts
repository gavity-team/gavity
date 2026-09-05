import * as z from 'zod';

export const UserBriefInfo = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
});
export type UserBriefInfo = z.infer<typeof UserBriefInfo>;
