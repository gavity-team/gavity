<script setup lang="ts">
import { useFetch, useHead } from '#imports';

useHead({ title: '组织' });

const { data: orgs } = await useFetch('/api/profile/orgs');
</script>

<template>
  <main class="space-y-6 p-6 sm:p-8">
    <h1 class="text-2xl font-semibold">
      组织
    </h1>
    <div v-if="orgs?.length" class="space-y-2">
      <ULink v-for="org in orgs" :key="org.id" :to="`/orgs/${org.id}`" class="flex items-center gap-3">
        <UAvatar :src="org.avatar ?? undefined" :alt="org.name" size="sm" />
        <span>{{ org.name }}</span>
        <UBadge v-if="org.isOwner" label="所有者" variant="subtle" />
      </ULink>
    </div>
    <UEmpty v-else title="未加入组织" variant="naked" />
  </main>
</template>
