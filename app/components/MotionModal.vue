<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui';
import type { MotionType } from '#shared/utils/mettings';
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js';
import { computed, reactive } from 'vue';
import * as z from 'zod';
import { motionMeta } from '#shared/utils/rules';
import { meetingState, proposeMotion } from '~/utils/meetings';
import { notifyError, thresholdLabel, uiState } from '~/utils/ui';

const toast = useToast();

const schema = z.object({
  type: z.int({ error: '请选择动议类型' }),
  content: z.string().min(1, '请填写动议内容'),
  details: z.string(),
});

type Schema = z.output<typeof schema>;

const state = reactive<{ type?: MotionType, content: string, details: string }>({
  type: undefined,
  content: '',
  details: '',
});

const meeting = computed(() => meetingState.meeting);

/** 无发言权时禁用需要发言权的类型；记录模式解除限制。 */
const noFloor = computed(() => !meeting.value.recordMode && meeting.value.floorHolder !== meetingState.currentUserId);

const selectedMeta = computed(() => (state.type != null ? motionMeta(state.type as MotionType) : null));

function onSubmit(event: FormSubmitEvent<Schema>): void {
  const err = proposeMotion({
    type: event.data.type as MotionType,
    content: event.data.content,
    details: event.data.details,
  });
  if (err) {
    notifyError(err);
    return;
  }
  toast.add({ title: '动议已提交', color: 'success', icon: 'i-lucide-check-circle-2' });
  uiState.motionModalOpen = false;
  state.type = undefined;
  state.content = '';
  state.details = '';
}
</script>

<template>
  <UModal v-model:open="uiState.motionModalOpen" title="提出动议" :ui="{ footer: 'justify-end' }">
    <template #body>
      <UForm id="motion-form" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField name="type" label="动议类型" required>
          <MotionTypeSelect v-model="state.type" :no-floor="noFloor" class="w-full" />
        </UFormField>

        <div v-if="selectedMeta" class="space-y-1.5 rounded-none bg-muted px-3 py-2 text-xs text-muted">
          <p>{{ selectedMeta.description }}</p>
          <div class="flex flex-wrap gap-1.5">
            <UBadge size="sm" color="neutral" variant="subtle">
              {{ selectedMeta.needsFloor ? '需要发言权' : '无需发言权' }}
            </UBadge>
            <UBadge v-if="selectedMeta.chairRules" size="sm" color="neutral" variant="subtle">
              由主持人裁决
            </UBadge>
            <UBadge v-else-if="selectedMeta.needsSecond" size="sm" color="neutral" variant="subtle">
              需要附议
            </UBadge>
            <UBadge v-if="!selectedMeta.chairRules" size="sm" color="neutral" variant="subtle">
              {{ thresholdLabel(selectedMeta.threshold) }}
            </UBadge>
            <UBadge size="sm" color="neutral" variant="subtle">
              {{ selectedMeta.debatable ? '可辩论' : '不可辩论' }}
            </UBadge>
          </div>
        </div>

        <UFormField name="content" label="动议内容" required>
          <UTextarea v-model="state.content" :rows="2" autoresize placeholder="例如：通过 2025 年度财务报告" class="w-full" />
        </UFormField>

        <UFormField name="details" label="说明" hint="可选">
          <UTextarea v-model="state.details" :rows="2" autoresize placeholder="补充背景、理由或具体条款" class="w-full" />
        </UFormField>
      </UForm>
    </template>
    <template #footer="{ close }">
      <UButton label="取消" color="neutral" variant="outline" @click="close" />
      <UButton type="submit" form="motion-form" label="提交动议" icon="i-lucide-send" color="primary" variant="solid" />
    </template>
  </UModal>
</template>
