<script setup lang="ts">
import { useHead } from '#imports';

useHead({ title: '服务信息' });
</script>

<template>
  <GlobalConfigForm>
    <GlobalConfigBooleanEntry label="允许注册" field="allowRegistration" />
    <GlobalConfigTextEntry
      label="允许的邮箱地址正则"
      field="allowedUserEmailRegex"
      hint="使用 /pattern/flags 格式，例如 /.*/ 允许所有邮箱"
    />
    <GlobalConfigSmtpEntry label="SMTP URL" field="smtpUrl" />
    <GlobalConfigTextEntry
      label="SMTP 默认发件邮箱"
      field="defaultEmailSender"
      hint="系统发送邮件时默认使用的发件邮箱地址"
    />
  </GlobalConfigForm>
</template>
