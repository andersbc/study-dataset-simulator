<template>
  <v-container>
    <PageHeader title="Administration Page" icon="mdi-shield-crown" />

    <v-tabs v-model="tab" color="primary" class="mb-6">
      <v-tab value="settings" prepend-icon="mdi-cog">Settings</v-tab>
      <v-tab value="logs" prepend-icon="mdi-file-document-multiple">System Logs</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <!-- SETTINGS TAB -->
      <v-window-item value="settings">
        <v-row>
          <v-col cols="12">
            <AppCard title="Authentication Settings">

              <!-- Alerts -->
              <v-alert v-if="error" type="error" variant="tonal" class="mb-4" closable @click:close="error = ''">
                {{ error }}
              </v-alert>
              <v-alert v-if="success" type="success" variant="tonal" class="mb-4" closable @click:close="success = ''">
                {{ success }}
              </v-alert>

              <!-- Auth Toggle -->
              <v-sheet class="d-flex align-center justify-space-between mb-6 pa-4 rounded border">
                <div>
                  <div class="text-subtitle-1 font-weight-bold">Site Access Protection</div>
                  <div class="text-caption text-medium-emphasis">
                    Require a password for general visitors to access the simulator.
                    <br>
                    <span class="text-warning font-weight-medium" v-if="!form.authEnabled">
                      <v-icon icon="mdi-alert" size="x-small" start />
                      Warning: Site is currently public.
                    </span>
                  </div>
                </div>
                <v-switch v-model="form.authEnabled" color="primary" hide-details inset
                  :label="form.authEnabled ? 'Enabled' : 'Disabled'"></v-switch>
              </v-sheet>

              <!-- Password Field -->
              <v-expand-transition>
                <div v-if="form.authEnabled">
                  <div class="text-subtitle-2 mb-2">Guest Access Password</div>
                  <v-text-field v-model="form.accessPassword" :type="showPassword ? 'text' : 'password'"
                    label="Password" variant="outlined" density="comfortable"
                    hint="Password shared with users to access the site" persistent-hint
                    :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                    @click:append-inner="showPassword = !showPassword"></v-text-field>
                </div>
              </v-expand-transition>

              <template #actions>
                <div class="d-flex justify-end w-100">
                  <v-btn variant="text" @click="resetForm" :disabled="loading" class="mr-2">Discard Changes</v-btn>
                  <v-btn color="primary" variant="flat" :loading="loading" @click="saveSettings">
                    Save Configuration
                  </v-btn>
                </div>
              </template>
            </AppCard>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- LOGS TAB -->
      <v-window-item value="logs">
        <AppCard class="pa-0">
          <!-- Custom Header with Controls -->
          <template #title>
            <div class="d-flex align-center justify-space-between w-100">
              <div class="d-flex align-center">
                <span class="text-h5 font-weight-medium mr-4">Application Logs</span>
                <v-divider vertical class="mx-4 hidden-sm-and-down" style="height: 24px"></v-divider>

                <v-switch v-model="logsShowErrorsOnly" label="Show Errors Only" color="error" hide-details
                  density="compact" class="ml-2"></v-switch>
              </div>

              <div class="d-flex gap-2">
                <v-btn :href="logsDownloadUrl" target="_blank" prepend-icon="mdi-download" color="secondary"
                  variant="text">Download All</v-btn>
                <v-btn color="error" variant="text" prepend-icon="mdi-delete" @click="confirmClear = true">
                  Clear Logs
                </v-btn>
                <v-btn color="primary" @click="fetchLogs" :loading="logsLoading"
                  prepend-icon="mdi-refresh">Refresh</v-btn>
              </div>
            </div>
          </template>

          <!-- Table -->
          <template #default>
            <v-data-table :headers="logsHeaders" :items="filteredLogs" :loading="logsLoading" item-value="timestamp"
              :items-per-page="100">
              <template v-slot:item.timestamp="{ item }">
                {{ formatDate(item.timestamp) }}
              </template>
              <template v-slot:item.result="{ item }">
                <v-chip :color="item.result === 'success' ? 'success' : 'error'" size="small" class="text-uppercase"
                  label>
                  {{ item.result }}
                </v-chip>
              </template>
              <template v-slot:item.details="{ item }">
                <span v-if="item.result === 'success'">{{ item.rows }} rows generated</span>
                <span v-else class="text-error font-weight-bold">{{ item.error }}</span>
              </template>
              <template v-slot:item.variables="{ item }">
                <span class="text-caption text-medium-emphasis">{{ item.variables?.join(', ') || '-' }}</span>
              </template>
              <template v-slot:item.durationMs="{ item }">
                <span class="text-caption font-weight-medium">{{ item.durationMs }} ms</span>
              </template>
              <template v-slot:item.actions="{ item }">
                <v-btn v-if="item.fullRequest" size="small" variant="text" icon="mdi-code-json"
                  @click="showLogDetails(item)"></v-btn>
              </template>
            </v-data-table>
          </template>
        </AppCard>
      </v-window-item>
    </v-window>

    <!-- Log Details Dialog -->
    <v-dialog v-model="logDialog" max-width="800">
      <v-card v-if="selectedLog">
        <v-card-title class="d-flex justify-space-between align-center">
          Request Payload
          <v-btn icon="mdi-close" variant="text" @click="logDialog = false"></v-btn>
        </v-card-title>
        <v-card-text class="pa-0">
          <pre class="bg-grey-darken-4 text-white pa-4 overflow-auto"
            style="max-height: 500px; font-family: monospace; font-size: 0.85rem;">{{
              JSON.stringify(selectedLog.fullRequest, null, 2) }}</pre>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Clear Logs Confirmation -->
    <v-dialog v-model="confirmClear" max-width="400">
      <v-card title="Clear all logs?">
        <v-card-text>
          This will permanently delete all current log entries. This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text="Cancel" variant="text" @click="confirmClear = false"></v-btn>
          <v-btn text="Clear All" color="error" variant="flat" @click="clearLogs"></v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: [
    function (to, from) {
      const { isAdmin } = useAuth();
      if (!isAdmin.value) {
        return navigateTo({
          path: '/login',
          query: {
            redirect: to.fullPath
          }
        });
      }
    }
  ]
});

