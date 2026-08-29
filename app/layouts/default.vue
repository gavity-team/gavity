<script setup lang="ts">
import { authClient } from '~/utils/auth';

const session = authClient.useSession();

async function onSignOut(): Promise<void> {
  await authClient.signOut();
}
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
          <div class="flex items-center gap-2">
            <UAvatar :alt="session.data.user.name || session.data.user.email" size="2xs" />
            <span class="text-sm text-default">{{ session.data.user.name || session.data.user.email }}</span>
          </div>
          <UButton
            label="退出登录"
            icon="i-lucide-log-out"
            color="neutral"
            variant="outline"
            size="sm"
            @click="onSignOut"
          />
        </template>
        <template v-else>
          <UButton to="/login" label="登录 / 注册" size="sm" />
        </template>
      </template>
      <UColorModeButton color="neutral" variant="outline" size="sm" />
    </header>
    <slot />
  </div>
</template>
