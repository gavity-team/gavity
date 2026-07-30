<script setup lang="ts">
import type { MotionType } from '#shared/utils/mettings';
import { MotionCategoryMap } from '#shared/utils/mettings';

const props = defineProps<{
  /** 无发言权：禁用所有需要发言权（needsFloor）的动议类型。 */
  noFloor?: boolean
}>();

const model = defineModel<MotionType>();

const CATEGORY_ORDER = [
  MotionCategoryMap.MAIN,
  MotionCategoryMap.SUBSIDIARY,
  MotionCategoryMap.PRIVILEGED,
  MotionCategoryMap.INCIDENTAL,
] as const;

interface SelectItem {
  label: string
  value: MotionType
  disabled?: boolean
  type?: 'label'
}

/** 按类别分组的动议类型选项，无发言权时禁用需要发言权的类型。 */
const items = computed<SelectItem[]>(() => {
  const out: SelectItem[] = [];
  for (const category of CATEGORY_ORDER) {
    out.push({ label: MOTION_CATEGORY_LABELS[category], value: -1 as MotionType, type: 'label', disabled: true });
    for (const meta of Object.values(MOTION_META)) {
      if (meta.category !== category)
        continue;
      const disabled = Boolean(props.noFloor && meta.needsFloor);
      out.push({
        label: disabled ? `${meta.label}（需要发言权）` : meta.label,
        value: meta.type,
        disabled,
      });
    }
  }
  return out;
});
</script>

<template>
  <USelectMenu
    v-model="model"
    :items="items"
    value-key="value"
    placeholder="请选择动议类型"
  />
</template>
