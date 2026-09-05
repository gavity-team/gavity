<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';
import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import { definePageMeta, useHead, useRoute } from '#imports';
import { orgQueryOptions } from '~/utils/orgs';

definePageMeta({ middleware: 'auth' });
const route = useRoute();
const orgId = computed(() => String(route.params.id));
const orgQuery = useQuery(orgQueryOptions(orgId.value));
useHead(() => ({ title: orgQuery.data.value?.name ?? '组织' }));
const navItems: NavigationMenuItem[] = [
  { label: '概览', icon: 'i-lucide-layout-dashboard', to: `/orgs/${orgId.value}`, exact: true },
  { label: '会议', icon: 'i-lucide-calendar-days', to: `/orgs/${orgId.value}/meetings` },
  { label: '成员', icon: 'i-lucide-users', to: `/orgs/${orgId.value}/members` },
  { label: '设置', icon: 'i-lucide-settings', to: `/orgs/${orgId.value}/settings` },
];
</script>

<template>
  <div class="flex min-h-0 w-full flex-1">
    <USidebar
      class="h-auto w-56 shrink-0"
      collapsible="none"
      side="left"
      :ui="{ root: 'border-r border-default' }"
    >
      <div class="flex items-center gap-2 px-2">
        <UAvatar :src="orgQuery.data.value?.avatar ?? undefined" :alt="orgQuery.data.value?.name" size="sm" />
        <span class="truncate font-semibold">{{ orgQuery.data.value?.name }}</span>
      </div>
      <UNavigationMenu class="w-full" type="single" :items="navItems" orientation="vertical" />
    </USidebar>
    <main class="min-w-0 flex-1">
      <NuxtPage />
    </main>
  </div>
</template>
