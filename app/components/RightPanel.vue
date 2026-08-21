<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import { formatLogSegments, logUserRefs } from '#shared/utils/meeting-engine';
import { AgendaItemStatusMap, MeetingStatusMap } from '#shared/utils/mettings';
import { canGrabFloor, canSwitchAgenda, roleOf } from '#shared/utils/rules';
import { endFloor, formatTime, grabFloor, meetingState, switchAgenda } from '~/utils/meetings';
import { notifyError, uiState } from '~/utils/ui';
import { ensureUsers } from '~/utils/users';

const meeting = computed(() => meetingState.meeting);
const selfId = computed(() => meetingState.currentUserId);

const isObserver = computed(() => roleOf(meeting.value, selfId.value) === 'observer');

const grabCheck = computed(() => canGrabFloor(meeting.value, selfId.value));
const holdingFloor = computed(() => meeting.value.floorHolder === selfId.value);

/** 发言权倒计时（秒）。 */
const floorCountdown = ref(0);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

watch(
  () => meeting.value.floorGrabAt,
  (grabAt) => {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if (grabAt == null) {
      floorCountdown.value = 0;
      return;
    }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((grabAt - Date.now()) / 1000));
      floorCountdown.value = remaining;
      if (remaining <= 0 && countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
      }
    };
    tick();
    countdownTimer = setInterval(tick, 200);
  },
  { immediate: true },
);

onUnmounted(() => {
  if (countdownTimer)
    clearInterval(countdownTimer);
});

const canSwitchInfo = computed(() => canSwitchAgenda(meeting.value, selfId.value));

const itemStatusMeta = {
  [AgendaItemStatusMap.PENDING]: { label: '待讨论', icon: 'i-lucide-circle', class: 'text-dimmed' },
  [AgendaItemStatusMap.DISCUSSING]: { label: '讨论中', icon: 'i-lucide-message-circle', class: 'text-primary' },
  [AgendaItemStatusMap.PASSED]: { label: '已通过', icon: 'i-lucide-check-circle-2', class: 'text-success' },
  [AgendaItemStatusMap.REJECTED]: { label: '已否决', icon: 'i-lucide-x-circle', class: 'text-error' },
} as const;

/** 当前可执行操作的状态提示。 */
const hint = computed(() => {
  const m = meeting.value;
  if (isObserver.value)
    return undefined;
  if (m.recordMode)
    return '记录模式：所有操作限制已解除';
  switch (m.status) {
    case MeetingStatusMap.NOT_STARTED:
      return '会议尚未开始';
    case MeetingStatusMap.VOTING:
      return '投票进行中，请在动议卡片中投票';
    case MeetingStatusMap.RECESSED:
      return '会议休会中';
    case MeetingStatusMap.ENDED:
      return '会议已结束';
    default:
      break;
  }
  if (holdingFloor.value)
    return '你持有发言权，可以提出动议或结束发言';
  if (floorCountdown.value > 0)
    return `发言权将在 ${floorCountdown.value} 秒后开放请求`;
  if (grabCheck.value.ok)
    return '无人发言，可以请求发言权';
  return '请认真聆听当前发言';
});

function onGrabClick(): void {
  if (holdingFloor.value)
    notifyError(endFloor());
  else notifyError(grabFloor());
}

function onSwitch(itemId: number): void {
  notifyError(switchAgenda(itemId));
}

const logListRef = useTemplateRef('logList');

/** 结构化日志的渲染段（用户引用以 InlineUser 胶囊内嵌）。 */
const logLines = computed(() => meetingState.logs.map(l => ({
  id: l.id,
  icon: l.icon,
  at: l.at,
  segments: formatLogSegments(l),
})));

watch(
  () => meetingState.logs.length,
  () => ensureUsers(meetingState.logs.flatMap(logUserRefs)),
  { immediate: true },
);

watch(
  () => meetingState.logs.length,
  async () => {
    await nextTick();
    const el = logListRef.value;
    if (el)
      el.scrollTop = el.scrollHeight;
  },
  { flush: 'post' },
);
</script>

