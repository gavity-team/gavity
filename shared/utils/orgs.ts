import * as z from 'zod';
import { UserBriefInfo } from './users';

export const Org = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
  user: UserBriefInfo,
  createdAt: z.coerce.date(),
});
export type Org = z.infer<typeof Org>;

export const OrgMember = z.object({
  orgId: z.string(),
  userId: z.string(),
  isOwner: z.boolean(),
});
export type OrgMember = z.infer<typeof OrgMember>;
