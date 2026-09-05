import { startRedisEventListener } from '#server/utils/event-bus';
import { initGlobalConfigService } from '#server/utils/global-config';

// upstream: https://github.com/nuxt/nuxt/issues/15088
const defineNitroPlugin = (x: any) => x;

export default defineNitroPlugin(async () => {
  await initGlobalConfigService();
  await startRedisEventListener();
});
