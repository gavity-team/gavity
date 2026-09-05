<script setup lang="ts" generic="T">
import { useAsyncState } from '@vueuse/core';
import { notifyError } from '#imports';
import { GlobalConfig } from '#shared/utils/global-config';

const props = defineProps<{
  field: keyof GlobalConfig
}>();

const inputValue = defineModel<T | null>({ required: true });
const originalValue = defineModel<T | null>('originalValue', { required: true });
const editing = defineModel<boolean>('editing', { required: true });

function onSuccess() {
  originalValue.value = inputValue.value;
  editing.value = false;
}

const save = useAsyncState(
  () => globalThis.fetch('/api/global-config', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: props.field, value: inputValue.value }) }),
  null,
  { immediate: false, onSuccess, onError: notifyError },
);

function onSave() {
  const { error } = GlobalConfig.shape[props.field].safeParse(inputValue.value);
  if (error)
    notifyError(error.issues[0]?.message || '校验失败');
  else
    save.execute();
}

function onDiscard() {
  inputValue.value = originalValue.value;
  editing.value = false;
}

function onReset() {
  inputValue.value = null;
  save.execute();
}

defineExpose({ save });
</script>

<template>
  <div class="flex items-center gap-1 ml-2">
    <template v-if="editing">
      <UTooltip text="保存" :delay-duration="50">
        <UButton
          class="rounded-full"
          icon="i-lucide-check"
          :loading="save.isLoading.value"
          size="xs"
          @click="onSave"
        />
      </UTooltip>
      <UTooltip text="放弃" :delay-duration="50">
        <UButton
          class="rounded-full"
          :disabled="save.isLoading.value"
          variant="outline"
          color="neutral"
          icon="i-lucide-x"
          size="xs"
          @click="onDiscard"
        />
      </UTooltip>
    </template>
    <UTooltip v-else-if="inputValue !== null || save.isLoading.value" text="恢复跟随默认值" :delay-duration="50">
      <UButton
        class="rounded-full"
        variant="outline"
        color="neutral"
        icon="i-lucide-rotate-ccw"
        size="xs"
        :loading="save.isLoading.value"
        @click="onReset"
      />
    </UTooltip>
  </div>
</template>
