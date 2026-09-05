import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { defineNuxtPlugin } from '#app';

export default defineNuxtPlugin((nuxt) => {
  nuxt.vueApp.use(VueQueryPlugin, {
    queryClient: new QueryClient(),
    enableDevtoolsV6Plugin: import.meta.dev,
  });
});