const { isAdmin, token, siteAuthEnabled } = useAuth();
const router = useRouter();
const config = useRuntimeConfig();

const tab = ref('settings');

// --- SETTINGS LOGIC ---
const loading = ref(false);
const error = ref('');
const success = ref('');
const showPassword = ref(false);

const form = reactive({
  authEnabled: true,
  accessPassword: ''
});

async function loadConfig() {
  // Triple check permissions before loading data
  if (!isAdmin.value) return;

  loading.value = true;
  try {
    const apiBase = import.meta.client ? config.public.apiBase : config.serverApiBase;
    const headers = { 'X-Sim-Auth': token.value || '' };
    const data = await $fetch<{ authEnabled: boolean, accessPassword?: string }>(`${apiBase}/admin/config`, { headers });

    form.authEnabled = data.authEnabled;
    form.accessPassword = data.accessPassword || '';

  } catch (e) {
    console.error("Failed to load config", e);
    error.value = "Failed to load configuration. Ensure you are logged in as Admin.";
  } finally {
    loading.value = false;
  }
}
// ... (rest of code) ...
// Init
onMounted(() => {
  loadConfig();
  fetchLogs();
});

async function saveSettings() {
  loading.value = true;
  error.value = '';
  success.value = '';

  try {
    const apiBase = import.meta.client ? config.public.apiBase : config.serverApiBase;
    const headers = { 'X-Sim-Auth': token.value || '' };

    await $fetch(`${apiBase}/admin/config`, {
      method: 'POST',
      headers,
      body: {
        authEnabled: form.authEnabled,
        accessPassword: form.accessPassword
      }
    });

    success.value = "Settings saved successfully.";
    // Update global state if it changed
    if (siteAuthEnabled.value !== form.authEnabled) {
      siteAuthEnabled.value = form.authEnabled;
    }
  } catch (e) {
    console.error("Failed to save", e);
    error.value = "Failed to save settings.";
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  loadConfig();
}

// --- LOGS LOGIC ---
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

const logsLoading = ref(false);
const logs = ref<LogEntry[]>([]);
const logsShowErrorsOnly = ref(false);
const logDialog = ref(false);
const confirmClear = ref(false);
const selectedLog = ref<LogEntry | null>(null);

const logsDownloadUrl = computed(() => `${config.public.apiBase}/logs/download?token=${encodeURIComponent(token.value || '')}`);
const logsHeaders = [
  { title: 'Time', key: 'timestamp', width: '180px' },
  { title: 'IP', key: 'ip', width: '120px' },
  { title: 'Result', key: 'result', width: '100px' },
  { title: 'Details', key: 'details' },
  { title: 'Variables', key: 'variables' },
  { title: 'Full Req', key: 'actions', sortable: false },
  { title: 'Duration', key: 'durationMs', align: 'end' as const },
];

const filteredLogs = computed(() => {
  if (!logsShowErrorsOnly.value) return logs.value;
  return logs.value.filter(log => log.result === 'failure');
});

function formatDate(timestamp: string) {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function fetchLogs() {
  logsLoading.value = true;
  try {
    const apiBase = import.meta.client ? config.public.apiBase : config.serverApiBase;
    const headers = { 'X-Sim-Auth': token.value || '' };

    const data = await $fetch<{ success: boolean, logs: LogEntry[] }>(`${apiBase}/logs`, { headers });
    if (data.success) {
      logs.value = data.logs;
    }
  } catch (err) {
    console.error('Failed to fetch logs', err);
  } finally {
    logsLoading.value = false;
  }
}

function showLogDetails(item: LogEntry) {
  selectedLog.value = item;
  logDialog.value = true;
}

async function clearLogs() {
  confirmClear.value = false;
  logsLoading.value = true;
  try {
    const apiBase = import.meta.client ? config.public.apiBase : config.serverApiBase;
    const headers = { 'X-Sim-Auth': token.value || '' };

    await $fetch(`${apiBase}/logs`, { method: 'DELETE', headers });
    await fetchLogs(); // Refresh list
  } catch (err) {
    console.error('Failed to clear logs', err);
  } finally {
    logsLoading.value = false;
  }
}

// Init
onMounted(() => {
  if (!isAdmin.value) {
    router.push({ path: '/login', query: { redirect: '/admin' } });
  } else {
    loadConfig();
    fetchLogs();
  }
});
</script>
