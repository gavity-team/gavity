import { defineNuxtRouteMiddleware, navigateTo } from '#app';
import { authClient } from '~/utils/auth';

export default defineNuxtRouteMiddleware(async (to) => {
  const { data } = await authClient.getSession();
  if (!data)
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } });
});
