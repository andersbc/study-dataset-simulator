<template>
  <v-card variant="outlined" :class="bgClass">
    <v-card-title>Study Design JSON Definition</v-card-title>
    <v-card-text>
      <pre><code>{{ JSON.stringify(design, null, 2) }}</code></pre>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { useTheme } from 'vuetify'

const design = useStudyDesign()
const theme = useTheme()

const bgClass = computed(() => {
  return theme.global.name.value === 'dark' ? 'bg-grey-darken-4' : 'bg-grey-lighten-4'
})
</script>
