<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import { computed, reactive, ref, watch } from 'vue';
import * as z from 'zod';
import { useHead } from '#imports';
import { authClient } from '~/utils/auth';

useHead({ title: '个人主页' });

const sessionState = authClient.useSession();
const session = computed(() => sessionState.value?.data ?? null);

const profileSchema = z.object({
  name: z.string().trim().min(1, '请输入姓名').max(100),
});
const profile = reactive({ name: '' });
const profileLoading = ref(false);
async function saveProfile(event: FormSubmitEvent<{ name: string }>) {
  profileLoading.value = true;
  const result = await authClient.updateUser({ name: event.data.name });
  profileLoading.value = false;
  if (result.error)
    throw result.error;
}

const emailSchema = z.object({
  email: z.email('请输入有效邮箱'),
});
const email = reactive({ email: '' });
const emailLoading = ref(false);
async function changeEmail(event: FormSubmitEvent<{ email: string }>) {
  emailLoading.value = true;
  const result = await authClient.changeEmail({ newEmail: event.data.email, callbackURL: '/profile' });
  emailLoading.value = false;
  if (result.error)
    throw result.error;
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, '请输入当前密码'),
  newPassword: z.string().min(8, '密码至少 8 位'),
});
const password = reactive({ currentPassword: '', newPassword: '' });
const passwordLoading = ref(false);
async function changePassword(event: FormSubmitEvent<{ currentPassword: string, newPassword: string }>) {
  passwordLoading.value = true;
  const result = await authClient.changePassword({ ...event.data, revokeOtherSessions: true });
  passwordLoading.value = false;
  if (result.error)
    throw result.error;
  password.currentPassword = '';
  password.newPassword = '';
}

watch(session, (value) => {
  if (value?.user) {
    profile.name = value.user.name;
    email.email = value.user.email;
  }
}, { immediate: true });
</script>

<template>
  <main class="space-y-6 p-6 sm:p-8">
    <h1 class="text-2xl font-semibold">
      账号与安全
    </h1>

    <UCard title="基本资料">
      <UForm :schema="profileSchema" :state="profile" class="space-y-4" @submit="saveProfile">
        <UFormField name="name" label="昵称" orientation="horizontal">
          <UInput v-model="profile.name" class="w-64" />
        </UFormField>
        <UButton type="submit" :loading="profileLoading">
          保存
        </UButton>
      </UForm>
    </UCard>

    <UCard title="修改邮箱">
      <UForm :schema="emailSchema" :state="email" class="space-y-4" @submit="changeEmail">
        <UFormField name="email" label="邮箱" orientation="horizontal">
          <UInput v-model="email.email" type="email" class="w-80" />
        </UFormField>
        <UButton type="submit" label="发送验证邮件" :loading="emailLoading" />
      </UForm>
    </UCard>

    <UCard title="重置密码">
      <UForm :schema="passwordSchema" :state="password" class="space-y-4" @submit="changePassword">
        <UFormField name="currentPassword" label="当前密码" orientation="horizontal">
          <UInput v-model="password.currentPassword" type="password" class="w-64" />
        </UFormField>
        <UFormField name="newPassword" label="新密码" orientation="horizontal">
          <UInput v-model="password.newPassword" type="password" class="w-64" />
        </UFormField>
        <UButton type="submit" label="更新密码" :loading="passwordLoading" />
      </UForm>
    </UCard>
  </main>
</template>
