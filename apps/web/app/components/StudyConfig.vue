<template>
  <AppCard title="Study Configuration">
    <v-select v-model="design.studyType" :items="studyTypes" label="Study Type" variant="outlined"
      hide-details></v-select>
  </AppCard>
</template>

<script setup lang="ts">
const design = useStudyDesign()

const studyTypes = ['cross-sectional', 'cohort', 'case-control']
</script>
