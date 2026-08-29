<script setup lang="ts">
import type { GlobalConfig } from '#shared/utils/global-config';
import { inject, ref, useTemplateRef } from 'vue';
import { DefaultGlobalConfig } from '#shared/utils/global-config';
import { GlobalConfigFormStateKey } from './utils';

const props = defineProps<{
  label: string
  field: keyof GlobalConfig
}>();

const actions = useTemplateRef('actions');
const config = inject(GlobalConfigFormStateKey);
if (!config)
  throw new Error('<GlobalConfigTextEntry> must be used within <GlobalConfigForm>');
if (typeof DefaultGlobalConfig[props.field] !== 'boolean')
  throw new Error('<GlobalConfigTextEntry> must be used with a boolean field');

const defaultValue = DefaultGlobalConfig[props.field] as boolean;
const inputValue = ref(config[props.field] as boolean | null);
const editing = ref(false);

function onInput(x: boolean) {
  inputValue.value = x;
  editing.value = true;
}
</script>

<template>
  <UFormField
    orientation="horizontal"
    :label
    :ui="{ root: 'items-center' }"
  >
    <USwitch
      class="p-1"
      :disabled="actions?.save.isLoading.value"
      :model-value="inputValue ?? defaultValue"
      @update:model-value="onInput"
    />
    <GlobalConfigEntryActions
      ref="actions"
      v-model="inputValue"
      v-model:editing="editing"
      v-model:original-value="config[props.field]"
      :field
    />
  </UFormField>
</template>
