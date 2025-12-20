<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <PageHeader />
      </v-col>
    </v-row>

    <PersistenceNotice />
    <StudyConfig />
    <VariableManager />
    <DataGenerator />
    <JsonPreview />
  </v-container>
</template>

<script setup lang="ts">
// Components will be auto-imported
</script>
