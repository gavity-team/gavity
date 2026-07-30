<script setup lang="ts">
const route = useRoute();

// 登录 / 注册 双模式，支持 ?mode=register 直达注册
const mode = ref<'signin' | 'register'>(route.query.mode === 'register' ? 'register' : 'signin');
// form：填写表单；verify：输入邮箱验证码
const step = ref<'form' | 'verify'>('form');
const name = ref('');
const email = ref('');
const password = ref('');
const otpDigits = ref<string[]>([]);
const pending = ref(false);
const errorMessage = ref('');
const resendCooldown = ref(0);
let resendTimer: ReturnType<typeof setInterval> | undefined;

const isRegister = computed(() => mode.value === 'register');

function toggleMode(): void {
  mode.value = isRegister.value ? 'signin' : 'register';
  errorMessage.value = '';
}

const redirect = computed(() => {
  const target = route.query.redirect;
  return typeof target === 'string' && target.startsWith('/') ? target : '/';
});

// 已登录则直接进入目标页
onMounted(async () => {
  const { data } = await authClient.getSession();
  if (data)
    await navigateTo(redirect.value);
});

onUnmounted(() => clearInterval(resendTimer));

function startResendCooldown(): void {
  clearInterval(resendTimer);
  resendCooldown.value = 60;
  resendTimer = setInterval(() => {
    resendCooldown.value--;
    if (resendCooldown.value <= 0)
      clearInterval(resendTimer);
  }, 1000);
}

function enterVerify(): void {
  step.value = 'verify';
  otpDigits.value = [];
  errorMessage.value = '';
  startResendCooldown();
}

function backToForm(): void {
  step.value = 'form';
  otpDigits.value = [];
  errorMessage.value = '';
}

async function onSubmit(): Promise<void> {
  if (pending.value)
    return;
  errorMessage.value = '';
  pending.value = true;
  const { error } = isRegister.value
    ? await authClient.signUp.email({
        name: name.value.trim(),
        email: email.value.trim(),
        password: password.value,
      })
    : await authClient.signIn.email({
        email: email.value.trim(),
        password: password.value,
      });
  if (error) {
    if (error.code === 'EMAIL_NOT_VERIFIED') {
      // 邮箱未验证：补发验证码并进入验证步骤
      await authClient.emailOtp.sendVerificationOtp({ email: email.value.trim(), type: 'email-verification' });
      pending.value = false;
      enterVerify();
      return;
    }
    pending.value = false;
    // 错误文案由后端 i18n 插件提供
    errorMessage.value = error.message ?? (isRegister.value ? '注册失败，请稍后重试' : '登录失败，请稍后重试');
    return;
  }
  pending.value = false;
  if (isRegister.value) {
    // 注册需验证邮箱，注册时已自动发送验证码
    enterVerify();
    return;
  }
  await navigateTo(redirect.value);
}

async function onVerify(): Promise<void> {
  if (pending.value)
    return;
  const otp = otpDigits.value.join('');
  if (otp.length !== 6) {
    errorMessage.value = '请输入完整的 6 位验证码';
    return;
  }
  errorMessage.value = '';
  pending.value = true;
  // 验证成功后服务端自动建立会话（autoSignInAfterVerification）
  const { error } = await authClient.emailOtp.verifyEmail({ email: email.value.trim(), otp });
  pending.value = false;
  if (error) {
    errorMessage.value = error.message ?? '验证失败，请稍后重试';
    return;
  }
  await navigateTo(redirect.value);
}

async function onResend(): Promise<void> {
  if (resendCooldown.value > 0)
    return;
  errorMessage.value = '';
  const { error } = await authClient.emailOtp.sendVerificationOtp({ email: email.value.trim(), type: 'email-verification' });
  if (error) {
    errorMessage.value = error.message ?? '发送失败，请稍后重试';
    return;
  }
  startResendCooldown();
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-default p-4">
    <div class="w-full max-w-sm">
      <div class="flex items-center gap-2.5">
        <div class="flex size-9 items-center justify-center bg-primary text-inverted">
          <UIcon name="i-lucide-gavel" class="size-5" />
        </div>
        <div>
          <div class="text-base font-semibold text-highlighted">
            {{ step === 'verify' ? '验证邮箱' : (isRegister ? '注册 Gavity' : '登录 Gavity') }}
          </div>
          <div class="text-xs text-muted">
            {{ step === 'verify' ? `验证码已发送至 ${email}` : '基于罗伯特议事规则的会议工具' }}
          </div>
        </div>
      </div>

      <form v-if="step === 'form'" class="mt-6 space-y-4" @submit.prevent="onSubmit">
        <UFormField v-if="isRegister" label="昵称">
          <UInput
            v-model="name"
            placeholder="在会议中显示的名字"
            icon="i-lucide-user"
            size="lg"
            class="w-full"
            required
            autocomplete="nickname"
          />
        </UFormField>
        <UFormField label="邮箱">
          <UInput
            v-model="email"
            type="email"
            placeholder="name@example.com"
            icon="i-lucide-mail"
            size="lg"
            class="w-full"
            required
            autocomplete="email"
          />
        </UFormField>
        <UFormField label="密码">
          <UInput
            v-model="password"
            type="password"
            :placeholder="isRegister ? '至少 8 位' : '请输入密码'"
            icon="i-lucide-lock"
            size="lg"
            class="w-full"
            required
            :minlength="isRegister ? 8 : undefined"
            :autocomplete="isRegister ? 'new-password' : 'current-password'"
          />
        </UFormField>

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          :title="errorMessage"
        />

        <UButton
          type="submit"
          :label="isRegister ? '注册' : '登录'"
          size="lg"
          block
          :loading="pending"
        />
      </form>

      <form v-else class="mt-6 space-y-4" @submit.prevent="onVerify">
        <UFormField label="邮箱验证码">
          <UPinInput
            v-model="otpDigits"
            :length="6"
            otp
            type="number"
            size="lg"
            autofocus
          />
        </UFormField>

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          :title="errorMessage"
        />

        <UButton
          type="submit"
          label="验证并登录"
          size="lg"
          block
          :loading="pending"
        />

        <div class="flex items-center justify-between text-sm">
          <UButton variant="link" size="sm" color="neutral" icon="i-lucide-arrow-left" label="返回" @click="backToForm" />
          <UButton
            variant="link"
            size="sm"
            :disabled="resendCooldown > 0"
            :label="resendCooldown > 0 ? `重新发送（${resendCooldown}s）` : '重新发送验证码'"
            @click="onResend"
          />
        </div>
      </form>

      <div v-if="step === 'form'" class="mt-4 text-center text-sm text-muted">
        {{ isRegister ? '已有账号？' : '还没有账号？' }}
        <UButton variant="link" size="sm" :label="isRegister ? '去登录' : '注册新账号'" @click="toggleMode" />
      </div>

      <div class="mt-6 text-center">
        <UButton to="/demo" variant="link" color="neutral" size="sm" icon="i-lucide-play-circle">
          无需登录，进入单人演示
        </UButton>
      </div>
    </div>
  </div>
</template>
