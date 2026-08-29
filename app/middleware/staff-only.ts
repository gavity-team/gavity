import { abortNavigation, createError, defineNuxtRouteMiddleware } from '#app';
import { authClient } from '~/utils/auth';

export default defineNuxtRouteMiddleware(async () => {
  const { data } = await authClient.getSession();
  const roles = data?.user.role?.split(',') || [];
  if (!roles.includes('staff'))
    return abortNavigation(createError({ status: 403, message: '无权限访问' }));
});
