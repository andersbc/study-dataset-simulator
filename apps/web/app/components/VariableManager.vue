<template>
  <div>

    <AppCard>
      <template #title>
        <div class="d-flex justify-space-between align-center">
          <div class="text-h5 font-weight-medium">Variables</div>
        </div>
      </template>

      <div v-if="design.variables && design.variables.length > 0">
        <ClientOnly>
          <draggable v-model="design.variables" handle=".drag-handle" item-key="name" ghost-class="ghost-card"
            fallback-class="drag-card" :force-fallback="true">
            <template #item="{ element: variable, index }">
              <VariableCard :model-value="variable"
                :start-expanded="!variable.name || recentlyAddedNames.has(variable.name)"
                :is-new="!variable.name || recentlyAddedNames.has(variable.name)"
                @update:model-value="(val) => handleUpdate(index, val)" @remove="() => handleRemove(index)" />
            </template>
          </draggable>
        </ClientOnly>
      </div>
      <v-alert v-else type="info" variant="tonal" class="mt-2">
        No variables yet. Click "Add Variable" to start.
      </v-alert>

      <template #actions>
        <v-spacer></v-spacer>
        <v-btn v-if="design.variables && design.variables.length > 0" color="error" variant="text"
          prepend-icon="mdi-delete-sweep" @click="showClearDialog = true" class="mr-2">
          Clear All
        </v-btn>
        <v-btn color="secondary" variant="flat" prepend-icon="mdi-playlist-plus" @click="startAddInstrument">Add
          Instrument</v-btn>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" class="ml-6" @click="startAddVariable">Add
          Variable</v-btn>
      </template>
    </AppCard>

    <v-dialog v-model="showClearDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6">Clear all variables?</v-card-title>
        <v-card-text>This action cannot be undone. All variables and instruments will be removed.</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" variant="text" @click="showClearDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="confirmClear">Clear All</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <EffectManager />
  </div>
</template>

<script setup lang="ts">
import { type } from 'arktype'
import draggable from 'vuedraggable'
import {
  type Variable, type Instrument,
  VAR_CONTINUOUS, VAR_ORDINAL, DIST_NORMAL
} from '@sim-site/shared'

const design = useStudyDesign()
const { addVariable, removeVariable, updateVariable, clearVariables, getAllUsedNames } = useStudyDesignActions()

const showClearDialog = ref(false)
const confirmClear = () => {
  clearVariables()
  showClearDialog.value = false
}

const recentlyAddedNames = ref(new Set<string>())

const generateUniqueName = (prefix: string) => {
  const existingNames = getAllUsedNames()
  let counter = 1
  while (existingNames.has(`${prefix}_${counter}`)) {
    counter++
  }
  return `${prefix}_${counter}`
}

const startAddVariable = () => {
  const newName = generateUniqueName('var')
  recentlyAddedNames.value.add(newName)

  const defaultVar = {
    // @ts-ignore
    kind: 'variable',
    name: newName,
    dataType: VAR_CONTINUOUS,
    distribution: { type: DIST_NORMAL, mean: 0, stdDev: 1 },
    categories: []
  }

  addVariable(defaultVar as Variable)
}

const startAddInstrument = () => {
  const newName = generateUniqueName('ins')
  recentlyAddedNames.value.add(newName)

  const defaultInstrument = {
    kind: 'instrument',
    name: newName,
    dataType: VAR_ORDINAL,
    distribution: { type: DIST_NORMAL, mean: 0, stdDev: 1 },
    categories: [],
    items: [],
    scales: []
  }

  addVariable(defaultInstrument as Instrument)
}

const handleUpdate = (index: number, val: Variable | Instrument) => {
  if (design.value.variables && design.value.variables[index]) {
    const oldName = design.value.variables[index].name
    recentlyAddedNames.value.delete(oldName)
  }
  updateVariable(index, val)
}

const handleRemove = (index: number) => {
  removeVariable(index)
}
</script>

<style scoped>
.cursor-move {
  cursor: move;
}

.ghost-card {
  opacity: 0.5;
}

.drag-card {
  opacity: 1 !important;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0px 5px 5px -3px var(--v-shadow-key-umbra-opacity, rgba(0, 0, 0, 0.2)), 0px 8px 10px 1px var(--v-shadow-key-penumbra-opacity, rgba(0, 0, 0, 0.14)), 0px 3px 14px 2px var(--v-shadow-key-ambient-opacity, rgba(0, 0, 0, 0.12));
}

.ghost-item {
  opacity: 0.5;
  background: rgb(var(--v-theme-primary), 0.1);
  border: 1px dashed rgb(var(--v-theme-primary));
}

.drag-item {
  background: rgb(var(--v-theme-surface));
  box-shadow: 0px 3px 5px -1px rgba(0, 0, 0, 0.2), 0px 6px 10px 0px rgba(0, 0, 0, 0.14), 0px 1px 18px 0px rgba(0, 0, 0, 0.12);
}
</style>