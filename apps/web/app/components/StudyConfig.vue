<template>
  <div class="mb-12">
    <div class="text-h5 font-weight-medium mb-4">Study Configuration</div>
    <v-card class="pa-4">
      <v-select v-model="design.studyType" :items="studyTypes" label="Study Type" variant="outlined"
        hide-details></v-select>
    </v-card>
  </div>
</template>

<script setup lang="ts">
const design = useStudyDesign()

const studyTypes = ['cross-sectional', 'cohort', 'case-control']
</script>
