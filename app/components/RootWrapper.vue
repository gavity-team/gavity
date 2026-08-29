<script setup lang="ts">
import { zh_cn } from '@nuxt/ui/locale';
import * as z from 'zod';

z.config(z.locales.zhCN());
</script>

<template>
  <UApp :locale="zh_cn" :toaster="{ position: 'top-center' }">
    <NuxtLoadingIndicator />
    <slot />
  </UApp>
</template>
