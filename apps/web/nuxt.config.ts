import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import path from 'path'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  future: {
    compatibilityVersion: 4,
  },
  devtools: { enabled: true },
  build: {
    transpile: ['vuetify'],
  },
  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  },
  runtimeConfig: {
    serverApiBase: 'http://api:8000', // Default for server-side (Docker network)
    public: {
      apiBase: 'http://localhost:8000'
    }
  },
  modules: [
    (_options, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', (config) => {
        // @ts-expect-error
        config.plugins.push(vuetify({ autoImport: true }))
      })
    },
  ],
  alias: {
    '@sim-site/shared': path.resolve(__dirname, '../../packages/shared/mod.ts')
  },
  vite: {
    vue: {
      template: {
        transformAssetUrls,
      },
    },
    server: {
      fs: {
        allow: ['../..']
      }
    }
  },
})
