<script setup lang="ts">
import type { AgendaItemStatus } from '#shared/utils/mettings';
import { AgendaItemStatusMap } from '#shared/utils/mettings';

const toast = useToast();

const meeting = computed(() => meetingState.meeting);
const isChairUser = computed(() => meeting.value.profile.chair === meetingState.currentUserId);
const canEdit = computed(() => isChairUser.value || meeting.value.recordMode);

const form = reactive({
  title: '',
});

const newAgenda = reactive({ title: '', details: '', isSpecial: false });

// ===== 入会码（live 模式） =====

const joinCodes = ref<string[]>([]);

async function loadJoinCodes(): Promise<void> {
  try {
    const res = await $fetch<{ codes: string[] }>(`/api/meetings/${meeting.value.id}/codes`);
    joinCodes.value = res.codes;
  } catch {
    joinCodes.value = [];
  }
}

async function copyCode(code: string): Promise<void> {
  await navigator.clipboard.writeText(code);
  toast.add({ title: '入会码已复制', color: 'success', icon: 'i-lucide-copy-check' });
}

/** 当前编辑中的议题 id。 */
const editingId = ref<number | null>(null);
const editForm = reactive({ title: '', details: '', scheduledAt: '', isSpecial: false, status: AgendaItemStatusMap.PENDING as AgendaItemStatus });

watch(
  () => uiState.settingsModalOpen,
  (open) => {
    if (open) {
      form.title = meeting.value.profile.title;
      editingId.value = null;
      newAgenda.title = '';
      newAgenda.details = '';
      newAgenda.isSpecial = false;
      if (meetingState.mode === 'live')
        void loadJoinCodes();
    }
  },
);

function save(): void {
  const err = updateSettings({ title: form.title });
  if (err) {
    toast.add({ title: err, color: 'error', icon: 'i-lucide-circle-alert' });
    return;
  }
  toast.add({ title: '设置已保存', color: 'success', icon: 'i-lucide-check-circle-2' });
  uiState.settingsModalOpen = false;
}

function addItem(): void {
  if (!newAgenda.title.trim())
    return;
  const err = addAgendaItem(newAgenda.title, newAgenda.details);
  if (err) {
    toast.add({ title: err, color: 'error', icon: 'i-lucide-circle-alert' });
    return;
  }
  newAgenda.title = '';
  newAgenda.details = '';
  newAgenda.isSpecial = false;
}

function removeItem(id: number): void {
  const err = removeAgendaItem(id);
  if (err)
    toast.add({ title: err, color: 'error', icon: 'i-lucide-circle-alert' });
}

function startEdit(item: { id: number, title: string, details: string, scheduledAt: number | null, isSpecial: boolean, status: AgendaItemStatus }): void {
  editingId.value = item.id;
  editForm.title = item.title;
  editForm.details = item.details;
  editForm.scheduledAt = item.scheduledAt ? new Date(item.scheduledAt).toISOString().slice(0, 16) : '';
  editForm.isSpecial = item.isSpecial;
  editForm.status = item.status;
}

function saveEdit(): void {
  if (editingId.value == null)
    return;
  const scheduledAt = editForm.scheduledAt ? new Date(editForm.scheduledAt).getTime() : null;
  const err = updateAgendaItem(editingId.value, {
    title: editForm.title,
    details: editForm.details,
    scheduledAt,
    isSpecial: editForm.isSpecial,
    status: editForm.status,
  });
  if (err) {
    toast.add({ title: err, color: 'error', icon: 'i-lucide-circle-alert' });
    return;
  }
  editingId.value = null;
}

function cancelEdit(): void {
  editingId.value = null;
}

function moveItem(id: number, direction: 'up' | 'down'): void {
  const err = moveAgendaItem(id, direction);
  if (err)
    toast.add({ title: err, color: 'error', icon: 'i-lucide-circle-alert' });
}

const statusItems = [
  { label: '待讨论', value: AgendaItemStatusMap.PENDING },
  { label: '讨论中', value: AgendaItemStatusMap.DISCUSSING },
  { label: '已通过', value: AgendaItemStatusMap.PASSED },
  { label: '已否决', value: AgendaItemStatusMap.REJECTED },
];

// ===== 与会者身份管理 =====

const roleItems = [
  { label: '主持人', value: 'host' },
  { label: '成员', value: 'member' },
  { label: '旁听成员', value: 'observer' },
];

/** 待移交主持人的目标 id（在 after:leave 后清理，避免关闭动画期间内容闪烁）。 */
const transferTargetId = ref<string | null>(null);
const transferConfirmOpen = ref(false);

function onRoleChange(user: string, role: unknown): void {
  if (role === roleOf(meeting.value, user))
    return;
  if (role === 'host') {
    transferTargetId.value = user;
    transferConfirmOpen.value = true;
    return;
  }
  const err = setMemberRole(user, role as 'member' | 'observer');
  if (err)
    toast.add({ title: err, color: 'error', icon: 'i-lucide-circle-alert' });
}

function confirmTransfer(): void {
  if (transferTargetId.value == null)
    return;
  const err = transferChair(transferTargetId.value);
  if (err)
    toast.add({ title: err, color: 'error', icon: 'i-lucide-circle-alert' });
  transferConfirmOpen.value = false;
}
</script>

