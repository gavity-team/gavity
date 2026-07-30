<script setup lang="ts">
// 投票开启时自动弹出投票弹窗（含切换身份后补投）
watch(
  [() => meetingState.meeting.activeVote, () => meetingState.currentUserId],
  ([vote, userId]) => {
    if (vote && vote.ballots[userId] === undefined && isMember(meetingState.meeting, userId)) {
      uiState.voteModalOpen = true;
    }
  },
);
</script>

<template>
  <div class="flex h-screen flex-col bg-default text-default">
    <MeetingTopBar />

    <UAlert
      v-if="meetingState.meeting.recordMode"
      color="primary"
      variant="soft"
      icon="i-lucide-pencil-line"
      title="记录模式已开启，操作限制已解除"
      class="border-b border-default"
    />

    <div class="relative flex min-h-0 flex-1">
      <LeftPanel />
      <main class="flex min-h-0 flex-1 flex-col bg-default">
        <StageArea />
      </main>
      <RightPanel />
    </div>
  </div>

  <MotionModal />
  <VoteMethodModal />
  <VoteModal />
  <VoteResultModal />
  <SettingsModal />
  <MotionsModal />
  <MemberDetailModal />
  <HelpModal />
  <RulingModal />
</template>
