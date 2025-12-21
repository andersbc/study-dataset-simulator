<template>
  <AppCard title="Study Design">
    <v-select v-model="design.studyType" :items="studyTypes" label="Study Type" variant="outlined"
      hide-details></v-select>

    <div class="mt-4">
      <div class="text-subtitle-2 mb-2">Study Type Options</div>
      <div class="text-body-2 text-medium-emphasis border rounded pa-3 bg-surface-light">
        Work in progress (only cross-section supported for now)
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
const design = useStudyDesign()

const studyTypes = ['cross-sectional', 'cohort', 'case-control']
</script>
