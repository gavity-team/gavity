import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2';
import { i18n } from '@better-auth/i18n';
import { betterAuth } from 'better-auth/minimal';
import { openAPI } from 'better-auth/plugins';
import { createAccessControl } from 'better-auth/plugins/access';
import { admin } from 'better-auth/plugins/admin';
import { defaultStatements } from 'better-auth/plugins/admin/access';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { createError } from 'h3';
import { getEnvConfig } from '#server/utils/env';
import { toCachedFn } from '#shared/utils/fn';
import { getDb } from './db';
import * as schema from './db/schema';
import { queueEmailSending } from './email';
import { generateCode } from './id';

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

const accessControl = createAccessControl(defaultStatements);

const adminRole = accessControl.newRole({
  user: ['create', 'list', 'set-role', 'ban', 'impersonate', 'delete', 'set-password', 'set-email', 'get', 'update'],
  session: ['list', 'revoke', 'delete'],
});

const userRole = accessControl.newRole({
  user: [],
  session: [],
});

export const getAuth = toCachedFn(() => {
  const env = getEnvConfig();

  return betterAuth({
    database: drizzleAdapter(getDb(), {
      provider: 'pg',
      schema,
      usePlural: true,
    }),

    baseURL: env.EXTERNAL_URL,

    secret: env.SECRET,

    advanced: {
      database: {
        generateId: ({ model }) => generateCode(model === 'user' ? 8 : 16),
        join: true,
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

    user: {
      changeEmail: {
        enabled: true,
      },
    },

    emailVerification: {
      autoSignInAfterVerification: true,
      sendOnSignUp: true,
      sendOnSignIn: false,
    },

    plugins: [
      admin({
        ac: accessControl,
        roles: {
          admin: adminRole,
          user: userRole,
        },
        adminRoles: ['admin'],
        defaultRole: 'user',
      }),

      emailOTP({
        sendVerificationOnSignUp: true,
        overrideDefaultEmailVerification: true,
        resendStrategy: 'reuse',
        async sendVerificationOTP({ email, otp, type }) {
          const subject = type === 'forget-password' ? 'Gavity 密码重置验证码' : 'Gavity 邮箱验证码';
          await queueEmailSending(email, subject, `你的验证码是 ${otp}，5 分钟内有效。若非本人操作，请忽略本邮件。`);
        },
      }),

      i18n({
        defaultLocale: 'zh',
        translations: { zh: ZH_TRANSLATIONS },
      }),

      openAPI({ disableDefaultReference: true }),
    ],

    trustedOrigins: [
      env.EXTERNAL_URL,
    ],
  });
});

export type Auth = ReturnType<typeof getAuth>;
export type AuthenticationResult = Auth['$Infer']['Session'];
export type Session = AuthenticationResult['session'];
export type User = AuthenticationResult['user'];

export async function requireAuthenticated(headers: Headers): Promise<AuthenticationResult> {
  const session = await getAuth().api.getSession({ headers });
  if (!session)
    throw createError({ status: 401, message: '请先登录' });
  return session;
}

export function hasAdminRole(user: User): boolean {
  const roles = user.role?.split(',') ?? [];
  return roles.includes('admin');
}

export function requireAdminRole(authen: AuthenticationResult): void {
  if (!hasAdminRole(authen.user))
    throw createError({ status: 403, message: '无权限访问' });
}

export function requireVerifiedSession(authen: AuthenticationResult): void {
  if (!authen.user.emailVerified)
    throw createError({ status: 403, message: '请先完成邮箱验证' });
}
