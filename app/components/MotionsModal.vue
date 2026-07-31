<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import type { Motion, MotionStatus, MotionType } from '#shared/utils/mettings';
import { useToast } from '@nuxt/ui/runtime/composables/useToast.js';
import { computed, reactive, ref, watch } from 'vue';
import { MotionStatusMap, MotionTypeMap } from '#shared/utils/mettings';
import { MOTION_CATEGORY_LABELS, MOTION_STATUS_LABELS, motionMeta } from '#shared/utils/rules';
import { formatTime, meetingState, updateMotion, userName } from '~/utils/meetings';
import { uiState } from '~/utils/ui';

const toast = useToast();

const meeting = computed(() => meetingState.meeting);
const isChairUser = computed(() => meeting.value.profile.chair === meetingState.currentUserId);
const canEdit = computed(() => isChairUser.value || meeting.value.recordMode);

const columns = computed<TableColumn<Motion>[]>(() => {
  const cols: TableColumn<Motion>[] = [
    { accessorKey: 'id', header: '编号' },
    { accessorKey: 'type', header: '类型' },
    { accessorKey: 'content', header: '内容' },
    { accessorKey: 'status', header: '状态' },
    { accessorKey: 'proposer', header: '提出人' },
    { accessorKey: 'seconders', header: '附议' },
    { accessorKey: 'createdAt', header: '提出时间' },
  ];
  if (canEdit.value)
    cols.push({ id: 'actions', header: '' });
  return cols;
});

const statusColors: Record<number, 'neutral' | 'info' | 'warning' | 'success' | 'primary'> = {
  [MotionStatusMap.DRAFT]: 'neutral',
  [MotionStatusMap.PENDING]: 'info',
  [MotionStatusMap.LAID_ASIDE]: 'warning',
  [MotionStatusMap.DISPOSED]: 'success',
  [MotionStatusMap.VOTING]: 'primary',
};

// ===== 主持人编辑动议 =====

const statusItems = Object.entries(MOTION_STATUS_LABELS).map(([value, label]) => ({
  label,
  value: Number(value) as MotionStatus,
}));

/** 当前编辑中的动议 id。 */
const editingId = ref<number | null>(null);
const editForm = reactive({
  type: MotionTypeMap.MAIN as MotionType,
  content: '',
  details: '',
  status: MotionStatusMap.DRAFT as MotionStatus,
});

function startEdit(motion: Motion): void {
  editingId.value = motion.id;
  editForm.type = motion.type;
  editForm.content = motion.content;
  editForm.details = motion.details;
  editForm.status = motion.status;
}

function saveEdit(): void {
  if (editingId.value == null)
    return;
  const err = updateMotion(editingId.value, { ...editForm });
  if (err) {
    toast.add({ title: err, color: 'error', icon: 'i-lucide-circle-alert' });
    return;
  }
  editingId.value = null;
}

watch(
  () => uiState.motionsModalOpen,
  (open) => {
    if (open)
      editingId.value = null;
  },
);
</script>

<template>
  <UModal v-model:open="uiState.motionsModalOpen" title="全部动议" description="本次会议提出的所有动议一览。" :ui="{ content: 'max-w-3xl', body: 'max-h-[70vh] overflow-y-auto' }">
    <template #body>
      <div class="space-y-4">
        <UTable :data="meeting.motions" :columns="columns" empty="暂无动议">
          <template #id-cell="{ row }">
            <span class="font-mono text-xs">#M{{ row.original.id }}</span>
          </template>
          <template #type-cell="{ row }">
            <div class="text-sm">
              {{ motionMeta(row.original.type).label }}
            </div>
            <div class="text-xs text-muted">
              {{ MOTION_CATEGORY_LABELS[motionMeta(row.original.type).category] }}
            </div>
          </template>
          <template #content-cell="{ row }">
            <div class="max-w-52 truncate text-sm" :title="row.original.content">
              {{ row.original.content }}
            </div>
            <div v-if="row.original.details" class="max-w-52 truncate text-xs text-muted" :title="row.original.details">
              {{ row.original.details }}
            </div>
          </template>
          <template #status-cell="{ row }">
            <UBadge size="sm" variant="subtle" :color="statusColors[row.original.status]">
              {{ MOTION_STATUS_LABELS[row.original.status] }}
            </UBadge>
          </template>
          <template #proposer-cell="{ row }">
            {{ userName(row.original.proposer) }}
          </template>
          <template #seconders-cell="{ row }">
            {{ row.original.seconders.length }}
          </template>
          <template #createdAt-cell="{ row }">
            <span class="text-xs text-muted">{{ formatTime(row.original.createdAt) }}</span>
          </template>
          <template #actions-cell="{ row }">
            <UButton icon="i-lucide-pencil" color="neutral" variant="outline" size="xs" @click="startEdit(row.original)" />
          </template>
        </UTable>

        <div v-if="editingId != null" class="space-y-2 rounded-none border border-dashed border-default p-3">
          <div class="text-sm font-medium text-highlighted">
            编辑动议 #M{{ editingId }}
          </div>
          <UFormField label="类型">
            <MotionTypeSelect v-model="editForm.type" class="w-full" size="sm" />
          </UFormField>
          <UFormField label="内容">
            <UInput v-model="editForm.content" class="w-full" size="sm" />
          </UFormField>
          <UFormField label="说明">
            <UInput v-model="editForm.details" placeholder="补充说明（可选）" class="w-full" size="sm" />
          </UFormField>
          <UFormField label="状态">
            <USelect v-model="editForm.status" :items="statusItems" class="w-full" size="sm" />
          </UFormField>
          <div class="flex justify-end gap-1.5">
            <UButton label="取消" color="neutral" variant="outline" size="xs" @click="editingId = null" />
            <UButton label="保存" color="primary" variant="solid" size="xs" :disabled="!editForm.content.trim()" @click="saveEdit" />
          </div>
        </div>
      </div>
    </template>
    <template #footer="{ close }">
      <UButton label="关闭" color="neutral" variant="outline" @click="close" />
    </template>
  </UModal>
</template>
