<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { getPaginationRowModel } from '@tanstack/vue-table';
import type { TableColumn } from '@nuxt/ui';
import { computed, h, ref } from 'vue';
import { UButton } from '#components';
import { useHead } from '#imports';
import { orgsQueryOptions } from '~/utils/orgs';
import type { Org } from '#shared/utils/orgs';

useHead({ title: '组织管理' });

const search = ref('');
const open = ref(false);
const form = ref({ name: '', avatar: '' });

const queryClient = useQueryClient();
const orgsQuery = useQuery(orgsQueryOptions);

const filteredOrgs = computed(() => (orgsQuery.data.value ?? []).filter(org => org.name.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())));
const createMutation = useMutation({
  mutationFn: () => globalThis.fetch('/api/orgs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: form.value.name, avatar: form.value.avatar || null }) }),
  onSuccess: async () => {
    open.value = false;
    form.value.name = '';
    form.value.avatar = '';
    await queryClient.invalidateQueries({ queryKey: orgsQueryOptions.queryKey });
  },
});
const columns: TableColumn<Org>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: '名称' },
  { accessorKey: 'createdAt', header: '创建时间' },
  { id: 'actions', header: '', cell: ({ row }) => h(UButton, {
    label: '查看',
    color: 'neutral',
    variant: 'outline',
    to: `/orgs/${row.original.id}`,
  }) },
];
const pagination = ref({ pageIndex: 0, pageSize: 10 });
</script>

<template>
  <div class="space-y-5 p-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">
          组织
        </h1><p class="mt-1 text-sm text-muted">
          管理服务中的组织及其成员。
        </p>
      </div><UButton label="新建组织" icon="i-lucide-plus" @click="open = true" />
    </div>
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <template #header>
        <UInput v-model="search" icon="i-lucide-search" placeholder="搜索组织" class="max-w-sm" />
      </template><UTable ref="table" v-model:pagination="pagination" :data="filteredOrgs" :columns="columns" :loading="orgsQuery.isPending.value" :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }" /><div class="flex justify-end border-t border-default p-3"><UPagination :page="pagination.pageIndex + 1" :items-per-page="pagination.pageSize" :total="filteredOrgs.length" @update:page="page => pagination.pageIndex = page - 1" />
      </div>
    </UCard>
    <UModal v-model:open="open" title="新建组织">
      <template #body>
        <div class="space-y-4">
          <UFormField label="名称" required>
            <UInput v-model="form.name" />
          </UFormField>
          <UFormField label="头像地址">
            <UInput v-model="form.avatar" />
          </UFormField>
        </div>
      </template><template #footer>
        <UButton label="取消" color="neutral" variant="outline" @click="open = false" /><UButton label="创建" :loading="createMutation.isPending.value" :disabled="!form.name.trim()" @click="createMutation.mutate()" />
      </template>
    </UModal>
  </div>
</template>
