<template>
  <v-card class="mb-4">
    <v-card-title class="d-flex align-center">
      Data Generation
      <v-spacer></v-spacer>
    </v-card-title>

    <v-card-text>
      <div v-if="error" class="text-error mb-4">
        {{ error }}
      </div>

      <div v-if="generatedData" class="mb-4">
        <v-table>
          <thead>
            <tr>
              <th v-for="(val, key) in generatedData[0]" :key="key">{{ key }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in generatedData" :key="i">
              <td v-for="(val, key) in row" :key="key">{{ val }}</td>
            </tr>
          </tbody>
        </v-table>
      </div>

      <div class="d-flex justify-end">
        <v-btn color="primary" @click="generateData" :loading="loading" prepend-icon="mdi-database-refresh">
          Generate Dummy Data (R)
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const loading = ref(false)
const error = ref('')
const generatedData = ref<any[] | null>(null)

const generateData = async () => {
  loading.value = true
  error.value = ''
  generatedData.value = null

  try {
    const config = useRuntimeConfig()
    // Use configured API URL or fallback to localhost
    // Note: In Docker, browser still hits localhost:8000 exposed port, 
    // unless using internal networking for SSR calls. 
    // For client-side fetch, it must be accessible from browser.
    const apiBase = 'http://localhost:8000'

    // TODO: In production, this should be an environment variable 
    // that the client can access (NUXT_PUBLIC_API_BASE).

    const response = await fetch(`${apiBase}/generate`, {
      method: 'POST'
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Failed to generate data')
    }

    generatedData.value = result.data
  } catch (err: any) {
    console.error(err)
    error.value = err.message || 'An unexpected error occurred'
  } finally {
    loading.value = false
  }
}
</script>
