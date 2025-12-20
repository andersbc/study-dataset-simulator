<template>
  <AppCard title="Effects (Relationships)">
    <div v-if="design.effects && design.effects.length > 0" class="mb-4">
      <div v-for="(effect, index) in design.effects" :key="effect.id" class="d-flex align-center py-2 border-b">
        <div class="flex-grow-1">
          <span class="font-weight-bold">{{ effect.source }}</span>
          <v-icon class="mx-2">mdi-arrow-left-right</v-icon>
          <span class="font-weight-bold">{{ effect.target }}</span>
          <span class="ml-4 text-medium-emphasis">Correlation: {{ effect.coefficient }}</span>
        </div>
        <v-btn icon="mdi-delete" variant="text" color="error" size="small" @click="removeEffect(index)"></v-btn>
      </div>
    </div>
    <div v-else class="text-medium-emphasis mb-4 text-body-2">
      No relationships defined. Add one below.
    </div>

    <!-- Add Effect Form -->
    <v-sheet class="bg-grey-lighten-4 pa-4 rounded">
      <div class="text-subtitle-2 mb-2">New Relationship</div>
      <div class="d-flex align-center gap-4">
        <v-select v-model="newEffect.source" :items="variableNames" label="Variable A" density="compact" hide-details
          class="flex-grow-1 mr-2" variant="outlined" bg-color="white"></v-select>

        <v-select v-model="newEffect.target" :items="variableNames" label="Variable B" density="compact" hide-details
          class="flex-grow-1 mr-2" variant="outlined" bg-color="white"></v-select>

        <v-text-field v-model.number="newEffect.coefficient" label="Correlation (r)" type="number" min="-1" max="1"
          step="0.1" density="compact" hide-details class="flex-grow-1 mr-2" variant="outlined"
          bg-color="white"></v-text-field>

        <v-btn color="primary" icon="mdi-plus" @click="addEffect" :disabled="!isValid"></v-btn>
      </div>
    </v-sheet>
  </AppCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { EFFECT_CORRELATION, type Effect } from '@sim-site/shared'

const design = useStudyDesign()

const variableNames = computed(() => {
  return design.value.variables?.map(v => v.name).filter(n => n) || []
})

const newEffect = ref<{ source: string, target: string, coefficient: number }>({
  source: '',
  target: '',
  coefficient: 0.5
})

const isValid = computed(() => {
  return newEffect.value.source &&
    newEffect.value.target &&
    newEffect.value.source !== newEffect.value.target &&
    newEffect.value.coefficient >= -1 &&
    newEffect.value.coefficient <= 1
})

const addEffect = () => {
  if (!isValid.value) return

  const effect: Effect = {
    id: crypto.randomUUID(),
    type: EFFECT_CORRELATION,
    source: newEffect.value.source,
    target: newEffect.value.target,
    coefficient: newEffect.value.coefficient
  }

  if (!design.value.effects) {
    design.value.effects = []
  }

  design.value.effects.push(effect)

  // Reset (keep coefficient as convenience)
  newEffect.value.source = ''
  newEffect.value.target = ''
}

const removeEffect = (index: number) => {
  if (design.value.effects) {
    design.value.effects.splice(index, 1)
  }
}
</script>
