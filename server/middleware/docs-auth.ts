import { auth } from '#server/utils/auth';

/** API 文档相关路径：仅登录用户可访问。 */
const DOC_PATHS = ['/_scalar', '/_swagger', '/_openapi.json', '/api/auth/open-api/generate-schema'];

export default defineEventHandler(async (event) => {
  const path = event.path.split('?')[0] ?? '';
  if (!DOC_PATHS.some(prefix => path === prefix || path.startsWith(`${prefix}/`)))
    return;
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session)
    throw createError({ statusCode: 401, message: 'Unauthenticated' });
});
