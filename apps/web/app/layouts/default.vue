<template>
  <v-app>
    <v-app-bar height="80" color="primary">
      <template #prepend>
        <AppLogo class="text-white ml-2" height="56" width="56" />
      </template>

      <v-app-bar-title class="font-weight-bold">
        <div class="text-h6 text-sm-h5">Study Dataset Simulator</div>
      </v-app-bar-title>

      <template #append>
        <template v-if="route.path !== '/logs' && route.path !== '/admin'">
          <v-btn icon="mdi-undo" variant="text" :disabled="!canUndo" @click="undo" v-tooltip="'Undo'"
            class="mr-2"></v-btn>
          <v-btn icon="mdi-redo" variant="text" :disabled="!canRedo" @click="redo" v-tooltip="'Redo'"
            class="mr-2"></v-btn>
          <v-divider vertical class="mx-2 my-auto" style="height: 24px"></v-divider>
        </template>
        <v-btn icon="mdi-github" href="https://github.com/andersbc/study-dataset-simulator" target="_blank"
          v-tooltip="'View Source'"></v-btn>
        <v-btn :icon="theme.global.name.value === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
          @click="toggleTheme" v-tooltip="'Toggle Theme'"></v-btn>

        <v-divider vertical class="mx-2 my-auto" style="height: 24px" v-if="isAuthenticated"></v-divider>
        <v-btn v-if="isAuthenticated" icon="mdi-logout" @click="logout" v-tooltip="'Logout'" variant="text"></v-btn>
      </template>
    </v-app-bar>
    <v-main>
      <v-container class="mx-auto" style="max-width: 1200px">
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useTheme } from 'vuetify'
import { useStudyHistory } from '~/composables/useStudyDesign'
import { useAuth } from '~/composables/useAuth'

const { undo, redo, canUndo, canRedo } = useStudyHistory()
const { isAuthenticated, logout } = useAuth()
const route = useRoute()

const theme = useTheme()

const toggleTheme = () => {
  const newVal = theme.global.name.value === 'dark' ? 'light' : 'dark'
    ; (theme as any).change(newVal)
  localStorage.setItem('theme', newVal)
}

useStudyPersistence()


onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    ; (theme as any).change(savedTheme)
  }

  // Listen for changes in other tabs
  window.addEventListener('storage', (event) => {
    if (event.key === 'theme' && event.newValue) {
      ; (theme as any).change(event.newValue)
    }
  })
})


</script>

<style>
/* Global styles */
.soft-shadow_inviting {
  box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.1) !important;
  /* Reduced spread (40->20) and opacity */
  /* Border removed for cleaner "floating" look */
}

/* Ensure dark mode shadow is visible but subtle */
.v-theme--dark .soft-shadow_inviting {
  box-shadow: 0 4px 20px -5px rgba(0, 0, 0, 0.4) !important;
  /* Reduced opacity */
}
</style>
