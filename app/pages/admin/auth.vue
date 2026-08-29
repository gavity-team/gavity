<script setup lang="ts">
import { useHead } from '#imports';

useHead({ title: '身份验证' });
</script>

<template>
  <GlobalConfigForm>
    <GlobalConfigTextEntry
      label="验证邮件发件人"
      field="verificationEmailSender"
      hint="发送密码重置、邮箱验证邮件时使用的发件邮箱地址"
    />
  </GlobalConfigForm>
</template>
