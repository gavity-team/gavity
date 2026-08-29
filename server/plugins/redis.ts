import { consola } from 'consola';
import { startRedisEventListener } from '#server/utils/event-bus';
import { initGlobalConfigService } from '#server/utils/global-config';

// upstream: https://github.com/nuxt/nuxt/issues/15088
const defineNitroPlugin = (x: any) => x;

export default defineNitroPlugin(async () => {
  consola.debug('Initializing Redis...');
  await initGlobalConfigService();
  await startRedisEventListener();
});
