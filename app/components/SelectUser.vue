<script setup lang="ts">
import type { UserBriefInfo } from '#shared/utils/users';
import { queryOptions, useQuery } from '@tanstack/vue-query';
import { refDebounced } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import { cacheUserInfos } from '~/utils/users';

const selectedIds = defineModel<string[]>();
const search = ref('');
const debouncedSearch = refDebounced(search, 300);

const searchOptions = computed(() => queryOptions({
  queryKey: ['users', 'search', debouncedSearch.value] as const,
  queryFn: () => $fetch<UserBriefInfo[]>('/api/users/search', {
    query: { email: debouncedSearch.value },
  }),
}));

const usersQuery = useQuery(searchOptions);
const open = ref(false);
watch(() => usersQuery.data.value, (users) => {
  if (users)
    cacheUserInfos(users);
}, { immediate: true });

const userItems = computed(() => usersQuery.data.value ?? []);

function toggleUser(userId: string): void {
  const current = selectedIds.value ?? [];
  selectedIds.value = current.includes(userId)
    ? current.filter(id => id !== userId)
    : [...current, userId];
}

function removeUser(userId: string): void {
  selectedIds.value = (selectedIds.value ?? []).filter(id => id !== userId);
}
</script>

<template>
  <UPopover v-model:open="open" class="w-full">
    <template #anchor>
      <div
        class="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md bg-default px-2.5 py-1.5 text-base/5 text-highlighted ring ring-inset ring-accented outline-primary/25 transition-colors focus-within:outline-3 focus-within:ring-primary md:text-sm"
        @click="open = true"
      >
        <div
          v-for="userId in selectedIds"
          :key="userId"
          class="flex items-center gap-1 rounded-md bg-elevated px-1 py-0.5 text-sm/5"
        >
          <InlineUser :user-id="userId" variant="neutral" />
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="移除用户"
            @click.stop="removeUser(userId)"
          />
        </div>
        <UInput
          v-model="search"
          placeholder="选择用户"
          variant="none"
          class="min-w-32 flex-1"
          :ui="{ root: 'min-h-0', base: 'px-0 py-0 text-base/5 md:text-sm' }"
          @focus="open = true"
        />
      </div>
    </template>

    <template #content>
      <div class="w-(--reka-popper-anchor-width) p-1">
        <div v-if="search && usersQuery.isPending.value" class="space-y-2 p-2">
          <USkeleton class="h-8 w-full" />
          <USkeleton class="h-8 w-full" />
        </div>
        <p v-else-if="!userItems.length" class="p-2 text-sm text-muted">
          输入邮箱搜索用户
        </p>
        <UButton
          v-for="user in userItems"
          v-else
          :key="user.id"
          block
          color="neutral"
          variant="ghost"
          class="justify-start"
          @click="toggleUser(user.id)"
        >
          <InlineUser :user-id="user.id" variant="neutral" />
          <UIcon v-if="selectedIds?.includes(user.id)" name="i-lucide-check" class="ml-auto" />
        </UButton>
      </div>
    </template>
  </UPopover>
</template>
