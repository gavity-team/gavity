<script setup lang="ts">
import type { PricingPlanProps } from '@nuxt/ui';

const plans: PricingPlanProps[] = [{
  title: '免费版',
  description: '开箱即用，无需信用卡。',
  price: '￥0',
  features: [
    '完整会议功能',
    '多人实时协作',
    '社区支持',
  ],
  button: {
    label: '立即注册',
    to: '/register',
    color: 'neutral',
    variant: 'outline',
    block: true,
  },
}, {
  title: '企业版',
  description: '面向有更高协作和管理需求的组织。',
  price: '￥0',
  features: [
    '包含免费版全部功能',
    '组织与成员权限管理',
    '私有化部署指导',
    '优先客户支持',
  ],
  button: {
    label: '联系我们',
    block: true,
    href: `mailto:team@gavity.app?subject=${encodeURIComponent('Gavity 企业版咨询')}`,
  },
}, {
  title: '私有化部署',
  description: '部署在自己的服务器，数据完全自主。',
  price: '￥0',
  features: [
    '自定义部署选项',
    '完全数据驻留',
    '社区支持',
  ],
  button: {
    label: '查看代码仓库',
    color: 'neutral',
    variant: 'outline',
    block: true,
    href: 'https://github.com/gavity-team/gavity',
    target: '_blank',
  },
}];
</script>

<template>
  <main>
    <UPageHero
      title="版本功能对比"
      description="省流：全都免费，但若想让 Gavity 按你的需求加功能，请联系我们"
      class="md:border-b border-default"
      :ui="{ container: 'relative py-10 sm:py-16 lg:py-24' }"
    >
      <template #top>
        <div class="absolute z-[-1] rounded-full bg-primary blur-[300px] size-60 sm:size-80 transform -translate-x-1/2 left-1/2 -translate-y-80" />
      </template>
    </UPageHero>

    <UPageSection>
      <UPricingPlans>
        <UPricingPlan
          v-for="(plan, index) in plans"
          :key="index"
          v-bind="plan"
        />
      </UPricingPlans>
    </UPageSection>

    <UPageSection class="md:border-t border-default" :ui="{ container: 'py-10 sm:py-16' }">
      <div class="flex flex-col items-center gap-4 text-center">
        <h2 class="text-xl font-semibold text-highlighted sm:text-2xl">
          准备好让下一场会议井然有序了吗？
        </h2>
        <p class="text-sm text-muted">
          在演示模式体验会议流程，或立即创建一场会议。
        </p>
        <div class="flex gap-2">
          <UButton to="/demo" label="进入演示" icon="i-lucide-play" color="neutral" variant="outline" size="lg" />
          <UButton to="/" label="立即使用" icon="i-lucide-arrow-right" size="lg" />
        </div>
      </div>
    </UPageSection>
  </main>
</template>
