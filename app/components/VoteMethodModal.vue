<script setup lang="ts">
import type { VoteMethod } from '#shared/utils/mettings';
import { VoteMethodMap } from '#shared/utils/mettings';

const meeting = computed(() => meetingState.meeting);
const motionId = computed(() => uiState.voteMethodMotionId);
const motion = computed(() => (motionId.value != null ? meeting.value.motions.find(m => m.id === motionId.value) : null));
const modalOpen = ref(false);

const selected = ref<VoteMethod | null>(null);

watch(motionId, (id) => {
  if (id != null)
    modalOpen.value = true;
});

function onAfterLeave(): void {
  uiState.voteMethodMotionId = null;
  selected.value = null;
}

const options = [
  { value: VoteMethodMap.UNANIMOUS, label: VOTE_METHOD_LABELS[VoteMethodMap.UNANIMOUS], icon: 'i-lucide-handshake', description: '无人反对，直接宣布通过' },
  { value: VoteMethodMap.VOICE, label: VOTE_METHOD_LABELS[VoteMethodMap.VOICE], icon: 'i-lucide-megaphone', description: '口头表态，主持人判定并宣布结果' },
  { value: VoteMethodMap.SIGNED_BALLOT, label: VOTE_METHOD_LABELS[VoteMethodMap.SIGNED_BALLOT], icon: 'i-lucide-file-signature', description: '成员在线投票，结果公开投票情况' },
  { value: VoteMethodMap.SECRET_BALLOT, label: VOTE_METHOD_LABELS[VoteMethodMap.SECRET_BALLOT], icon: 'i-lucide-eye-off', description: '成员在线投票，仅公开票数统计' },
];

function run(result: string | null): void {
  if (result) {
    notifyError(result);
    return;
  }
  modalOpen.value = false;
}

function declare(passed: boolean): void {
  if (motionId.value == null || selected.value == null)
    return;
  run(declareVote(motionId.value, selected.value, passed));
}

function startBallot(): void {
  if (motionId.value == null || selected.value == null)
    return;
  run(openVote(motionId.value, selected.value));
}
</script>

<template>
  <UModal v-model:open="modalOpen" title="发起表决" :description="motion ? `动议 #M${motion.id} · ${motionMeta(motion.type).label}` : ''" :ui="{ footer: 'justify-end' }" @after:leave="onAfterLeave">
    <template #body>
      <div v-if="motion" class="space-y-4">
        <div class="rounded-none bg-muted px-3 py-2 text-sm text-default">
          {{ motion.content }}
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="opt in options"
            :key="opt.value"
            type="button"
            class="flex flex-col items-start gap-1 rounded-none border-2 px-3 py-3 text-left transition-colors"
            :class="selected === opt.value
              ? 'border-primary bg-accented'
              : 'border-default hover:border-accented hover:bg-elevated'"
            @click="selected = opt.value"
          >
            <span class="flex items-center gap-1.5 text-sm font-medium" :class="selected === opt.value ? 'text-highlighted' : 'text-default'">
              <UIcon :name="opt.icon" class="size-4" />
              {{ opt.label }}
            </span>
            <span class="text-xs text-muted">{{ opt.description }}</span>
          </button>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        v-if="selected === VoteMethodMap.UNANIMOUS"
        label="宣布通过"
        icon="i-lucide-check"
        color="primary"
        variant="solid"
        @click="declare(true)"
      />
      <template v-else-if="selected === VoteMethodMap.VOICE">
        <UButton
          label="宣布否决"
          icon="i-lucide-x"
          color="neutral"
          variant="outline"
          @click="declare(false)"
        />
        <UButton
          label="宣布通过"
          icon="i-lucide-check"
          color="primary"
          variant="solid"
          @click="declare(true)"
        />
      </template>
      <UButton
        v-else
        label="开始投票"
        icon="i-lucide-vote"
        color="primary"
        variant="solid"
        :disabled="selected == null"
        @click="startBallot"
      />
    </template>
  </UModal>
</template>
