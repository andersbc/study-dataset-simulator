<template>
  <v-app>
    <v-app-bar title="Study Design Simulator" color="primary">
      <template v-slot:append>
        <v-btn :icon="theme.global.name.value === 'dark' ? 'mdi-weather-night' : 'mdi-weather-sunny'"
          @click="toggleTheme"></v-btn>
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

const theme = useTheme()

const toggleTheme = () => {
  const newVal = theme.global.name.value === 'dark' ? 'light' : 'dark'
  theme.global.name.value = newVal
  localStorage.setItem('theme', newVal)
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    theme.global.name.value = savedTheme
  }

  // Listen for changes in other tabs
  window.addEventListener('storage', (event) => {
    if (event.key === 'theme' && event.newValue) {
      theme.global.name.value = event.newValue
    }
  })
})

</script>
