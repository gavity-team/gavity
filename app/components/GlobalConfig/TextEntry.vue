<script setup lang="ts">
import type { GlobalConfig } from '#shared/utils/global-config';
import { inject, ref, useTemplateRef } from 'vue';
import { DefaultGlobalConfig } from '#shared/utils/global-config';
import { GlobalConfigFormStateKey } from './utils';

const props = defineProps<{
  label: string
  field: keyof GlobalConfig
  hint?: string
}>();

const config = inject(GlobalConfigFormStateKey);
const actions = useTemplateRef('actions');
if (!config)
  throw new Error('<GlobalConfigTextEntry> must be used within <GlobalConfigForm>');
if (typeof DefaultGlobalConfig[props.field] !== 'string')
  throw new Error('<GlobalConfigTextEntry> must be used with a string field');

const defaultValue = DefaultGlobalConfig[props.field] as string;
const inputValue = ref(config[props.field] as string | null);
const editing = ref(false);

function onInput(x: string) {
  inputValue.value = x;
  editing.value = true;
}
</script>

<template>
  <UFormField orientation="horizontal" :label>
    <UInput
      class="w-64"
      :model-value="inputValue ?? defaultValue"
      :disabled="actions?.save.isLoading.value"
      @update:model-value="onInput"
    />
    <div class="flex items-center">
      <GlobalConfigEntryActions
        ref="actions"
        v-model="inputValue"
        v-model:editing="editing"
        v-model:original-value="config[props.field]"
        :field
      />
      <div v-if="hint" class="ml-2 text-xs text-gray-500">
        {{ hint }}
      </div>
    </div>
  </UFormField>
</template>
