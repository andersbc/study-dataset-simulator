<template>
  <v-container>
    <v-row>
      <v-col cols="12" class="d-flex align-center justify-space-between">
        <h1 class="text-h4">System Logs</h1>
        <v-switch v-model="showErrorsOnly" label="Errors Only" color="error" hide-details density="compact"
          class="mr-4"></v-switch>
        <div class="d-flex gap-2">
          <v-btn to="/" variant="text" prepend-icon="mdi-arrow-left">Back to Builder</v-btn>
          <v-btn :href="downloadUrl" target="_blank" prepend-icon="mdi-download" color="secondary"
            variant="text">Download All</v-btn>
          <v-btn color="primary" @click="fetchLogs" :loading="loading" prepend-icon="mdi-refresh">Refresh</v-btn>
        </div>
      </v-col>
    </v-row>

    <v-card class="mt-4">
      <v-overlay :model-value="loading" contained class="align-center justify-center">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </v-overlay>
      <v-data-table :headers="headers" :items="filteredLogs" :loading="loading" item-value="timestamp"
        :items-per-page="100">
        <template v-slot:item.timestamp="{ item }">
          {{ formatDate(item.timestamp) }}
        </template>

        <template v-slot:item.result="{ item }">
          <v-chip :color="item.result === 'success' ? 'success' : 'error'" size="small" class="text-uppercase">
            {{ item.result }}
          </v-chip>
        </template>

        <template v-slot:item.details="{ item }">
          <span v-if="item.result === 'success'">{{ item.rows }} rows generated</span>
          <span v-else class="text-error font-weight-bold">{{ item.error }}</span>
        </template>

        <template v-slot:item.variables="{ item }">
          <span class="text-caption">{{ item.variables?.join(', ') || '-' }}</span>
        </template>

        <template v-slot:item.durationMs="{ item }">
          {{ item.durationMs }}ms
        </template>

        <template v-slot:item.actions="{ item }">
          <v-btn v-if="item.fullRequest" size="small" variant="text" icon="mdi-code-json"
            @click="showDetails(item)"></v-btn>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="800">
      <v-card v-if="selectedLog">
        <v-card-title>Request Details</v-card-title>
        <v-card-text>
          <pre class="bg-grey-lighten-4 pa-4 rounded overflow-auto" style="max-height: 500px">{{
            JSON.stringify(selectedLog.fullRequest, null, 2) }}</pre>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="dialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRuntimeConfig } from '#app'

interface LogEntry {
  timestamp: string;
  ip: string;
  variables: string[];
  result: 'success' | 'failure';
  rows?: number;
  error?: string;
  durationMs: number;
  fullRequest?: any;
}

const config = useRuntimeConfig()
const loading = ref(false)
const logs = ref<LogEntry[]>([])
const showErrorsOnly = ref(false)
const filteredLogs = computed(() => {
  if (!showErrorsOnly.value) return logs.value
  return logs.value.filter(log => log.result === 'failure')
})
const dialog = ref(false)
const selectedLog = ref<LogEntry | null>(null)

const downloadUrl = computed(() => `${config.public.apiBase}/logs/download`)

const headers = [
  { title: 'Time', key: 'timestamp', width: '200px' },
  { title: 'IP', key: 'ip', width: '120px' },
  { title: 'Result', key: 'result', width: '100px' },
  { title: 'Details', key: 'details' }, // Computed column for error/rows
  { title: 'Variables', key: 'variables' },
  { title: 'Full Req', key: 'actions', sortable: false },
  { title: 'Duration', key: 'durationMs', align: 'end' as const },
]

async function fetchLogs() {
  loading.value = true
  try {
    // Artificial delay to show spinner (local requests are too fast)
    await new Promise(resolve => setTimeout(resolve, 500));
    const { $api } = useNuxtApp();
    const data = await $api<{ success: boolean, logs: LogEntry[] }>('/logs')
    if (data.success) {
      logs.value = data.logs
    }
  } catch (err) {
    console.error('Failed to fetch logs', err)
  } finally {
    loading.value = false
  }
}

function showDetails(item: LogEntry) {
  selectedLog.value = item
  dialog.value = true
}

function formatDate(timestamp: string) {
  if (!timestamp) return '-'
  const d = new Date(timestamp)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

onMounted(() => {
  fetchLogs()
})
</script>
