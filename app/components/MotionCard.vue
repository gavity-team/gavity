<script setup lang="ts">
import type { Motion, MotionCategory } from '#shared/utils/mettings';
import { MotionCategoryMap, MotionStatusMap } from '#shared/utils/mettings';

const props = defineProps<{
  motion: Motion
}>();

const meeting = computed(() => meetingState.meeting);
const meta = computed(() => motionMeta(props.motion.type));

const isChairUser = computed(() => meeting.value.profile.chair === meetingState.currentUserId);
const secondCheck = computed(() => canSecondMotion(meeting.value, meetingState.currentUserId, props.motion));
const openVoteCheck = computed(() => canOpenVote(meeting.value, meetingState.currentUserId, props.motion));
const needsRuling = computed(() => meetingState.pendingRulingMotionId === props.motion.id);
const ballotCheck = computed(() => canCastBallot(meeting.value, meetingState.currentUserId));
const myBallot = computed(() => {
  const vote = meeting.value.activeVote;
  return vote && vote.motionId === props.motion.id ? vote.ballots[meetingState.currentUserId] : undefined;
});

const voteProgress = computed(() => {
  const vote = meeting.value.activeVote;
  if (!vote || vote.motionId !== props.motion.id)
    return null;
  return { voted: Object.keys(vote.ballots).length, total: meeting.value.members.length };
});

/** 莫兰迪动议类别色，用于卡片左侧竖线。 */
const CATEGORY_COLORS: Record<MotionCategory, string> = {
  [MotionCategoryMap.MAIN]: '#6B7A8F',
  [MotionCategoryMap.SUBSIDIARY]: '#7A8B6F',
  [MotionCategoryMap.PRIVILEGED]: '#B89968',
  [MotionCategoryMap.INCIDENTAL]: '#9E6B6B',
};

function categoryColor(category: MotionCategory): string {
  return CATEGORY_COLORS[category] ?? '#000000';
}
</script>

<template>
  <div
    class="relative border border-default bg-elevated p-4 border-l-[3px]"
    :style="{ borderLeftColor: categoryColor(meta.category) }"
    :class="voteProgress && 'border-default'"
  >
    <div class="flex flex-wrap items-center gap-2">
      <UBadge color="neutral" variant="subtle">
        {{ MOTION_CATEGORY_LABELS[meta.category] }}
      </UBadge>
      <span class="font-semibold text-highlighted">{{ meta.label }}</span>
      <UBadge color="neutral" variant="soft" size="sm">
        {{ MOTION_STATUS_LABELS[motion.status] }}
      </UBadge>
      <span class="font-mono text-xs text-dimmed">#M{{ motion.id }}</span>
      <div class="flex-1" />
      <span class="text-xs text-muted">{{ formatTime(motion.createdAt) }}</span>
    </div>

    <p class="mt-2.5 text-sm text-default">
      {{ motion.content }}
    </p>
    <p v-if="motion.details" class="mt-1 text-xs text-muted">
      {{ motion.details }}
    </p>

    <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      <span class="flex items-center gap-1">
        <UIcon name="i-lucide-user-round" class="size-3.5" />
        {{ userName(motion.proposer) }} 提出
      </span>
      <span v-if="meta.needsSecond" class="flex items-center gap-1">
        <UIcon name="i-lucide-thumbs-up" class="size-3.5" />
        已获附议
      </span>
      <span class="flex items-center gap-1">
        <UIcon name="i-lucide-vote" class="size-3.5" />
        {{ thresholdLabel(meta.threshold) }}
      </span>
      <span v-if="meta.debatable" class="flex items-center gap-1">
        <UIcon name="i-lucide-messages-square" class="size-3.5" />
        可辩论
      </span>
    </div>

    <div class="mt-3 flex items-center gap-2 border-t border-muted pt-3">
      <UTooltip v-if="motion.status === MotionStatusMap.DRAFT" :text="secondCheck.ok ? '支持该动议进入讨论' : secondCheck.reason">
        <UButton
          label="附议"
          icon="i-lucide-thumbs-up"
          size="sm"
          color="primary"
          variant="solid"
          :disabled="!secondCheck.ok"
          @click="notifyError(secondMotion(motion.id))"
        />
      </UTooltip>

      <UTooltip v-if="motion.status === MotionStatusMap.PENDING && !needsRuling" :text="openVoteCheck.ok ? '对该动议发起表决' : openVoteCheck.reason">
        <UButton
          label="表决"
          icon="i-lucide-vote"
          size="sm"
          color="primary"
          variant="solid"
          :disabled="!openVoteCheck.ok"
          @click="uiState.voteMethodMotionId = motion.id"
        />
      </UTooltip>

      <!-- 主持人裁决（与投票并列） -->
      <template v-if="needsRuling && isChairUser">
        <UButton
          label="裁决成立"
          icon="i-lucide-gavel"
          size="sm"
          color="primary"
          variant="solid"
          @click="notifyError(resolveRuling(true))"
        />
        <UButton
          label="裁决不成立"
          icon="i-lucide-shield-x"
          size="sm"
          color="neutral"
          variant="outline"
          @click="notifyError(resolveRuling(false))"
        />
      </template>

      <!-- 等待裁决提示 -->
      <div v-if="needsRuling && !isChairUser" class="flex items-center gap-2 text-xs">
        <UIcon name="i-lucide-gavel" class="size-4" />
        等待主持人裁决…
      </div>

      <!-- 投票进行中 -->
      <template v-if="voteProgress">
        <UButton
          v-if="ballotCheck.ok"
          label="投票"
          icon="i-lucide-vote"
          size="sm"
          color="primary"
          variant="solid"
          @click="uiState.voteModalOpen = true"
        />
        <UButton
          v-else-if="myBallot !== undefined"
          label="已投票"
          icon="i-lucide-check-circle-2"
          size="sm"
          color="neutral"
          variant="outline"
          @click="uiState.voteModalOpen = true"
        />
        <UButton
          v-if="isChairUser || meeting.recordMode"
          label="提前结束"
          icon="i-lucide-square"
          size="sm"
          color="neutral"
          variant="outline"
          @click="notifyError(closeVote(meetingState.currentUserId))"
        />
        <span class="flex items-center gap-1 text-xs">
          <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
          {{ voteProgress.voted }}/{{ voteProgress.total }}
        </span>
      </template>
    </div>
  </div>
</template>
