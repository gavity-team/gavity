import { version } from './package.json';

export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
  ],

  app: {
    head: {
      title: 'Gavity',
      meta: [
        { name: 'description', content: '基于罗伯特议事规则的会议协作工具' },
      ],
      htmlAttrs: { lang: 'zh-CN' },
    },
  },

  css: ['~/app.css'],

  compatibilityDate: '2026-07-23',

  ssr: false,

  imports: {
    autoImport: false,
  },

  nitro: {
    preset: 'bun',

    experimental: {
      websocket: true,
      openAPI: true,
    },

    openAPI: {
      meta: {
        title: 'Gavity API',
        description: '基于罗伯特议事规则的会议协作工具',
        version,
      },
      // upstream: https://github.com/better-auth/better-auth/issues/8125
      production: 'runtime',
      // upstream: https://github.com/nitrojs/nitro/issues/4492#issuecomment-5120753163
      // then,
      // upstream: https://github.com/unjs/openapi-renderer/issues/27
      ui: {},
    },
  },

  fonts: {
    provider: 'bunny',
    providers: {
      google: false,
      googleicons: false,
    },
  },

  icon: {
    clientBundle: {
      scan: true,
    },
  },
});
