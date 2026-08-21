import type { UserBriefInfo } from '#shared/utils/users';
import { inArray } from 'drizzle-orm';
import { defineEventHandler, getValidatedQuery } from 'h3';
import { z } from 'zod';
import { requireVerifiedSession } from '#server/utils/auth';
import { getDb } from '#server/utils/db';
import { users } from '#server/utils/db/schema';

const querySchema = z.object({ ids: z.string().min(1) });

/** 单次批量查询上限，防止超长 id 列表。 */
const MAX_IDS = 100;

/** 批量查询用户简要信息（用户名 + 头像），供前端节流缓存渲染。 */
export default defineEventHandler(async (event) => {
  await requireVerifiedSession(event.headers);
  const { ids } = await getValidatedQuery(event, querySchema.parse);
  const idList = [...new Set(ids.split(',').map(s => s.trim()).filter(Boolean))].slice(0, MAX_IDS);
  if (!idList.length)
    return [];
  const rows = await getDb()
    .select({ id: users.id, name: users.name, avatar: users.image })
    .from(users)
    .where(inArray(users.id, idList));
  return rows.map<UserBriefInfo>(r => ({ id: r.id, name: r.name, avatar: r.avatar ?? undefined }));
});
