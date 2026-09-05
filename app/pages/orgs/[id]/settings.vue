<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { computed, ref, watch } from 'vue';
import { useHead, useRoute } from '#imports';
import { orgQueryOptions } from '~/utils/orgs';

useHead({ title: '组织设置' });
const route = useRoute();
const queryClient = useQueryClient();

const orgId = computed(() => route.params.id as string);
const orgQuery = useQuery(orgQueryOptions(orgId.value));

const form = ref({
  name: '',
});
watch(orgQuery.data, (org) => {
  if (org)
    form.value = org;
}, { immediate: true });

const orgOptions = orgQueryOptions(orgId.value);
const saveMutation = useMutation({ mutationFn: () => globalThis.fetch(`/api/orgs/${orgId.value}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: form.value.name, avatar: form.value.avatar || null }) }), onSuccess: async () => queryClient.invalidateQueries({ queryKey: orgOptions.queryKey }) });
</script>

<template>
  <main class="space-y-6 p-6 sm:p-8">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">
        组织设置
      </h1>
    </div>
    <UCard title="基本信息" :ui="{ body: 'space-y-4' }">
      <UFormField label="名称">
        <UInput v-model="form.name" class="w-full" />
      </UFormField>
      <UButton label="保存" :loading="saveMutation.isPending.value" @click="saveMutation.mutate()" />
    </UCard>
  </main>
</template>
