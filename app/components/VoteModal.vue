<script setup lang="ts">
import type { Ballot } from '#shared/utils/mettings';
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js';
import { computed, onUnmounted, ref, watch } from 'vue';
import { BallotMap } from '#shared/utils/mettings';
import { motionMeta, VOTE_METHOD_LABELS } from '#shared/utils/rules';
import { castBallot, closeVote, meetingState } from '~/utils/meetings';
import { notifyError, thresholdLabel, uiState } from '~/utils/ui';

const toast = useToast();

const meeting = computed(() => meetingState.meeting);
const vote = computed(() => meeting.value.activeVote);
const motion = computed(() => (vote.value ? meeting.value.motions.find(m => m.id === vote.value!.motionId) : null));

const selected = ref<Ballot | null>(null);
const now = ref(Date.now());
let clock: ReturnType<typeof setInterval> | null = null;

const myBallot = computed(() => vote.value?.ballots[meetingState.currentUserId]);
const votedCount = computed(() => Object.keys(vote.value?.ballots ?? {}).length);
const totalCount = computed(() => meeting.value.members.length);
const elapsed = computed(() => Math.floor((now.value - (vote.value?.startedAt ?? now.value)) / 1000));

const thresholdLabelText = computed(() => {
  if (!vote.value)
    return '';
  return `${VOTE_METHOD_LABELS[vote.value.method]} · 需${thresholdLabel(vote.value.threshold)}通过`;
});

const isChairUser = computed(() => meeting.value.profile.chair === meetingState.currentUserId);

const options = [
  { value: BallotMap.YEA, label: '赞成', icon: 'i-lucide-check', iconClass: 'text-success' },
  { value: BallotMap.NAY, label: '反对', icon: 'i-lucide-x', iconClass: 'text-error' },
  { value: BallotMap.ABSTAIN, label: '弃权', icon: 'i-lucide-minus', iconClass: 'text-muted' },
];

watch(vote, (v) => {
  selected.value = null;
  if (v && !clock) {
    now.value = Date.now();
    clock = setInterval(() => {
      now.value = Date.now();
    }, 1000);
  } else if (!v && clock) {
    clearInterval(clock);
    clock = null;
  }
}, { immediate: true });

onUnmounted(() => {
  if (clock)
    clearInterval(clock);
});

function confirm(): void {
  if (selected.value == null)
    return;
  const err = castBallot(selected.value);
  if (err) {
    notifyError(err);
    return;
  }
  toast.add({ title: '您的投票已提交', color: 'success', icon: 'i-lucide-check-circle-2' });
  selected.value = null;
  uiState.voteModalOpen = false;
}

function closeEarly(): void {
  notifyError(closeVote(meetingState.currentUserId));
}
</script>

<template>
  <UModal v-model:open="uiState.voteModalOpen" title="投票表决" :description="motion ? `动议 #M${motion.id} · ${motionMeta(motion.type).label}` : ''" :ui="{ footer: 'justify-between' }">
    <template #body>
      <div v-if="vote && motion" class="space-y-4">
        <div class="rounded-none bg-muted px-3 py-2 text-sm text-default">
          {{ motion.content }}
        </div>

        <div class="flex items-center justify-between text-xs text-muted">
          <span>{{ thresholdLabelText }}</span>
          <span class="flex items-center gap-1">
            <UIcon name="i-lucide-timer" class="size-3.5" />
            已进行 {{ elapsed }} 秒
          </span>
        </div>

        <template v-if="myBallot === undefined">
          <div class="grid grid-cols-3 gap-2">
            <UButton
              v-for="opt in options"
              :key="opt.value"
              color="neutral"
              variant="ghost"
              class="flex-col items-center gap-1.5 rounded-none border-2 px-3 py-4"
              :class="selected === opt.value
                ? 'border-primary bg-accented hover:bg-accented'
                : 'border-default hover:border-accented'"
              @click="selected = opt.value"
            >
              <UIcon :name="opt.icon" class="size-6" :class="opt.iconClass" />
              <span class="text-sm font-medium" :class="selected === opt.value ? 'text-highlighted' : 'text-default'">
                {{ opt.label }}
              </span>
            </UButton>
          </div>
        </template>
        <UAlert
          v-else
          icon="i-lucide-check-circle-2"
          color="success"
          variant="soft"
          title="您已投票"
          description="等待其他成员完成投票，或等待主持人结束投票。"
        />

        <UProgress :model-value="votedCount" :max="totalCount" size="sm" />
        <div class="text-right text-xs text-muted">
          已投票 {{ votedCount }}/{{ totalCount }} 人
        </div>
      </div>
      <UEmpty v-else icon="i-lucide-vote" title="当前没有进行中的投票" description="主持人发起表决后，这里将显示表决内容。" />
    </template>

    <template #footer>
      <div>
        <UButton
          v-if="vote && (isChairUser || meeting.recordMode)"
          label="提前结束投票"
          color="neutral"
          variant="outline"
          size="sm"
          @click="closeEarly"
        />
      </div>
      <div class="flex gap-2">
        <UButton
          v-if="vote && myBallot === undefined"
          label="确认投票"
          color="primary"
          variant="solid"
          :disabled="selected == null"
          @click="confirm"
        />
      </div>
    </template>
  </UModal>
</template>
