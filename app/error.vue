<script setup lang="ts">
import type { NuxtError } from '#app';

defineProps<{
  error: NuxtError
}>();
</script>

<template>
  <RootWrapper>
    <NuxtLayout name="default">
      <UError :error :ui="{ statusCode: 'text-3xl' }" />
    </NuxtLayout>
  </RootWrapper>
</template>
