<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { definePageMeta } from '#imports';
import { startBots, stopBots } from '~/utils/bots';
import { resetMeeting } from '~/utils/meetings';

/**
 * 单人演示：本地共享引擎驱动（localDriver），
 * 其余与会者由模拟器扮演，无需登录。
 */
definePageMeta({ layout: false });

onMounted(() => {
  resetMeeting();
  startBots();
});

onUnmounted(() => {
  stopBots();
});
</script>

<template>
  <MeetingConsole />
</template>
