import process from 'node:process';
import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2';
import { i18n } from '@better-auth/i18n';
import { betterAuth } from 'better-auth/minimal';
import { openAPI } from 'better-auth/plugins';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { db } from './db';
import * as schema from './db/schema';
import { generateCode } from './id';
import { sendMail } from './mail';

/** 错误文案统一由服务端下发中文，前端直接展示 error.message。 */
const ZH_TRANSLATIONS = {
  USER_NOT_FOUND: '用户不存在',
  INVALID_EMAIL_OR_PASSWORD: '邮箱或密码错误',
  INVALID_PASSWORD: '密码错误',
  INVALID_EMAIL: '邮箱格式无效',
  USER_ALREADY_EXISTS: '该邮箱已被注册',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: '该邮箱已被注册，请更换邮箱',
  EMAIL_NOT_VERIFIED: '邮箱尚未验证',
  EMAIL_ALREADY_VERIFIED: '邮箱已完成验证',
  PASSWORD_TOO_SHORT: '密码过短，至少 8 位',
  PASSWORD_TOO_LONG: '密码过长',
  SESSION_EXPIRED: '会话已过期，请重新登录',
  CREDENTIAL_ACCOUNT_NOT_FOUND: '该账号不支持密码登录',
  FAILED_TO_CREATE_USER: '创建用户失败，请稍后重试',
  FAILED_TO_CREATE_SESSION: '创建会话失败，请稍后重试',
  VALIDATION_ERROR: '请求参数有误',
  MISSING_FIELD: '缺少必填字段',
  OTP_EXPIRED: '验证码已过期，请重新获取',
  INVALID_OTP: '验证码错误',
  TOO_MANY_ATTEMPTS: '尝试次数过多，请重新获取验证码',
};

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
    usePlural: true,
  }),

  baseURL: process.env.EXTERNAL_URL!,

  advanced: {
    database: {
      generateId: ({ model }) => generateCode(model === 'user' ? 8 : 16),
    },
    ipAddress: {
      trustedProxies: [
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16',
        '127.0.0.1/32',
      ],
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  emailVerification: {
    autoSignInAfterVerification: true,
  },

  plugins: [
    emailOTP({
      sendVerificationOnSignUp: true,
      overrideDefaultEmailVerification: true,
      resendStrategy: 'reuse',
      async sendVerificationOTP({ email, otp, type }) {
        const subject = type === 'forget-password' ? 'Gavity 密码重置验证码' : 'Gavity 邮箱验证码';
        await sendMail(email, subject, `你的验证码是 ${otp}，5 分钟内有效。若非本人操作，请忽略本邮件。`);
      },
    }),

    i18n({
      defaultLocale: 'zh',
      translations: { zh: ZH_TRANSLATIONS },
    }),

    openAPI({ disableDefaultReference: true }),
  ],

  trustedOrigins: [
    'https://gavity.localhost',
    process.env.EXTERNAL_URL!,
  ],
});

/** 校验登录态与邮箱验证状态，未通过时抛出 HTTP 错误。 */
export async function requireVerifiedSession(headers: Headers): Promise<NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>> {
  const session = await auth.api.getSession({ headers });
  if (!session) {
    throw createError({ statusCode: 401, message: '请先登录' });
  }
  if (!session.user.emailVerified) {
    throw createError({ statusCode: 403, message: '请先完成邮箱验证' });
  }
  return session;
}
