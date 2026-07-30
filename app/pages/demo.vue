<script setup lang="ts">
/**
 * 单人演示：本地共享引擎驱动（localDriver），
 * 其余与会者由模拟器扮演，无需登录。
 */
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
