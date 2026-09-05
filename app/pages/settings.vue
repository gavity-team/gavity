<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';
import { definePageMeta, useHead } from '#imports';

definePageMeta({ middleware: 'auth' });
useHead({ title: '设置' });
const navItems: NavigationMenuItem[] = [
  { label: '账号与安全', icon: 'i-lucide-user', to: '/settings/account' },
  { label: '组织', icon: 'i-lucide-building-2', to: '/settings/orgs' },
  { label: '通知', icon: 'i-lucide-bell', to: '/settings/notifications' },
  { label: '集成', icon: 'i-lucide-webhook', to: '/settings/integrations' },
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
        <span class="truncate font-semibold">设置</span>
      </div>
      <UNavigationMenu class="w-full" type="single" :items="navItems" orientation="vertical" />
    </USidebar>
    <main class="min-w-0 flex-1">
      <NuxtPage />
    </main>
  </div>
</template>
