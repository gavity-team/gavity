<script setup lang="ts">
import { computed } from 'vue';
import { authClient } from '~/utils/auth';

/** useSession 返回 DeepReadonly Ref（初始值可能为 undefined），这里用 computed 取出便于模板使用。 */
const sessionState = authClient.useSession();
const session = computed(() => sessionState.value?.data ?? null);
const isPending = computed(() => sessionState.value?.isPending ?? true);

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
      <template v-if="!isPending">
        <template v-if="session?.user">
          <div class="flex items-center gap-2">
            <UAvatar :alt="session.user.name || session.user.email" size="2xs" />
            <span class="text-sm text-default">{{ session.user.name || session.user.email }}</span>
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
