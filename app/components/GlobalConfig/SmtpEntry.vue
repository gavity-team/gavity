<script setup lang="ts">
import type { GlobalConfig } from '#shared/utils/global-config';
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js';
import { inject, ref, useTemplateRef } from 'vue';
import * as z from 'zod';
import { DefaultGlobalConfig } from '#shared/utils/global-config';
import { showToast } from '~/utils/ui';
import { GlobalConfigFormStateKey } from './utils';

const props = defineProps<{
  label: string
  field: keyof GlobalConfig
}>();

const toast = useToast();
const form = useTemplateRef('form');
const actions = useTemplateRef('actions');

const config = inject(GlobalConfigFormStateKey);
if (!config)
  throw new Error('<GlobalConfigSmtpEntry> must be used within <GlobalConfigForm>');
if (typeof DefaultGlobalConfig.smtpUrl !== 'string')
  throw new Error('<GlobalConfigSmtpEntry> must be used with a string field');

const defaultValue = DefaultGlobalConfig[props.field] as string;
const inputValue = ref(config[props.field] as string | null);
const editing = ref(false);

const FormData = z.object({
  hostname: z.string().default(''),
  port: z.int().default(465),
  username: z.string().default(''),
  password: z.string().default(''),
  tls: z.boolean().default(false),
});
type FormData = z.infer<typeof FormData>;

const formData = ref(FormData.parse({}));
const showModal = ref(false);

function onFormSubmit() {
  inputValue.value = toSmtpUrl(formData.value);
  editing.value = true;
  actions.value?.save.execute();
  showModal.value = false;
  showToast(toast, 'success', 'SMTP 配置已保存');
}

function toSmtpUrl(config: FormData): string {
  const url = new URL((config.tls || config.port === 465) ? 'smtps://' : 'smtp://');
  url.hostname = config.hostname;
  url.port = String(config.port);
  url.username = config.username;
  url.password = config.password;
  return url.href;
}

function onInput(value: string) {
  inputValue.value = value;
  editing.value = true;
}
</script>

<template>
  <UFormField orientation="horizontal" :label>
    <UFieldGroup>
      <UInput
        class="w-64"
        type="password"
        :model-value="inputValue ?? defaultValue"
        :disabled="actions?.save.isLoading.value"
        @update:model-value="onInput"
      />
      <UButton
        variant="outline"
        color="neutral"
        size="xs"
        @click="showModal = true"
      >
        快速配置
      </UButton>
    </UFieldGroup>
    <GlobalConfigEntryActions
      ref="actions"
      v-model="inputValue"
      v-model:editing="editing"
      v-model:original-value="config.smtpUrl"
      field="smtpUrl"
    />
  </UFormField>

  <UModal
    v-model:open="showModal"
    title="SMTP 配置"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UForm ref="form" class="space-y-2" :schema="FormData" :state="formData" @submit="onFormSubmit">
        <UFormField field="hostname" label="主机" orientation="horizontal">
          <UInput v-model="formData.hostname" placeholder="smtp.gmail.com" />
        </UFormField>
        <UFormField field="port" label="端口" orientation="horizontal">
          <UInput v-model="formData.port" type="number" placeholder="465" />
        </UFormField>
        <UFormField field="username" label="用户名" orientation="horizontal">
          <UInput v-model="formData.username" placeholder="username" />
        </UFormField>
        <UFormField field="password" label="密码" orientation="horizontal">
          <UInput v-model="formData.password" type="password" placeholder="password" />
        </UFormField>
        <UFormField
          v-if="formData.port !== 465"
          field="tls"
          label="启用 TLS"
          orientation="horizontal"
          :ui="{ root: 'items-center' }"
        >
          <USwitch v-model="formData.tls" />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <UButton @click="form?.submit?.()">
        保存
      </UButton>
      <UButton color="neutral" variant="outline" @click="showModal = false">
        取消
      </UButton>
    </template>
  </UModal>
</template>
