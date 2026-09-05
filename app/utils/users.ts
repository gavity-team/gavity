import type { UserBriefInfo } from '#shared/utils/users';

/**
 * 全局用户信息缓存（与会议状态完全解耦）。
 * 会议状态只保存用户 id，显示名与头像由前端按需向后端批量查询并缓存。
 */

export interface DemoUser {
  id: string
  name: string
  avatar: string
}

/** 原型演示用的与会者名册；头像使用 GitHub identicons。 */
export const DEMO_USERS: DemoUser[] = [
  { id: 'u1', name: '张三', avatar: 'https://github.com/identicons/zhangsan.png' },
  { id: 'u2', name: '李四', avatar: 'https://github.com/identicons/lisi.png' },
  { id: 'u3', name: '王五', avatar: 'https://github.com/identicons/wangwu.png' },
  { id: 'u4', name: '赵六', avatar: 'https://github.com/identicons/zhaoliu.png' },
  { id: 'u5', name: '孙七', avatar: 'https://github.com/identicons/sunqi.png' },
  { id: 'u6', name: '周八', avatar: 'https://github.com/identicons/zhouba.png' },
];

/** 全局用户缓存（id -> 信息）；初始即注入 DEMO_USERS，使 demo 日志也能显示中文名。 */
const userCache = new Map<string, UserBriefInfo>(
  DEMO_USERS.map(u => [u.id, { id: u.id, name: u.name, avatar: u.avatar }] as [string, UserBriefInfo]),
);
/** 单次请求 id 数上限，与后端保持一致。 */
const MAX_BATCH = 100;

/** 待查询（尚未发起请求）的 id。 */
const inFlight = new Map<string, Promise<UserBriefInfo | null>>();

/** 直接写入缓存（demo 预置名册使用），并清空查询标记。 */
export function setUserInfos(users: UserBriefInfo[]): void {
  userCache.clear();
  inFlight.clear();
  for (const user of users)
    userCache.set(user.id, user);
}

/** 将查询结果合并进缓存，不影响已有的演示数据或其他用户信息。 */
export function cacheUserInfos(users: UserBriefInfo[]): void {
  for (const user of users) {
    userCache.set(user.id, user);
    inFlight.delete(user.id);
  }
}

/** 读取缓存的用户信息（不触发查询）。 */
export function getUserInfo(id: string | undefined | null): UserBriefInfo | null {
  return typeof id === 'string' ? userCache.get(id) ?? null : null;
}

export async function loadUsers(ids: (string | null | undefined)[]): Promise<void> {
  const uniqueIds = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const missingIds = uniqueIds.filter(id => !userCache.has(id) && !inFlight.has(id));
  for (const idsChunk of chunk(missingIds, MAX_BATCH)) {
    const request = $fetch<UserBriefInfo[]>('/api/users', {
      query: { ids: idsChunk.join(',') },
    }).then((users) => {
      cacheUserInfos(users);
      return users;
    }).catch(() => []);
    for (const id of idsChunk)
      inFlight.set(id, request.then(users => users.find(user => user.id === id) ?? null));
  }
  await Promise.all(uniqueIds.map(id => inFlight.get(id)));
  for (const id of uniqueIds)
    inFlight.delete(id);
}

export function ensureUsers(ids: (string | null | undefined)[]): void {
  void loadUsers(ids);
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size)
    chunks.push(items.slice(index, index + size));
  return chunks;
}
