<script setup lang="ts">
import { computed, watch } from 'vue';
import { ensureUsers, getUserInfo } from '~/utils/users';

const props = withDefaults(defineProps<{
  userId: string | null | undefined
  /** 显式头像尺寸；缺省时头像随周围字号等比缩放（1.4em），保持胶囊整体比例。 */
  size?: '3xs' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'primary' | 'neutral'
}>(), {
  variant: 'primary',
});

// 显示名与头像按需向后端查询并缓存（节流合批）
watch(() => props.userId, id => ensureUsers([id]), { immediate: true });

const info = computed(() => (props.userId ? getUserInfo(props.userId) : null));
const displayName = computed(() => {
  if (!props.userId)
    return '系统';
  return info.value?.name ?? props.userId;
});
</script>

<template>
  <span
    class="relative isolate inline-flex items-center gap-1 rounded-full pl-px pr-1 align-text-bottom cursor-pointer before:absolute before:-inset-y-px before:inset-x-0 before:-z-10 before:rounded-full before:transition-colors"
    :class="variant === 'primary' ? 'before:bg-elevated hover:before:bg-accented' : 'hover:before:bg-elevated'"
  >
    <UAvatar
      :src="info?.avatar"
      :alt="displayName"
      :size
      :ui="size ? undefined : { root: 'size-[1.4em] text-[length:inherit]', fallback: 'text-[0.6em]' }"
    />
    <span class="max-w-40 truncate leading-none">{{ displayName }}</span>
  </span>
</template>
