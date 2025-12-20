<template>
  <AppCard title="Data Generation">
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
  </AppCard>
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
    // Default to configured URL
    let apiBase = config.public.apiBase

    // Smart fallback: If we are on the client (browser), and the config says 'localhost'
    // but we are actually visiting a remote IP/domain, assume API is on port 8000 of the same host.
    if (import.meta.client && apiBase.includes('localhost') && window.location.hostname !== 'localhost') {
      apiBase = `${window.location.protocol}//${window.location.hostname}:8000`
    }

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
