import { createError, defineEventHandler } from 'h3';
import { getAuth } from '#server/utils/auth';

const DOC_PATHS = ['/_scalar', '/_swagger', '/_openapi.json', '/api/auth/open-api/generate-schema'];

export default defineEventHandler(async (event) => {
  if (import.meta.dev)
    return;
  const path = event.path.split('?')[0] ?? '';
  if (!DOC_PATHS.some(prefix => path === prefix || path.startsWith(`${prefix}/`)))
    return;
  const session = await getAuth().api.getSession({ headers: event.headers });
  if (!session)
    throw createError({ statusCode: 401, message: 'Unauthenticated' });
});
