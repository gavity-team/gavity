<script setup lang="ts">
import { computed } from 'vue';
import { motionMeta } from '#shared/utils/rules';
import { meetingState, resolveRuling } from '~/utils/meetings';

const meeting = computed(() => meetingState.meeting);

const motion = computed(() => {
  const id = meetingState.pendingRulingMotionId;
  return id != null ? meeting.value.motions.find(m => m.id === id) ?? null : null;
});

const open = computed({
  get: () => motion.value != null && meeting.value.profile.chair === meetingState.currentUserId,
  set: () => { /* 必须作出裁决，不允许直接关闭 */ },
});

function rule(uphold: boolean): void {
  resolveRuling(uphold);
}
</script>

<template>
  <UModal v-model:open="open" title="主持人裁决" description="有成员提出了需要主持人当场裁决的事项。" :dismissible="false">
    <template #body>
      <div v-if="motion" class="space-y-3">
        <div class="flex items-center gap-2">
          <UBadge color="secondary" variant="subtle">
            {{ motionMeta(motion.type).label }}
          </UBadge>
          <span class="text-xs text-muted"><InlineUser :user-id="motion.proposer" /> 提出</span>
        </div>
        <p class="rounded-none bg-muted px-3 py-2 text-sm text-default">
          {{ motion.content }}
        </p>
        <p v-if="motion.details" class="text-xs text-muted">
          {{ motion.details }}
        </p>
        <p class="text-xs text-muted">
          请主持人裁定该事项是否成立。成立后按议事规则处理，不成立则予以驳回。
        </p>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton label="不成立" color="neutral" variant="outline" @click="rule(false)" />
        <UButton label="裁决成立" icon="i-lucide-gavel" color="primary" variant="solid" @click="rule(true)" />
      </div>
    </template>
  </UModal>
</template>
