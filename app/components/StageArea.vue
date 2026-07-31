<script setup lang="ts">
import type { AgendaItem, VoteResult } from '#shared/utils/mettings';
import { computed } from 'vue';
import { AgendaItemStatusMap, MeetingStatusMap, VoteMethodMap } from '#shared/utils/mettings';
import { activeMotions, laidAsideMotions, motionMeta } from '#shared/utils/rules';
import { meetingState } from '~/utils/meetings';

const meeting = computed(() => meetingState.meeting);
const currentItem = computed(() => meeting.value.agenda.find(a => a.id === meeting.value.currentAgendaId) ?? null);
const stack = computed(() => activeMotions(meeting.value));
const laidAside = computed(() => laidAsideMotions(meeting.value));
const isChairUser = computed(() => meeting.value.profile.chair === meetingState.currentUserId);

const itemStatusMeta = {
  [AgendaItemStatusMap.PENDING]: { label: '待讨论', icon: 'i-lucide-circle', class: 'text-dimmed' },
  [AgendaItemStatusMap.DISCUSSING]: { label: '讨论中', icon: 'i-lucide-message-circle', class: 'text-primary' },
  [AgendaItemStatusMap.PASSED]: { label: '已通过', icon: 'i-lucide-check-circle-2', class: 'text-success' },
  [AgendaItemStatusMap.REJECTED]: { label: '已否决', icon: 'i-lucide-x-circle', class: 'text-error' },
} as const;

const summary = computed(() => {
  const m = meeting.value;
  return {
    motions: m.motions.length,
    votes: m.votes.length,
    passed: m.votes.filter((v: VoteResult) => v.passed).length,
    rejected: m.votes.filter((v: VoteResult) => !v.passed).length,
    agendaPassed: m.agenda.filter((a: AgendaItem) => a.status === AgendaItemStatusMap.PASSED).length,
    duration: m.startedAt ? Math.round(((m.endedAt ?? Date.now()) - m.startedAt) / 60000) : 0,
  };
});

function voteCountDisplay(vote: VoteResult): string {
  if (vote.method === VoteMethodMap.SIGNED_BALLOT) {
    return `赞成 ${vote.yea.length} / 反对 ${vote.nay.length} / 弃权 ${vote.abstain.length}`;
  }
  if (vote.method === VoteMethodMap.SECRET_BALLOT) {
    return `赞成 ${vote.yea} / 反对 ${vote.nay} / 弃权 ${vote.abstain}`;
  }
  return '';
}
</script>

<template>
  <div class="flex h-full flex-col gap-4 overflow-y-auto p-4">
    <!-- 会议结束：纪要摘要 -->
    <div v-if="meeting.status === MeetingStatusMap.ENDED" class="rounded-none border border-default bg-elevated p-5">
      <div class="flex items-center gap-2 text-lg font-semibold text-highlighted">
        <UIcon name="i-lucide-scroll-text" class="size-5" />
        会议纪要
      </div>
      <p class="mt-1 text-sm text-muted">
        「{{ meeting.profile.title }}」已结束。
      </p>
      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="rounded-none bg-muted p-3 text-center">
          <div class="text-2xl font-bold text-highlighted">
            {{ summary.motions }}
          </div>
          <div class="text-xs text-muted">
            动议总数
          </div>
        </div>
        <div class="rounded-none bg-muted p-3 text-center">
          <div class="text-2xl font-bold text-success">
            {{ summary.passed }}
          </div>
          <div class="text-xs text-muted">
            表决通过
          </div>
        </div>
        <div class="rounded-none bg-muted p-3 text-center">
          <div class="text-2xl font-bold text-error">
            {{ summary.rejected }}
          </div>
          <div class="text-xs text-muted">
            表决否决
          </div>
        </div>
        <div class="rounded-none bg-muted p-3 text-center">
          <div class="text-2xl font-bold text-highlighted">
            {{ summary.agendaPassed }}/{{ meeting.agenda.length }}
          </div>
          <div class="text-xs text-muted">
            议题通过
          </div>
        </div>
      </div>
      <div v-if="meeting.votes.length" class="mt-4 space-y-1.5">
        <div class="text-xs font-medium text-muted">
          表决记录
        </div>
        <div
          v-for="vote in meeting.votes"
          :key="vote.id"
          class="flex items-center gap-2 rounded-none bg-muted px-3 py-1.5 text-xs"
        >
          <UIcon :name="vote.passed ? 'i-lucide-check-circle-2' : 'i-lucide-x-circle'" class="size-3.5" :class="vote.passed ? 'text-success' : 'text-error'" />
          <span>#V{{ vote.id }}</span>
          <span class="text-muted">{{ vote.passed ? '通过' : '否决' }}</span>
          <span class="ml-auto text-muted">{{ voteCountDisplay(vote) }}</span>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- 当前议题 -->
      <div class="border border-default bg-elevated p-4">
        <div class="flex items-center gap-2 text-xs text-muted">
          <UIcon name="i-lucide-list-video" class="size-3.5" />
          当前议题
          <UBadge v-if="currentItem" size="sm" color="neutral" variant="subtle">
            {{ itemStatusMeta[currentItem.status].label }}
          </UBadge>
        </div>
        <template v-if="currentItem">
          <h2 class="mt-1.5 text-lg font-semibold text-highlighted">
            议题 #{{ currentItem.id }} · {{ currentItem.title }}
          </h2>
          <p class="mt-1 text-sm text-muted">
            {{ currentItem.details }}
          </p>
        </template>
        <p v-else class="mt-1.5 text-sm text-muted">
          尚未选择议题，请主持人在右侧议程中选择。
        </p>
      </div>

      <!-- 动议栈（主动议在前，附属/偶发动议追加其后） -->
      <MotionCard v-for="motion in stack" :key="motion.id" :motion="motion" />
      <div
        v-if="!stack.length && meeting.status === MeetingStatusMap.IN_PROGRESS"
        class="rounded-none border border-dashed border-default p-6 text-center text-sm text-muted h-full flex items-center justify-center"
      >
        暂无待处理动议
      </div>
      <div
        v-else-if="meeting.status === MeetingStatusMap.NOT_STARTED"
        class="rounded-none border border-dashed border-default p-6 text-center text-sm text-muted h-full flex items-center justify-center"
      >
        {{ isChairUser ? '会议未开始，请先点击顶部「开始会议」' : '会议未开始' }}
      </div>
      <div
        v-else-if="meeting.status === MeetingStatusMap.RECESSED"
        class="rounded-none border border-dashed border-default p-6 text-center text-sm text-muted h-full flex items-center justify-center"
      >
        {{ isChairUser ? '会议已休会，请先点击顶部「恢复会议」' : '会议已休会' }}
      </div>

      <!-- 已搁置动议 -->
      <div v-if="laidAside.length" class="rounded-none border border-default p-3">
        <div class="text-xs font-medium text-muted">
          已搁置的动议
        </div>
        <div class="mt-2 space-y-1.5">
          <div v-for="motion in laidAside" :key="motion.id" class="flex items-center gap-2 text-xs text-muted">
            <UIcon name="i-lucide-pause" class="size-3.5 shrink-0" />
            <span class="text-dimmed">#M{{ motion.id }}</span>
            <span class="truncate">{{ motionMeta(motion.type).label }}：{{ motion.content }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
