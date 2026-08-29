<script setup lang="ts">
import { provide } from 'vue';
import { $fetch } from '#imports';
import { GlobalConfigFormStateKey } from './utils';

const config = await $fetch('/api/global-config');
provide(GlobalConfigFormStateKey, config);
</script>

<template>
  <UForm class="m-6 space-y-4">
    <slot />
  </UForm>
</template>