<template>
  <UModal v-model:open="uiState.settingsModalOpen" title="会议设置" description="会议基本信息与议事规则配置。" :ui="{ footer: 'justify-end', body: 'max-h-[60vh] overflow-y-auto' }">
    <template #body>
      <div class="space-y-4">
        <UFormField label="会议名称">
          <UInput v-model="form.title" :disabled="!canEdit" class="w-full" />
        </UFormField>

        <template v-if="meetingState.mode === 'live'">
          <USeparator label="入会码" />

          <div class="space-y-1.5">
            <div
              v-for="code in joinCodes"
              :key="code"
              class="flex items-center gap-2 rounded-none bg-muted px-3 py-1.5"
            >
              <span class="flex-1 font-mono text-sm tracking-widest text-highlighted">{{ code }}</span>
              <UButton icon="i-lucide-copy" color="neutral" variant="outline" size="xs" @click="copyCode(code)" />
            </div>
            <p v-if="!joinCodes.length" class="text-xs text-dimmed">
              暂无入会码（会议结束后自动释放）。
            </p>
            <p v-else class="text-xs text-dimmed">
              与会者凭码加入会议；会议结束后自动释放。
            </p>
          </div>
        </template>

        <USeparator label="议程管理" />

        <div class="space-y-1.5">
          <div
            v-for="(item, index) in meeting.agenda"
            :key="item.id"
            class="rounded-none bg-muted px-3 py-1.5 text-sm"
          >
            <!-- 查看模式 -->
            <div v-if="editingId !== item.id" class="flex items-center gap-2">
              <div class="truncate text-sm flex items-center" :class="item.id === meeting.currentAgendaId ? 'font-medium text-highlighted' : 'text-default'">
                {{ item.title }}
                <UIcon v-if="item.isSpecial" size="sm" name="i-lucide-star" class="ml-1 text-primary" />
              </div>
              <span v-if="item.scheduledAt" class="text-xs text-dimmed">
                {{ new Date(item.scheduledAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
              </span>
              <UFieldGroup v-if="canEdit">
                <UButton icon="i-lucide-chevron-up" color="neutral" variant="outline" size="xs" :disabled="index === 0" @click="moveItem(item.id, 'up')" />
                <UButton icon="i-lucide-chevron-down" color="neutral" variant="outline" size="xs" :disabled="index === meeting.agenda.length - 1" @click="moveItem(item.id, 'down')" />
                <UButton icon="i-lucide-pencil" color="neutral" variant="outline" size="xs" @click="startEdit(item)" />
                <UButton icon="i-lucide-trash-2" color="neutral" variant="outline" size="xs" @click="removeItem(item.id)" />
              </UFieldGroup>
            </div>

            <!-- 编辑模式 -->
            <div v-else class="space-y-2 py-1">
              <UInput v-model="editForm.title" placeholder="议题标题" class="w-full" size="sm" />
              <UInput v-model="editForm.details" placeholder="议题说明（可选）" class="w-full" size="sm" />
              <UInput v-model="editForm.scheduledAt" type="datetime-local" placeholder="预定时间（可选）" class="w-full" size="sm" />
              <div class="flex items-center gap-2">
                <USelect v-model="editForm.status" :items="statusItems" class="flex-1" size="sm" />
                <UCheckbox v-model="editForm.isSpecial" label="特别议程" size="sm" />
              </div>
              <div class="flex justify-end gap-1.5">
                <UButton label="取消" color="neutral" variant="outline" size="xs" @click="cancelEdit" />
                <UButton label="保存" color="primary" variant="solid" size="xs" @click="saveEdit" />
              </div>
            </div>
          </div>
        </div>

        <div v-if="canEdit" class="space-y-2 rounded-none border border-dashed border-default p-3">
          <UInput v-model="newAgenda.title" placeholder="新议题标题" class="w-full" />
          <div class="flex gap-2">
            <UInput v-model="newAgenda.details" placeholder="议题说明（可选）" class="flex-1" />
            <UCheckbox v-model="newAgenda.isSpecial" label="特别议程" />
            <UButton label="添加" icon="i-lucide-plus" color="primary" variant="solid" :disabled="!newAgenda.title.trim()" @click="addItem" />
          </div>
        </div>

        <USeparator label="与会者" />

        <div class="space-y-1.5">
          <div
            v-for="user in [...meeting.members, ...meeting.observers]"
            :key="user"
            class="flex items-center gap-2 rounded-none bg-muted px-3 py-1.5 text-sm"
          >
            <UAvatar :alt="userName(user)" size="2xs" />
            <span class="flex-1">{{ userName(user) }}</span>
            <USelect
              v-if="canEdit"
              :model-value="roleOf(meeting, user)"
              :items="roleItems"
              :disabled="meeting.profile.chair === user"
              size="xs"
              class="w-28"
              @update:model-value="onRoleChange(user, $event)"
            />
            <UBadge v-else size="sm" variant="subtle" :color="meeting.profile.chair === user ? 'primary' : 'neutral'">
              {{ meeting.profile.chair === user ? '主持人' : meeting.members.includes(user) ? '成员' : '旁听成员' }}
            </UBadge>
          </div>
        </div>
      </div>
    </template>
    <template #footer="{ close }">
      <UButton label="取消" color="neutral" variant="outline" @click="close" />
      <UButton label="保存设置" color="primary" variant="solid" :disabled="!canEdit" @click="save" />
    </template>
  </UModal>

  <UModal
    v-model:open="transferConfirmOpen"
    title="移交主持人"
    :description="`将主持人身份移交给 ${userName(transferTargetId)}，你将成为普通成员。是否确认？`"
    :ui="{ footer: 'justify-end' }"
    @after:leave="transferTargetId = null"
  >
    <template #footer="{ close }">
      <UButton label="取消" color="neutral" variant="outline" @click="close" />
      <UButton label="确认移交" color="primary" variant="solid" @click="confirmTransfer" />
    </template>
  </UModal>
</template>
