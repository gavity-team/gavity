<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { VoteMethodMap } from '#shared/utils/mettings';
import { motionMeta, VOTE_METHOD_LABELS } from '#shared/utils/rules';
import { meetingState } from '~/utils/meetings';
import { thresholdLabel, uiState } from '~/utils/ui';

const meeting = computed(() => meetingState.meeting);
const voteId = computed(() => uiState.voteResultId);
const vote = computed(() => (voteId.value != null ? meeting.value.votes.find(v => v.id === voteId.value) : null));
const motion = computed(() => (voteId.value != null ? meeting.value.motions.find(m => m.voteId === voteId.value) : null));
const modalOpen = ref(false);

watch(voteId, (id) => {
  if (id != null) {
    uiState.voteModalOpen = false;
    modalOpen.value = true;
  }
});

function onAfterLeave(): void {
  uiState.voteResultId = null;
}

/** 记名投票的分组名单。 */
const rollCall = computed(() => {
  const v = vote.value;
  if (!v || v.method !== VoteMethodMap.SIGNED_BALLOT)
    return null;
  return [
    { label: '赞成', ids: v.yea, icon: 'i-lucide-check', iconClass: 'text-success' },
    { label: '反对', ids: v.nay, icon: 'i-lucide-x', iconClass: 'text-error' },
    { label: '弃权', ids: v.abstain, icon: 'i-lucide-minus', iconClass: 'text-muted' },
  ];
});

/** 需要展示票数统计的表决方式（记名/不记名）。 */
const tally = computed(() => {
  const v = vote.value;
  if (!v)
    return null;
  if (v.method === VoteMethodMap.SIGNED_BALLOT)
    return { yea: v.yea.length, nay: v.nay.length, abstain: v.abstain.length };
  if (v.method === VoteMethodMap.SECRET_BALLOT)
    return { yea: v.yea, nay: v.nay, abstain: v.abstain };
  return null;
});
</script>

<template>
  <UModal v-model:open="modalOpen" title="表决结果" :description="motion ? `动议 #M${motion.id} · ${motionMeta(motion.type).label}` : ''" @after:leave="onAfterLeave">
    <template #body>
      <div v-if="vote" class="space-y-4">
        <div v-if="motion" class="rounded-none bg-muted px-3 py-2 text-sm text-default">
          {{ motion.content }}
        </div>

        <UAlert
          :icon="vote.passed ? 'i-lucide-check-circle-2' : 'i-lucide-x-circle'"
          :color="vote.passed ? 'success' : 'error'"
          variant="soft"
          :title="vote.passed ? '动议通过' : '动议未通过'"
          :description="`${VOTE_METHOD_LABELS[vote.method]} · 需${thresholdLabel(vote.threshold)}通过`"
        />

        <div v-if="tally" class="grid grid-cols-3 gap-2">
          <div class="rounded-none bg-muted p-2.5 text-center">
            <div class="text-lg font-bold text-success">
              {{ tally.yea }}
            </div>
            <div class="text-xs text-muted">
              赞成
            </div>
          </div>
          <div class="rounded-none bg-muted p-2.5 text-center">
            <div class="text-lg font-bold text-error">
              {{ tally.nay }}
            </div>
            <div class="text-xs text-muted">
              反对
            </div>
          </div>
          <div class="rounded-none bg-muted p-2.5 text-center">
            <div class="text-lg font-bold text-highlighted">
              {{ tally.abstain }}
            </div>
            <div class="text-xs text-muted">
              弃权
            </div>
          </div>
        </div>

        <div v-if="rollCall" class="space-y-2">
          <div class="text-xs font-medium text-muted">
            投票情况
          </div>
          <div v-for="group in rollCall" :key="group.label" class="flex items-start gap-2 text-sm">
            <span class="flex w-14 shrink-0 items-center gap-1 text-muted">
              <UIcon :name="group.icon" class="size-3.5" :class="group.iconClass" />
              {{ group.label }}
            </span>
            <span v-if="group.ids.length" class="flex flex-wrap gap-1.5">
              <InlineUser v-for="id in group.ids" :key="id" :user-id="id" />
            </span>
            <span v-else class="text-muted">—</span>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
