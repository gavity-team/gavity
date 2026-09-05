<script setup lang="ts">
import type { NuxtError } from '#app';
import { onMounted } from 'vue';

const { error } = defineProps<{
  error: NuxtError
}>();

onMounted(() => console.error(error));
</script>

<template>
  <RootWrapper>
    <NuxtLayout name="default">
      <UError :error :ui="{ statusCode: 'text-3xl' }" />
    </NuxtLayout>
  </RootWrapper>
</template>
