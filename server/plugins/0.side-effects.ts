import { consola, LogLevels } from 'consola';
import { getEnvConfig } from '#server/utils/env';

// upstream: https://github.com/nuxt/nuxt/issues/15088
const defineNitroPlugin = (x: any) => x;

export default defineNitroPlugin(async () => {
  const env = getEnvConfig();
  consola.level = LogLevels[env.LOG_LEVEL];
  consola.wrapStd();
});
