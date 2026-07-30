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
      production: 'runtime',
      ui: {
        scalar: {
          sources: [
            { title: 'Main', url: '/_openapi.json' },
            { title: 'Auth', url: '/api/auth/open-api/generate-schema' },
          ],
        },
      },
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
