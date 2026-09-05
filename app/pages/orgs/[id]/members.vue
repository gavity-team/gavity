<script setup lang="tsx">
import type { TableColumn } from '@nuxt/ui';
import type { OrgMember } from '#shared/utils/orgs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { getPaginationRowModel } from '@tanstack/vue-table';
import { reactive, ref, useTemplateRef } from 'vue';
import * as z from 'zod';
import { InlineUser, UButton } from '#components';
import { useHead, useRoute } from '#imports';
import { orgMembersQueryOptions } from '~/utils/orgs';

useHead({ title: '组织成员' });
const route = useRoute();
const queryClient = useQueryClient();
const orgId = String(route.params.id);

const membersQuery = useQuery(orgMembersQueryOptions(orgId));
const memberOpen = ref(false);
const memberForm = reactive({ userIds: [] as string[], isOwner: false });
const memberFormRef = useTemplateRef('memberForm');
const MemberForm = z.object({
  userIds: z.array(z.string()).min(1, '请选择至少一个用户'),
  isOwner: z.boolean().default(false),
});

const addMemberMutation = useMutation({
  mutationFn: () => $fetch<{ success: boolean }>(`/api/orgs/${orgId}/members`, {
    method: 'POST',
    body: memberForm,
  }),
  onSuccess: async () => {
    memberOpen.value = false;
    memberForm.userIds = [];
    memberForm.isOwner = false;
    await queryClient.invalidateQueries({ queryKey: orgMembersQueryOptions(orgId).queryKey });
  },
});

const removeMemberMutation = useMutation({
  mutationFn: (userId: string) => $fetch<{ success: boolean }>(`/api/orgs/${orgId}/members/${userId}`, {
    method: 'DELETE',
  }),
  onSuccess: async () => queryClient.invalidateQueries({
    queryKey: orgMembersQueryOptions(orgId).queryKey,
  }),
});
const columns: TableColumn<OrgMember>[] = [
  {
    header: '成员',
    cell: x => <InlineUser userId={x.row.original.userId} size="sm" />,
  },
  {
    header: '角色',
    cell: x => x.row.original.isOwner ? '所有者' : '成员',
  },
  {
    id: 'actions',
    cell: x => (
      <UButton label="移除" color="error" variant="ghost" onClick={() => removeMemberMutation.mutate(x.row.original.userId)} />
    ),
  },
];
const pagination = ref({ pageIndex: 0, pageSize: 10 });
</script>

<template>
  <div class="space-y-6 p-6 sm:p-8">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">
        成员
      </h1>
      <UButton label="添加成员" icon="i-lucide-user-plus" @click="memberOpen = true" />
    </div>

    <UCard>
      <UTable v-model:pagination="pagination" :data="membersQuery.data.value ?? []" :columns="columns" :loading="membersQuery.isPending.value" :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }" />
      <div class="flex justify-end border-t border-default p-3">
        <UPagination :page="pagination.pageIndex + 1" :items-per-page="pagination.pageSize" :total="membersQuery.data.value?.length ?? 0" @update:page="page => pagination.pageIndex = page - 1" />
      </div>
    </UCard>
  </div>

  <UModal v-model:open="memberOpen" title="添加成员">
    <template #body>
      <UForm ref="memberForm" :schema="MemberForm" :state="memberForm" class="space-y-4" @submit="addMemberMutation.mutate()">
        <UFormField label="选择用户" required orientation="horizontal">
          <SelectUser v-model="memberForm.userIds" />
        </UFormField>
        <UFormField label="设为所有者" orientation="horizontal" :ui="{ root: 'items-center' }">
          <USwitch v-model="memberForm.isOwner" class="p-1" />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <UButton label="添加" :loading="addMemberMutation.isPending.value" @click="memberFormRef?.submit()" />
      <UButton label="取消" color="neutral" variant="outline" @click="memberOpen = false" />
    </template>
  </UModal>
</template>
