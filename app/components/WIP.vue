<script setup lang="ts">
defineProps<{
  issue?: string
}>();
</script>

<template>
  <UEmpty class="h-full" variant="naked" size="xl" icon="i-lucide-construction" title="正在开发中">
    <template #description>
      <template v-if="issue">
        敬请关注
        <ULink :href="`https://github.com/gavity-team/gavity/issues/${issue}`" target="_blank">
          issue #{{ issue }}
        </ULink>
      </template>
      <template v-else>
        敬请期待
      </template>
    </template>
  </UEmpty>
</template>
