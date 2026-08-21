import type { UserBriefInfo } from '#shared/utils/users';
import { useThrottleFn } from '@vueuse/core';
import { reactive } from 'vue';

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
const userCache = reactive(new Map<string, UserBriefInfo>(
  DEMO_USERS.map(u => [u.id, { id: u.id, name: u.name, avatar: u.avatar }] as [string, UserBriefInfo]),
));

/** 合批查询窗口：本窗口内累积的缺失 id 合并为一次请求。 */
const FLUSH_MS = 50;
/** 单次请求 id 数上限，与后端保持一致。 */
const MAX_BATCH = 100;

/** 待查询（尚未发起请求）的 id。 */
const pending = new Set<string>();
/** 已发起请求（成功或进行中）的 id，避免重复查询。 */
const requested = new Set<string>();

/** 节流 flush：窗口内累积的 id 合并为一次请求；尾随执行，新增不延长窗口。 */
const throttledFlush = useThrottleFn(() => void flush(), FLUSH_MS, true, false);

/** 直接写入缓存（demo 预置名册使用），并清空查询标记。 */
export function setUserInfos(users: UserBriefInfo[]): void {
  userCache.clear();
  pending.clear();
  requested.clear();
  for (const user of users)
    userCache.set(user.id, user);
}

/** 读取缓存的用户信息（不触发查询）。 */
export function getUserInfo(id: string | undefined | null): UserBriefInfo | null {
  return typeof id === 'string' ? userCache.get(id) ?? null : null;
}

/** 确保若干用户信息进入缓存：缺失的 id 会被节流合批查询。 */
export function ensureUsers(ids: (string | null | undefined)[]): void {
  let added = false;
  for (const id of ids) {
    if (!id || userCache.has(id) || requested.has(id) || pending.has(id))
      continue;
    pending.add(id);
    added = true;
  }
  if (added)
    throttledFlush();
}

async function flush(): Promise<void> {
  const ids = [...pending].slice(0, MAX_BATCH);
  if (!ids.length)
    return;
  for (const id of ids) {
    pending.delete(id);
    requested.add(id);
  }
  try {
    const rows = await $fetch<UserBriefInfo[]>('/api/users', {
      query: { ids: ids.join(',') },
    });
    for (const row of rows)
      userCache.set(row.id, row);
  } catch {
    // 查询失败：撤销标记，允许后续重试
    for (const id of ids)
      requested.delete(id);
  }
  // 处理窗口期内新累积的 id（含本次超出 MAX_BATCH 的部分）
  if (pending.size)
    throttledFlush();
}
