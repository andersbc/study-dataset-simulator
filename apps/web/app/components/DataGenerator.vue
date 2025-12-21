<template>
  <AppCard title="Data Generation">
    <div class="d-flex align-center flex-wrap gap-4 mb-4">
      <div class="flex-grow-1 d-flex justify-start align-center">
        <v-text-field v-model.number="sampleSize" label="N (Sample Size)" type="number" variant="outlined"
          density="compact" hide-details class="mr-4" style="max-width: 150px" min="1" max="10000"></v-text-field>

        <v-btn variant="tonal" class="mr-2" @click="downloadScript" prepend-icon="mdi-file-code">
          Download R Script
        </v-btn>
        <v-btn color="primary" @click="generateData" :loading="loading" prepend-icon="mdi-database-refresh">
          Generate Dummy Data (R)
        </v-btn>
      </div>
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4" density="compact" closable
      @click:close="error = ''">
      {{ error }}
    </v-alert>

    <div v-if="generatedData" class="mt-4">
      <div class="text-subtitle-2 mb-2">Generated Preview (first {{ PREVIEW_LIMIT }} cases)</div>
      <v-table density="compact" class="border rounded">
        <thead>
          <tr>
            <th v-for="(val, key) in generatedData[0]" :key="key">{{ key }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in generatedData.slice(0, PREVIEW_LIMIT)" :key="i">
            <td v-for="(val, key) in row" :key="key">{{ val }}</td>
          </tr>
        </tbody>
      </v-table>
      <div v-if="generatedData.length > PREVIEW_LIMIT" class="text-caption text-medium-emphasis text-center mt-2">
        Showing first {{ PREVIEW_LIMIT }} of {{ generatedData.length }} records
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { generateRScript, validateStudyDesign, MAX_GENERATION_N, PREVIEW_LIMIT } from '@sim-site/shared'

const loading = ref(false)
const error = ref('')
const generatedData = ref<any[] | null>(null)
const sampleSize = ref(100)

const validateSampleSize = (): boolean => {
  if (sampleSize.value > MAX_GENERATION_N) {
    error.value = `Sample size cannot exceed ${MAX_GENERATION_N}, but you can download the R script and run it locally with larger sample sizes.`;
    return false;
  }
  return true;
}

const downloadScript = () => {
  const design = useStudyDesign()
  error.value = ''

  if (!validateSampleSize()) return;

  const validation = validateStudyDesign(design.value)
  if (!validation.valid) {
    error.value = "Validation Error: " + validation.errors.map(e => e.message).join(', ')
    return
  }

  try {
    const scriptContent = generateRScript(design.value, sampleSize.value)
    const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', 'simulation_script.R')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (e: any) {
    error.value = "Failed to generate script: " + e.message
  }
}

const generateData = async () => {
  loading.value = true
  error.value = ''
  generatedData.value = null

  try {
    const design = useStudyDesign()

    if (!validateSampleSize()) {
      // Since the helper sets state but we need to throw to stop execution here in the try/catch flow properly or just return.
      // Actually validateSampleSize returns boolean.
      // However, the original code threw an Error to be caught below. 
      // The new helper sets `error.value` directly. 
      // So we should just throw the current error.value or simply return if we handle error display via the reactive variable.
      // But below we catch errors and set error.value again.
      // Let's just throw with the message we just set.
      throw new Error(error.value);
    }

    // Client-side validation
    const validation = validateStudyDesign(design.value)
    if (!validation.valid) {
      throw new Error("Validation Error: " + validation.errors.map(e => e.message).join(', '))
    }
    const { $api } = useNuxtApp()
    // $api handles baseURL and auth headers automatically via plugin
    const result = await $api<any>('/generate', {
      method: 'POST',
      body: {
        design: design.value,
        n: sampleSize.value
      }
    })

    // Result is already parsed JSON by $fetch/$api


    if (!result.success) {
      throw new Error(result.error || 'Failed to generate data')
    }

    generatedData.value = result.data
    downloadCSV(result.data)
  } catch (err: any) {
    console.error(err)
    error.value = err.message || 'An unexpected error occurred'
  } finally {
    loading.value = false
  }
}

const downloadCSV = (data: any[]) => {
  if (!data || data.length === 0) return

  // Extract headers
  const headers = Object.keys(data[0])

  // Build CSV content
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row => {
      return headers.map(fieldName => {
        let val = row[fieldName] ?? ''
        // Escape quotes and commas
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          val = `"${val.replace(/"/g, '""')}"`
        }
        return val
      }).join(',')
    })
  ]

  const csvContent = csvRows.join('\n')

  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', 'study_data.csv')
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>
