<script setup lang="ts">
const meeting = computed(() => meetingState.meeting);
const userId = computed(() => uiState.memberDetailId);
const modalOpen = ref(false);

watch(userId, (id) => {
  if (id != null)
    modalOpen.value = true;
});

function onAfterLeave(): void {
  uiState.memberDetailId = null;
}

const role = computed(() => (userId.value ? roleOf(meeting.value, userId.value) : null));
const stats = computed(() => (userId.value ? memberStats(userId.value) : null));
const isChairUser = computed(() => meeting.value.profile.chair === meetingState.currentUserId);
const hasFloor = computed(() => userId.value != null && meeting.value.floorHolder === userId.value);

const statItems = computed(() => {
  if (!stats.value)
    return [];
  return [
    { label: '获得发言权', value: stats.value.floorCount, icon: 'i-lucide-mic' },
    { label: '提出动议', value: stats.value.motionCount, icon: 'i-lucide-file-plus-2' },
    { label: '附议', value: stats.value.secondCount, icon: 'i-lucide-thumbs-up' },
    { label: '参与投票', value: stats.value.voteCount, icon: 'i-lucide-vote' },
  ];
});

function run(result: string | null): void {
  if (result) {
    notifyError(result);
    return;
  }
  modalOpen.value = false;
}
</script>

<template>
  <UModal v-model:open="modalOpen" title="与会者详情" :ui="{ footer: 'justify-end' }" @after:leave="onAfterLeave">
    <template #body>
      <div v-if="userId" class="space-y-4">
        <div class="flex items-center gap-3">
          <UAvatar :alt="userName(userId)" size="lg" />
          <div>
            <div class="flex items-center gap-2 font-semibold text-highlighted">
              {{ userName(userId) }}
              <UBadge v-if="role === 'host'" size="sm" color="primary" variant="subtle">
                主持人
              </UBadge>
              <UBadge v-else-if="role === 'member'" size="sm" color="neutral" variant="subtle">
                成员
              </UBadge>
              <UBadge v-else size="sm" color="warning" variant="subtle">
                旁听成员
              </UBadge>
            </div>
            <div class="mt-0.5 flex items-center gap-1 text-xs text-muted">
              <template v-if="hasFloor">
                <UIcon name="i-lucide-mic" class="size-3.5 text-primary" />正在发言
              </template>
              <template v-else-if="meeting.floor.includes(userId)">
                <UIcon name="i-lucide-hand" class="size-3.5 text-warning" />正在抢夺发言权
              </template>
              <template v-else>
                <span class="inline-block size-1.5 rounded-full bg-success" />在线
              </template>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-4 gap-2">
          <div v-for="item in statItems" :key="item.label" class="rounded-none bg-muted p-2.5 text-center">
            <UIcon :name="item.icon" class="mx-auto size-4 text-muted" />
            <div class="mt-1 text-lg font-bold text-highlighted">
              {{ item.value }}
            </div>
            <div class="text-xs text-muted">
              {{ item.label }}
            </div>
          </div>
        </div>
      </div>
    </template>
    <template v-if="userId && role === 'member' && (isChairUser || meeting.recordMode)" #footer>
      <UButton
        label="分配发言权"
        icon="i-lucide-mic"
        color="primary"
        variant="solid"
        :disabled="hasFloor"
        @click="run(assignFloor(userId))"
      />
    </template>
  </UModal>
</template>
