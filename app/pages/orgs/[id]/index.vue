<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import { definePageMeta, useHead, useRoute } from '#imports';
import { orgQueryOptions } from '~/utils/orgs';

definePageMeta({ middleware: 'auth' });
const route = useRoute();
const orgId = computed(() => route.params.id as string);
const orgQuery = useQuery(orgQueryOptions(orgId.value));
useHead(() => ({ title: orgQuery.data.value?.name ?? '组织' }));
</script>

<template>
  <main class="space-y-6 p-6 sm:p-8">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">
        {{ orgQuery.data.value?.name }}
      </h1>
    </div>
  </main>
</template>
