<template>
  <div class="d-flex flex-column flex-md-row mb-12 mt-4 text-center text-md-left align-center">
    <AppLogo class="mb-4 mb-md-0 mr-md-8 flex-grow-0 text-primary mx-auto mx-md-0"
      :class="isAlignedTop ? 'align-self-md-start' : 'align-self-md-center'"
      style="max-width: 180px; min-width: 120px; width: 100%; height: auto;" />
    <div class="flex-grow-1">
      <h1 class="text-h4 text-sm-h3 text-md-h2 font-weight-bold text-primary">
        Study Dataset Simulator
      </h1>
      <p class="text-subtitle-1 text-sm-h6 text-medium-emphasis mt-2" style="max-width: 600px">
        Define your study parameters and variables below to generate synthetic datasets.
        <a href="#" @click.prevent="showInfo = !showInfo"
          class="text-decoration-none font-weight-bold ml-1 text-primary">
          What is this useful for?
        </a>
      </p>

      <v-expand-transition @after-leave="isAlignedTop = false">
        <div v-if="showInfo" class="mt-4">
          <v-sheet class="pa-4 rounded bg-primary border text-subtitle-1 text-sm-h6 text-white text-left"
            style="max-width: 700px">
            <p class="mb-2">
              This tool helps you create realistic datasets without needing to collect actual data. You can use it for:
            </p>
            <ul class="ml-4 mb-2">
              <li><strong>Testing Analysis Pipelines:</strong> Perform analyses on datasets before you have your
                real data.</li>
              <li><strong>Teaching & Learning:</strong> Demonstrate statistical concepts or practice analysis techniques
                safely.</li>
              <li><strong>Power Analysis:</strong> Explore how different effect sizes and sample sizes might look.</li>
            </ul>
            <p class="mt-2">
              Click "How to use the tool" below if you need help getting started.
            </p>
          </v-sheet>
        </div>
      </v-expand-transition>
    </div>
    <div class="flex-grow-0 d-flex flex-column align-end ml-4 gap-2">
      <v-btn to="/logs" variant="text" size="small" prepend-icon="mdi-history">
        Logs
      </v-btn>
      <v-btn color="error" variant="text" size="small" prepend-icon="mdi-restart" @click="reset">
        New Study
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const { resetDesign } = useStudyDesignActions()

const showInfo = ref(false)
const isAlignedTop = ref(false)

const reset = () => {
  if (confirm("Are you sure you want to start a new study? This will clear all variables and settings.")) {
    resetDesign()
  }
}

watch(showInfo, (val) => {
  if (val) isAlignedTop.value = true
})
</script>

<style scoped>
/* Optional specific overrides if needed, but Vuetify utility classes should suffice */
</style>
