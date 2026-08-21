<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { navigateTo, useRoute } from '#app';
import { definePageMeta } from '#imports';
import { authClient } from '~/utils/auth';
import { meetingState } from '~/utils/meetings';
import { connectMeeting, disconnectMeeting } from '~/utils/remote';

/**
 * 多人实时会议：要求登录，动作经同源 WebSocket 交由
 * 服务端会议房间权威执行并广播同步。
 */
definePageMeta({ middleware: 'auth', layout: false });

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
  <div v-if="!meetingState.synced" class="flex h-screen items-center justify-center gap-2 bg-default text-muted">
    <UIcon name="i-lucide-loader-circle" class="size-5 animate-spin" />
    连接中…
  </div>
  <MeetingConsole v-else />
</template>