<template>
  <aside class="flex h-full flex-col w-85 shrink-0 border-s border-default">
    <!-- 议程列表 -->
    <div class="flex min-h-0 flex-1 flex-col">
      <div class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted">
        <UIcon name="i-lucide-list-checks" class="size-3.5" />
        议程
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <UButton
          v-for="item in meeting.agenda"
          :key="item.id"
          color="neutral"
          variant="ghost"
          :disabled="!canSwitchInfo.ok"
          :title="canSwitchInfo.reason"
          class="w-full gap-2.5 rounded-none px-2.5 py-2 text-left"
          :class="item.id === meeting.currentAgendaId ? 'bg-accented hover:bg-accented' : ''"
          @click="onSwitch(item.id)"
        >
          <UIcon :name="itemStatusMeta[item.status]?.icon ?? 'i-lucide-circle'" class="size-4 shrink-0" :class="itemStatusMeta[item.status]?.class" />
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm flex items-center" :class="item.id === meeting.currentAgendaId ? 'font-medium text-highlighted' : 'text-default'">
              {{ item.title }}
              <UIcon v-if="item.isSpecial" size="sm" name="i-lucide-star" class="ml-1 text-primary" />
            </div>
            <div v-if="item.scheduledAt" class="text-xs text-dimmed">
              预定 {{ new Date(item.scheduledAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
            </div>
          </div>
          <span class="text-xs text-dimmed">{{ itemStatusMeta[item.status].label }}</span>
        </UButton>
      </div>
    </div>

    <!-- 实时日志 -->
    <div class="flex min-h-0 flex-1 flex-col border-t border-default">
      <div class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted">
        <UIcon name="i-lucide-activity" class="size-3.5" />
        实时日志
      </div>
      <div ref="logList" class="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
        <div v-if="!meetingState.logs.length" class="rounded-none border border-dashed border-default p-3 text-center text-xs text-dimmed flex h-full items-center justify-center">
          暂无日志
        </div>
        <div
          v-for="line in logLines"
          :key="line.id"
          class="flex items-start gap-1.5 text-xs leading-relaxed"
        >
          <UIcon :name="line.icon" class="mt-0.5 size-3.5 shrink-0 text-dimmed" />
          <div class="min-w-0 flex-1">
            <span class="text-dimmed">{{ formatTime(line.at) }}</span>
            <span class="ml-1 text-dimmed">
              <template v-for="(seg, j) in line.segments" :key="j">
                <InlineUser v-if="typeof seg !== 'string'" :user-id="seg.userId" />
                <template v-else>{{ seg }}</template>
              </template>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮组（旁听成员隐藏） -->
    <div v-if="!isObserver" class="space-y-2 border-t border-default p-3">
      <UButton
        block
        :label="holdingFloor ? '结束发言' : floorCountdown > 0 ? `请求发言权（${floorCountdown}s）` : '请求发言权'"
        :icon="holdingFloor ? 'i-lucide-mic-off' : 'i-lucide-hand'"
        color="primary"
        variant="solid"
        :disabled="!holdingFloor && !grabCheck.ok"
        :class="meeting.recordMode && 'border-dashed'"
        @click="onGrabClick"
      />

      <UButton
        block
        label="提出动议"
        color="neutral"
        variant="outline"
        icon="i-lucide-file-plus-2"
        :disabled="meeting.status !== MeetingStatusMap.IN_PROGRESS && !meeting.recordMode"
        :class="meeting.recordMode && 'border-dashed'"
        @click="uiState.motionModalOpen = true"
      />

      <div v-if="hint" class="flex items-start gap-1.5 rounded-none bg-muted px-2.5 py-2 text-xs text-muted">
        <UIcon name="i-lucide-lightbulb" class="mt-0.5 size-3.5 shrink-0" />
        <span>{{ hint }}</span>
      </div>
    </div>

    <!-- 旁听成员提示 -->
    <div v-else class="border-t border-default p-3">
      <div class="flex items-start gap-1.5 rounded-none bg-muted px-2.5 py-2 text-xs text-muted">
        <UIcon name="i-lucide-eye" class="mt-0.5 size-3.5 shrink-0" />
        <span>你以旁听成员身份参会，不能提出动议</span>
      </div>
    </div>
  </aside>
</template>
