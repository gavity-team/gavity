<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import { authClient } from '~/utils/auth';

const session = authClient.useSession();

const userMenuItems: DropdownMenuItem[] = [
  { icon: 'i-lucide-user', label: '个人资料', to: '/profile' },
  { icon: 'i-lucide-log-out', label: '退出登录', onClick: () => authClient.signOut() },
];
</script>

<template>
  <div class="flex min-h-screen flex-col bg-default">
    <header class="flex h-14 items-center gap-2.5 border-b border-default px-4 shrink-0">
      <NuxtLink to="/" class="flex items-center gap-2.5">
        <img src="~/assets/brand/gavity.svg" alt="Gavity" class="h-6 w-auto">
        <span class="text-2xl text-highlighted" style="font-family: Google Sans Flex;">Gavity</span>
      </NuxtLink>

      <div class="flex-1" />

      <template v-if="!session.isPending">
        <template v-if="session?.data?.user">
          <UDropdownMenu size="lg" :items="userMenuItems">
            <div class="flex items-center cursor-pointer">
              <UAvatar :alt="session.data.user.name || session.data.user.email" />
            </div>
          </UDropdownMenu>
        </template>
        <template v-else>
          <UButton to="/login" label="登录 / 注册" />
        </template>
      </template>

      <UColorModeButton color="neutral" variant="ghost" size="sm" />
    </header>
    <slot />
  </div>
</template>
