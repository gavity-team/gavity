<script setup lang="ts">
import { watch } from 'vue';
import { isMember } from '#shared/utils/rules';
import { meetingState } from '~/utils/meetings';
import { uiState } from '~/utils/ui';

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
