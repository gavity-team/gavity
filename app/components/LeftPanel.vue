<script setup lang="ts">
import { computed, ref } from 'vue';
import { canAssignFloor, isChair, roleOf } from '#shared/utils/rules';
import { assignFloor, meetingState } from '~/utils/meetings';
import { notifyError, uiState } from '~/utils/ui';
import { getUserInfo } from '~/utils/users';

const meeting = computed(() => meetingState.meeting);

/** 侧栏默认折叠，仅显示竖排头像；拖动边缘 rail 可展开。 */
const sidebarOpen = ref(false);

interface Row {
  id: string
  role: 'host' | 'member' | 'observer'
  hasFloor: boolean
  grabbing: boolean
  isSelf: boolean
  offline: boolean
}

const rows = computed<Row[]>(() => {
  const m = meeting.value;
  const ids = [...m.members, ...m.observers];
  return ids.map(id => ({
    id,
    role: roleOf(m, id),
    hasFloor: m.floorHolder === id,
    grabbing: m.floor.includes(id),
    isSelf: id === meetingState.currentUserId,
    // 仅 live 模式有在线状态；超过 20s 未收到心跳视为断线
    offline: meetingState.mode === 'live' && !meetingState.onlineIds.includes(id),
  }));
});

const canAssign = computed(() => canAssignFloor(meeting.value, meetingState.currentUserId).ok);

function roleBadge(role: Row['role']): { label: string, color: 'primary' | 'neutral' | 'warning' } {
  if (role === 'host')
    return { label: '主持人', color: 'primary' };
  if (role === 'member')
    return { label: '成员', color: 'neutral' };
  return { label: '旁听成员', color: 'neutral' };
}
</script>

<template>
  <USidebar
    v-model:open="sidebarOpen"
    collapsible="icon"
    rail
    side="left"
    :ui="{
      container: 'absolute inset-y-0 z-10 hidden h-auto w-(--sidebar-width) lg:flex',
      body: 'gap-0 p-0',
    }"
  >
    <template #default="{ state }">
      <!-- 折叠态：仅竖排头像 -->
      <div v-if="state === 'collapsed'" class="flex flex-col items-center gap-1.5 p-2">
        <UButton
          v-for="row in rows"
          :key="row.id"
          color="neutral"
          variant="ghost"
          size="xs"
          class="relative rounded-none p-1"
          @click="uiState.memberDetailId = row.id"
        >
          <UAvatar :src="getUserInfo(row.id)?.avatar ?? undefined" :alt="getUserInfo(row.id)?.name" size="sm" :class="[isChair(meeting, row.id) && 'ring-2 ring-primary', row.offline && 'opacity-40']" />
          <span
            v-if="row.hasFloor"
            class="bg-success absolute bottom-0.5 right-0.5 size-2 rounded-full ring-2 ring-default"
          />
        </UButton>
      </div>

      <!-- 展开态：完整与会者列表 -->
      <div v-else class="flex h-full flex-col">
        <div class="border-b border-default px-3 py-2">
          <div class="text-xs font-medium text-muted">
            与会者（{{ rows.length }}）
          </div>
          <div class="mt-2 rounded-none bg-muted px-2.5 py-2 text-xs">
            <div class="flex items-center gap-1.5">
              <UIcon name="i-lucide-mic" class="size-3.5 shrink-0" :class="meeting.floorHolder ? 'text-primary' : 'text-dimmed'" />
              <span v-if="meeting.floorHolder" class="font-medium text-highlighted"><InlineUser :user-id="meeting.floorHolder" /> 发言中</span>
              <span v-else class="text-muted">发言权空闲</span>
            </div>
            <div v-if="meeting.floor.length" class="mt-1 flex items-center gap-1.5 text-muted">
              <UIcon name="i-lucide-hand" class="size-3.5 shrink-0" />
              <span>
                <InlineUser v-for="id in meeting.floor" :key="id" :user-id="id" variant="neutral" />
                请求发言：
              </span>
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-2">
          <!-- 行内含分配发言权按钮，故外层用可点击 div 而非 button，避免 button 嵌套 -->
          <div
            v-for="row in rows"
            :key="row.id"
            class="group flex w-full cursor-pointer items-center gap-1.5 rounded-none px-2 py-1.5 text-sm transition-colors hover:bg-elevated"
            :class="{ 'bg-elevated ring-1 ring-primary/40': row.hasFloor }"
            @click="uiState.memberDetailId = row.id"
          >
            <InlineUser :user-id="row.id" class="min-w-0" variant="neutral" />
            <span v-if="row.isSelf" class="shrink-0 text-xs text-muted">（我）</span>
            <UBadge :color="roleBadge(row.role).color" variant="subtle" size="sm" class="shrink-0">
              {{ roleBadge(row.role).label }}
            </UBadge>
            <span v-if="row.hasFloor" class="ml-auto flex shrink-0 items-center gap-0.5 text-xs text-success">
              <UIcon name="i-lucide-mic" class="size-3" />发言中
            </span>
            <span v-else-if="row.grabbing" class="ml-auto flex shrink-0 items-center gap-0.5 text-xs text-warning">
              <UIcon name="i-lucide-hand" class="size-3" />抢夺中
            </span>
            <UTooltip v-else-if="canAssign && row.role !== 'observer'" text="分配发言权">
              <UButton
                icon="i-lucide-mic"
                color="neutral"
                variant="outline"
                size="xs"
                class="ml-auto opacity-0 group-hover:opacity-100"
                @click.stop="notifyError(assignFloor(row.id))"
              />
            </UTooltip>
          </div>
        </div>
      </div>
    </template>
  </USidebar>
</template>
