<script setup lang="ts">
import { computed, ref } from 'vue';
import { MeetingStatusMap } from '#shared/utils/mettings';
import { canToggleRecordMode, MEETING_STATUS_LABELS, roleOf } from '#shared/utils/rules';
import { DEMO_USERS, endMeeting, meetingState, resetMeeting, resumeMeeting, startMeeting, toggleRecordMode, userName } from '~/utils/meetings';
import { notifyError, uiState } from '~/utils/ui';

const meeting = computed(() => meetingState.meeting);
const statusLabel = computed(() => MEETING_STATUS_LABELS[meeting.value.status]);

const isChairUser = computed(() => meeting.value.profile.chair === meetingState.currentUserId);
/** live = 多人实时会议；demo = 单人演示（可切换身份）。 */
const isLive = computed(() => meetingState.mode === 'live');
const currentName = computed(() => userName(meetingState.currentUserId));
const recordMode = computed({
  get: () => meeting.value.recordMode,
  set: () => run(toggleRecordMode()),
});
const recordModeCheck = computed(() => canToggleRecordMode(meeting.value, meetingState.currentUserId));

const identityItems = computed(() => DEMO_USERS.map(u => ({
  label: `${u.name}（${roleLabel(roleOf(meeting.value, u.id))}）`,
  value: u.id,
})));

const endConfirmOpen = ref(false);

function run(result: string | null): void {
  if (result) {
    notifyError(result);
  }
}

function roleLabel(role: 'host' | 'member' | 'observer'): string {
  return role === 'host' ? '主持人' : role === 'member' ? '成员' : '旁听成员';
}

function onEndMeeting(): void {
  const err = endMeeting();
  if (err) {
    notifyError(err);
    return;
  }
  endConfirmOpen.value = false;
}

const resetConfirmOpen = ref(false);

function onResetMeeting(): void {
  resetMeeting();
  resetConfirmOpen.value = false;
}
</script>

<template>
  <header class="flex h-14 items-center gap-3 border-b border-default px-4 shrink-0">
    <div class="flex items-center gap-2 min-w-0">
      <div class="flex size-8 items-center justify-center bg-primary text-inverted">
        <UIcon name="i-lucide-gavel" class="size-5" />
      </div>
      <div class="min-w-0">
        <div class="truncate text-sm font-semibold text-highlighted">
          {{ meeting.profile.title }}
        </div>
        <div class="text-xs text-muted">
          Gavity · 罗伯特议事规则
        </div>
      </div>
    </div>

    <UBadge color="neutral" variant="subtle" size="lg" class="shrink-0">
      {{ statusLabel }}
    </UBadge>

    <div class="flex-1" />

    <template v-if="!recordModeCheck.ok">
      <UTooltip :text="recordModeCheck.ok ? '解除所有操作限制，自由补录' : recordModeCheck.reason">
        <div class="flex items-center gap-2">
          <span class="text-xs">记录模式</span>
          <USwitch v-model="recordMode" size="sm" />
        </div>
      </UTooltip>

      <USeparator orientation="vertical" class="h-6" />
    </template>

    <template v-if="isLive">
      <UBadge v-if="!meetingState.connected" color="warning" variant="subtle" size="sm">
        连接中…
      </UBadge>
      <div class="flex items-center gap-2">
        <UAvatar :alt="currentName" size="2xs" />
        <span class="max-w-28 truncate text-sm text-default">{{ currentName }}</span>
      </div>
      <UButton
        v-if="!isChairUser"
        to="/"
        label="离开会议"
        icon="i-lucide-log-out"
        color="error"
        variant="outline"
        size="sm"
      />
    </template>
    <USelect
      v-else
      v-model="meetingState.currentUserId"
      :items="identityItems"
      size="sm"
      class="w-44"
      icon="i-lucide-user-round"
    />

    <template v-if="isChairUser || meeting.recordMode">
      <UButton
        v-if="meeting.status === MeetingStatusMap.NOT_STARTED"
        label="开始会议"
        icon="i-lucide-play"
        size="sm"
        color="primary"
        variant="solid"
        @click="notifyError(startMeeting())"
      />
      <UButton
        v-if="meeting.status === MeetingStatusMap.RECESSED"
        label="恢复会议"
        icon="i-lucide-play"
        size="sm"
        color="primary"
        variant="solid"
        @click="notifyError(resumeMeeting())"
      />
      <UButton
        v-if="meeting.status === MeetingStatusMap.IN_PROGRESS || meeting.status === MeetingStatusMap.RECESSED"
        label="结束会议"
        icon="i-lucide-square"
        size="sm"
        color="error"
        variant="outline"
        @click="endConfirmOpen = true"
      />
    </template>
    <UButton
      v-if="!isLive && meeting.status === MeetingStatusMap.ENDED"
      label="重新开始"
      icon="i-lucide-rotate-ccw"
      size="sm"
      color="primary"
      variant="solid"
      @click="resetConfirmOpen = true"
    />

    <UTooltip text="全部动议">
      <UButton icon="i-lucide-table" color="neutral" variant="outline" size="sm" @click="uiState.motionsModalOpen = true" />
    </UTooltip>
    <UTooltip v-if="isChairUser || meeting.recordMode" text="会议设置">
      <UButton icon="i-lucide-settings" color="neutral" variant="outline" size="sm" @click="uiState.settingsModalOpen = true" />
    </UTooltip>
    <UTooltip text="切换主题">
      <UColorModeButton color="neutral" variant="outline" size="sm" />
    </UTooltip>
    <UTooltip text="帮助">
      <UButton icon="i-lucide-circle-help" color="neutral" variant="outline" size="sm" @click="uiState.helpModalOpen = true" />
    </UTooltip>

    <UModal v-model:open="endConfirmOpen" title="结束会议" description="结束后会议数据将冻结，是否确认结束？" :ui="{ footer: 'justify-end' }">
      <template #footer="{ close }">
        <UButton label="取消" color="neutral" variant="outline" @click="close" />
        <UButton label="确认结束" color="primary" variant="solid" @click="onEndMeeting" />
      </template>
    </UModal>

    <UModal v-model:open="resetConfirmOpen" title="重新开始会议" description="将清空全部会议数据、日志与动议历史，无法恢复。是否确认？" :ui="{ footer: 'justify-end' }">
      <template #footer="{ close }">
        <UButton label="取消" color="neutral" variant="outline" @click="close" />
        <UButton label="确认重置" color="error" variant="solid" @click="onResetMeeting" />
      </template>
    </UModal>
  </header>
</template>
