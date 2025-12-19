<template>
  <div v-if="isPersisted" class="mb-6">
    <v-alert color="info" variant="tonal" density="comfortable" class="d-flex align-center border-dashed"
      style="border-style: dashed !important;">
      <template #prepend>
        <v-icon icon="mdi-cloud-check"></v-icon>
      </template>

      <div class="d-flex flex-wrap align-center justify-space-between w-100">
        <span class="text-body-2 font-weight-medium mr-4">
          Configuration loaded from local storage
        </span>

        <v-btn color="primary" variant="text" size="small" prepend-icon="mdi-restore"
          class="font-weight-bold px-2 ml-auto" @click="showResetDialog = true">
          Reset to Default
        </v-btn>
      </div>
    </v-alert>

    <v-dialog v-model="showResetDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Reset Configuration?</v-card-title>
        <v-card-text>
          This will clear your local storage and reset the study design to its default state.
          All variables and settings will be lost.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" variant="text" @click="showResetDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="confirmReset">Reset</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
const { isPersisted, resetDesign } = useStudyDesignActions()
const showResetDialog = ref(false)

const confirmReset = () => {
  resetDesign()
  showResetDialog.value = false
}
</script>
