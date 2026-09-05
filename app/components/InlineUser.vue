<script setup lang="ts">
import type { UserBriefInfo } from '#shared/utils/users';
import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import { cacheUserInfos, getUserInfo } from '~/utils/users';

const props = withDefaults(defineProps<{
  userId: string | null | undefined
  /** 显式头像尺寸；缺省时头像随周围字号等比缩放（1.4em），保持胶囊整体比例。 */
  size?: '3xs' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'primary' | 'neutral'
}>(), {
  variant: 'primary',
});

// 显示名与头像按需向后端查询并缓存（节流合批）
const userQuery = useQuery({
  queryKey: computed(() => ['users', 'brief', props.userId] as const),
  queryFn: async () => {
    const id = props.userId;
    if (!id)
      return null;
    const users = await $fetch<UserBriefInfo[]>('/api/users', { query: { ids: id } });
    cacheUserInfos(users);
    return getUserInfo(id);
  },
  enabled: computed(() => Boolean(props.userId) && !getUserInfo(props.userId)),
  initialData: computed(() => getUserInfo(props.userId)),
});
const info = computed(() => userQuery.data.value ?? getUserInfo(props.userId));
const loading = computed(() => userQuery.isPending.value);
const displayName = computed(() => {
  if (!props.userId)
    return '系统';
  return info.value?.name ?? props.userId;
});
</script>

<template>
  <span
    class="relative isolate inline-flex items-center gap-1 rounded-full pl-px pr-[0.5em] align-text-bottom cursor-pointer before:absolute before:-inset-y-px before:inset-x-0 before:-z-10 before:rounded-full before:transition-colors"
    :class="variant === 'primary' ? 'before:bg-elevated hover:before:bg-accented' : 'hover:before:bg-elevated'"
  >
    <template v-if="loading">
      <USkeleton class="size-[1.4em] rounded-full" />
      <USkeleton class="h-3 w-16" />
    </template>
    <template v-else>
      <UAvatar
        :src="info?.avatar ?? undefined"
        :alt="displayName"
        :size
        :ui="size ? undefined : { root: 'size-[1.4em] text-[length:inherit]', fallback: 'text-[0.6em]' }"
      />
      <span class="max-w-40 truncate leading-none">{{ displayName }}</span>
    </template>
  </span>
</template>
