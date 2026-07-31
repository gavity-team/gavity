<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import { computed, reactive, ref } from 'vue';
import * as z from 'zod';
import { navigateTo } from '#app';
import { authClient } from '~/utils/auth';
import { notifyError } from '~/utils/ui';

/** useSession 返回 DeepReadonly Ref（初始值可能为 undefined），这里用 computed 取出便于模板使用。 */
const sessionState = authClient.useSession();
const session = computed(() => sessionState.value?.data ?? null);
const isPending = computed(() => sessionState.value?.isPending ?? true);

const createSchema = z.object({
  title: z.string(),
});
const joinSchema = z.object({
  code: z.string().min(1, '请输入入会码'),
});

type CreateSchema = z.output<typeof createSchema>;
type JoinSchema = z.output<typeof joinSchema>;

const createOpen = ref(false);
const createState = reactive<CreateSchema>({ title: '' });
const creating = ref(false);
const joinOpen = ref(false);
const joinState = reactive<JoinSchema>({ code: '' });
const joining = ref(false);

async function onCreate(event: FormSubmitEvent<CreateSchema>): Promise<void> {
  if (creating.value)
    return;
  creating.value = true;
  try {
    const res = await $fetch<{ id: number, code: string, title: string }>('/api/meetings', {
      method: 'POST',
      body: { title: event.data.title.trim() },
    });
    await navigateTo(`/meetings/${res.id}`);
  } catch {
    notifyError('创建会议失败，请稍后重试');
  } finally {
    creating.value = false;
  }
}

async function onJoin(event: FormSubmitEvent<JoinSchema>): Promise<void> {
  joining.value = true;
  try {
    const res = await $fetch<{ id: number }>('/api/meetings/resolve', {
      query: { code: event.data.code.trim() },
    });
    await navigateTo(`/meetings/${res.id}`);
  } catch {
    notifyError('入会码无效或已失效');
  }
  joining.value = false;
}
</script>

<template>
  <main class="flex flex-1 items-center justify-center p-4">
    <div v-if="isPending" class="flex items-center gap-2 text-muted">
      <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
      加载中…
    </div>

    <div v-else class="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
      <div class="flex items-center justify-between gap-4 border border-default bg-elevated p-5 sm:col-span-2">
        <div>
          <div class="flex items-center gap-2 text-base font-semibold text-highlighted">
            <UIcon name="i-lucide-users" class="size-5" />
            多人会议
          </div>
          <p class="mt-1 text-sm text-muted">
            {{ session?.user ? '通过入会码加入会议，或者创建会议。' : '登录后可创建或加入多人会议。' }}
          </p>
        </div>
        <div class="flex shrink-0 gap-2">
          <UTooltip text="请先登录" :disabled="!!session?.user">
            <span class="inline-flex">
              <UButton
                label="加入会议"
                icon="i-lucide-log-in"
                color="neutral"
                variant="outline"
                size="lg"
                :disabled="!session?.user"
                @click="joinOpen = true"
              />
            </span>
          </UTooltip>
          <UTooltip text="请先登录" :disabled="!!session?.user">
            <span class="inline-flex">
              <UButton
                label="创建会议"
                icon="i-lucide-plus"
                size="lg"
                :disabled="!session?.user"
                @click="createOpen = true"
              />
            </span>
          </UTooltip>
        </div>
      </div>

      <div class="flex items-center justify-between gap-4 border border-default bg-elevated p-5 sm:col-span-2">
        <div>
          <div class="flex items-center gap-2 text-base font-semibold text-highlighted">
            <UIcon name="i-lucide-play-circle" class="size-5" />
            单人演示
          </div>
          <p class="mt-1 text-sm text-muted">
            无需登录，与模拟与会者体验完整议事流程（发言权、动议、附议、表决）。
          </p>
        </div>
        <UButton
          to="/demo"
          label="进入演示"
          icon="i-lucide-play"
          color="neutral"
          variant="outline"
          size="lg"
          class="shrink-0"
        />
      </div>
    </div>

    <UModal
      v-model:open="createOpen"
      title="创建会议"
      description="创建后分享入会码，与会者凭码加入。"
      :ui="{ footer: 'justify-end' }"
      @after:leave="createState.title = ''"
    >
      <template #body>
        <UForm id="create-meeting-form" :schema="createSchema" :state="createState" @submit="onCreate">
          <UFormField name="title" label="会议标题" hint="可选">
            <UInput v-model="createState.title" placeholder="例如：2026 年第三季度理事会" class="w-full" />
          </UFormField>
        </UForm>
      </template>
      <template #footer="{ close }">
        <UButton label="取消" color="neutral" variant="outline" @click="close" />
        <UButton
          type="submit"
          form="create-meeting-form"
          label="创建会议"
          icon="i-lucide-plus"
          :loading="creating"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="joinOpen"
      title="加入会议"
      :ui="{ footer: 'justify-end' }"
      @after:leave="joinState.code = ''"
    >
      <template #body>
        <UForm id="join-meeting-form" :schema="joinSchema" :state="joinState" @submit="onJoin">
          <UFormField name="code" label="入会码" required>
            <UInput v-model="joinState.code" placeholder="3B82F6" class="w-full" />
          </UFormField>
        </UForm>
      </template>
      <template #footer="{ close }">
        <UButton label="取消" color="neutral" variant="outline" @click="close" />
        <UButton
          type="submit"
          form="join-meeting-form"
          label="加入会议"
          :loading="joining"
        />
      </template>
    </UModal>
  </main>
</template>
