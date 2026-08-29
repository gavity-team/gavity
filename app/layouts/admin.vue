<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

const navItems: NavigationMenuItem[] = [
  { label: '服务信息', icon: 'i-lucide-server', to: '/admin/service' },
  { label: '身份验证', icon: 'i-lucide-shield', to: '/admin/auth' },
  { label: '用户管理', icon: 'i-lucide-users', to: '/admin/users' },
  { label: '组织管理', icon: 'i-lucide-building-2', to: '/admin/orgs' },
  { label: '外部集成', icon: 'i-lucide-cable', to: '/admin/integration' },
];
</script>

<template>
  <div class="flex min-h-screen bg-default">
    <aside class="w-48 border-r border-default flex flex-col shrink-0">
      <div class="px-4 border-b border-gray-200 dark:border-gray-700">
        <NuxtLink to="/admin" class="flex items-center justify-center text-xl text-highlighted">
          <img class="h-10 w-auto mr-3" src="~/assets/brand/gavity+text.svg" alt="Gavity">
          <span class="py-4">
            管理后台
          </span>
        </NuxtLink>
      </div>

      <UNavigationMenu class="flex-1 p-2" :items="navItems" orientation="vertical" size="lg" />

      <div class="w-full">
        <UButton class="rounded-none border-t border-default" to="/" variant="ghost" color="neutral" size="lg" block icon="i-lucide-arrow-left">
          返回首页
        </UButton>
      </div>
    </aside>

    <main class="flex-1 overflow-auto">
      <slot />
    </main>
  </div>
</template>
