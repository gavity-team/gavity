import { defineNuxtRouteMiddleware, navigateTo } from '#app';
import { authClient } from '~/utils/auth';

/** 多人会议页要求登录，未登录跳登录页并携带回跳地址。 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { data } = await authClient.getSession();
  if (!data) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } });
  }
});
