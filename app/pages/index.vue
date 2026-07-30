<script setup lang="ts">
/** useSession 返回 DeepReadonly Ref（初始值可能为 undefined），这里用 computed 取出便于模板使用。 */
const sessionState = authClient.useSession();
const session = computed(() => sessionState.value?.data ?? null);
const isPending = computed(() => sessionState.value?.isPending ?? true);

const createTitle = ref('');
const creating = ref(false);
const joinCode = ref('');
const joining = ref(false);

async function onCreate(): Promise<void> {
  if (creating.value)
    return;
  creating.value = true;
  try {
    const res = await $fetch<{ id: number, code: string, title: string }>('/api/meetings', {
      method: 'POST',
      body: { title: createTitle.value },
    });
    await navigateTo(`/meetings/${res.id}`);
  } catch {
    notifyError('创建会议失败，请稍后重试');
  } finally {
    creating.value = false;
  }
}

async function onJoin(): Promise<void> {
  // 支持直接粘贴会议链接（末段为会议 ID）或输入入会码
  const raw = joinCode.value.trim().split('/').filter(Boolean).pop() ?? '';
  if (!raw || joining.value)
    return;
  if (/^\d+$/.test(raw))
    return void await navigateTo(`/meetings/${raw}`);
  joining.value = true;
  try {
    const res = await $fetch<{ id: number }>('/api/meetings/resolve', { query: { code: raw } });
    await navigateTo(`/meetings/${res.id}`);
  } catch {
    notifyError('入会码无效或已失效');
  } finally {
    joining.value = false;
  }
}

async function onSignOut(): Promise<void> {
  await authClient.signOut();
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-default">
    <header class="flex h-14 items-center gap-2.5 border-b border-default px-4 shrink-0">
      <div class="flex size-8 items-center justify-center bg-primary text-inverted">
        <UIcon name="i-lucide-gavel" class="size-5" />
      </div>
      <div class="text-sm font-semibold text-highlighted">
        Gavity
      </div>
      <div class="flex-1" />
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
      <UColorModeButton color="neutral" variant="outline" size="sm" />
    </header>

    <main class="flex flex-1 items-center justify-center p-4">
      <div v-if="isPending" class="flex items-center gap-2 text-muted">
        <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
        加载中…
      </div>

      <div v-else class="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        <!-- 多人会议 -->
        <div class="border border-default bg-elevated p-5 sm:col-span-2">
          <div class="flex items-center gap-2 text-base font-semibold text-highlighted">
            <UIcon name="i-lucide-users" class="size-5" />
            多人会议
          </div>
          <template v-if="session?.user">
            <p class="mt-1 text-sm text-muted">
              创建会议后分享入会码，与会者凭码加入。
            </p>
            <form class="mt-4 flex gap-2" @submit.prevent="onCreate">
              <UInput
                v-model="createTitle"
                placeholder="会议标题（可选）"
                class="flex-1"
                size="lg"
              />
              <UButton
                type="submit"
                label="创建会议"
                icon="i-lucide-plus"
                size="lg"
                :loading="creating"
              />
            </form>
            <div class="my-4 flex items-center gap-3 text-xs text-dimmed">
              <USeparator class="flex-1" />
              或
              <USeparator class="flex-1" />
            </div>
            <form class="flex gap-2" @submit.prevent="onJoin">
              <UInput
                v-model="joinCode"
                placeholder="输入入会码或粘贴会议链接"
                class="flex-1"
                size="lg"
              />
              <UButton
                type="submit"
                label="加入会议"
                icon="i-lucide-log-in"
                color="neutral"
                variant="outline"
                size="lg"
                :loading="joining"
                :disabled="!joinCode.trim()"
              />
            </form>
          </template>
          <template v-else>
            <p class="mt-1 text-sm text-muted">
              登录后可创建或加入多人实时会议。
            </p>
            <div class="mt-4 flex gap-2">
              <UButton
                to="/login"
                label="邮箱登录"
                icon="i-lucide-mail"
                size="lg"
              />
              <UButton
                to="/login?mode=register"
                label="注册账号"
                icon="i-lucide-user-plus"
                color="neutral"
                variant="outline"
                size="lg"
              />
            </div>
          </template>
        </div>

        <!-- 单人演示 -->
        <div class="border border-default bg-elevated p-5 sm:col-span-2">
          <div class="flex items-center gap-2 text-base font-semibold text-highlighted">
            <UIcon name="i-lucide-play-circle" class="size-5" />
            单人演示
          </div>
          <p class="mt-1 text-sm text-muted">
            无需登录，与模拟与会者体验完整议事流程（发言权、动议、附议、表决）。
          </p>
          <UButton
            to="/demo"
            label="进入演示"
            icon="i-lucide-play"
            color="neutral"
            variant="outline"
            size="lg"
            class="mt-4"
          />
        </div>
      </div>
    </main>
  </div>
</template>
