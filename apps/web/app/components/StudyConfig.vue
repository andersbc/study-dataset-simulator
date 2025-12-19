<template>
  <v-card class="mb-4">
    <v-card-title>Study Configuration</v-card-title>
    <v-card-text>
      <v-select
        v-model="design.studyType"
        :items="studyTypes"
        label="Study Type"
        variant="outlined"
      ></v-select>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
const design = useStudyDesign()

const studyTypes = ['cross-sectional', 'cohort', 'case-control']
</script>
