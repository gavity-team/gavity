<script setup lang="ts">
const sections = [
  {
    title: '发言权机制',
    icon: 'i-lucide-mic',
    items: [
      '无发言队列：点击「请求发言权」加入本轮抢夺，先到先得。',
      '当前发言结束后，最早请求发言者获得发言权。',
      '主持人可随时将发言权手动分配给任意成员。',
      '提出动议通常需要持有发言权。',
    ],
  },
  {
    title: '动议流程',
    icon: 'i-lucide-file-plus-2',
    items: [
      '提出动议 → 附议（达到附议人数阈值）→ 辩论 → 主持人发起表决 → 公布结果。',
      '附属动议（修改、搁置等）叠加在当前动议之上，须先处理完毕。',
      '优先/偶发动议（程序问题、紧急议程等）无需发言权即可提出，由主持人当场裁决或直接处理。',
      '主动议（含重新审议、撤销、恢复议题）须在没有待处理动议时提出。',
    ],
  },
  {
    title: '表决规则',
    icon: 'i-lucide-vote',
    items: [
      '简单多数：赞成票多于反对票（多数动议适用）。',
      '三分之二多数：赞成票达到投票数的 2/3（修改、暂停规则、截止辩论等适用）。',
      '全体一致：无人反对（特殊表决方式）。',
      '投票限时内未全员投票，超时后按已投选票结算。',
    ],
  },
  {
    title: '记录模式',
    icon: 'i-lucide-pencil-line',
    items: [
      '仅主持人可开启。开启后解除所有操作限制，用于事后补录会议纪要。',
      '记录模式下操作按钮显示虚线边框，日志照常记录。',
    ],
  },
  {
    title: '角色说明',
    icon: 'i-lucide-users-round',
    items: [
      '主持人：控制流程、分配发言权、发起表决、裁决程序问题。',
      '成员：请求发言权、提出动议、附议、投票。',
      '旁听成员：只读，无任何操作权限。',
      '顶栏可切换当前身份，体验不同角色视角。',
    ],
  },
];
</script>

<template>
  <UModal v-model:open="uiState.helpModalOpen" title="使用帮助" description="Gavity 基于罗伯特议事规则维护会议秩序。" :ui="{ body: 'max-h-[65vh] overflow-y-auto' }">
    <template #body>
      <div class="space-y-5">
        <div v-for="section in sections" :key="section.title">
          <div class="flex items-center gap-1.5 text-sm font-semibold text-highlighted">
            <UIcon :name="section.icon" class="size-4 text-primary" />
            {{ section.title }}
          </div>
          <ul class="mt-1.5 list-disc space-y-1 pl-6 text-xs leading-relaxed text-muted">
            <li v-for="(item, i) in section.items" :key="i">
              {{ item }}
            </li>
          </ul>
        </div>
      </div>
    </template>
  </UModal>
</template>
