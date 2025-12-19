<template>
  <div class="mb-12">
    <div class="text-h5 font-weight-medium mb-4">Study JSON Definition</div>
    <div style="background-color: transparent !important; border: 1px solid rgba(0,0,0,0.12); border-radius: 8px;"
      class="pa-4 text-medium-emphasis">
      <pre
        style="background: transparent !important; border: none !important;"><code style="background: transparent !important;">{{ JSON.stringify(design, null, 2) }}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
const design = useStudyDesign()
</script>
