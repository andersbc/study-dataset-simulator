<template>
  <div class="mb-12">
    <div class="mb-12">
      <AppCard title="Study Configuration">
        <v-select v-model="design.studyType" :items="studyTypes" label="Study Type" variant="outlined"
          hide-details></v-select>
      </AppCard>
    </div>
  </div>
</template>

<script setup lang="ts">
const design = useStudyDesign()

const studyTypes = ['cross-sectional', 'cohort', 'case-control']
</script>
