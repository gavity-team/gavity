<script setup lang="ts">
/**
 * 多人实时会议：要求登录，动作经同源 WebSocket 交由
 * 服务端会议房间权威执行并广播同步。
 */
definePageMeta({ middleware: 'auth' });

const route = useRoute();
const meetingId = computed(() => String(route.params.id));

onMounted(async () => {
  const { data: session } = await authClient.getSession();
  if (!session)
    return navigateTo('/login');
  connectMeeting(meetingId.value);
});
onUnmounted(() => {
  disconnectMeeting();
});
</script>

<template>
  <MeetingConsole />
</template>
