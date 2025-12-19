<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center mb-6">
          <v-img src="/logo.svg" max-width="80" height="80" class="mr-6"></v-img>
          <div>
            <h1 class="text-h3 font-weight-bold">Study Dataset Simulator</h1>
            <p class="text-subtitle-1 text-medium-emphasis mt-1">Define your study parameters and variables below.</p>
          </div>
        </div>
      </v-col>
    </v-row>

    <StudyConfig />

    <v-divider class="my-6"></v-divider>

    <VariableManager />

    <v-divider class="my-6"></v-divider>

    <JsonPreview />
  </v-container>
</template>

<script setup lang="ts">
// Components will be auto-imported
</script>
