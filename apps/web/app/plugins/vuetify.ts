import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'

export default defineNuxtPlugin((nuxtApp) => {
  const vuetify = createVuetify({
    components,
    directives,
    icons: {
      defaultSet: 'mdi',
      aliases,
      sets: {
        mdi,
      },
    },
    theme: {
      defaultTheme: 'dark',
      themes: {
        light: {
          colors: {
            background: '#EEF2F6', // More distinct cool grey
            surface: '#FFFFFF',
            'form-surface': '#F5F5F5', // grey-lighten-4
          },
        },
        dark: {
          colors: {
            background: '#121212', // Standard dark background
            surface: '#1E1E1E', // Slightly lighter surface for cards
            'form-surface': '#424242', // grey-darken-3
          },
        },
      },
    },
    defaults: {
      VCard: {
        rounded: 'lg', // Dialed back from xl
        elevation: 0,
        class: 'soft-shadow_inviting', // Removed pa-6
      },
      VBtn: {
        // rounded: 'lg', // Removed custom rounding for buttons to keep them standard
      }
    }
  })
  nuxtApp.vueApp.use(vuetify)
})
