<template>
  <div class="mb-12">

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
              <v-card class="mb-3 pa-3 variable-card" variant="outlined">
                <div class="d-flex align-center">
                  <v-icon icon="mdi-drag" size="48" class="drag-handle cursor-move mr-4 text-medium-emphasis"></v-icon>

                  <div class="flex-grow-1">
                    <div class="d-flex align-center">
                      <v-icon v-if="variable.kind === 'instrument'" icon="mdi-playlist-check" class="mr-2"
                        color="secondary" size="small"></v-icon>
                      <div class="text-subtitle-1 font-weight-medium">{{ variable.name }}</div>
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ variable.kind === 'instrument' ? `Instrument (${variable.items?.length || 0} items) •
                      ${variable.dataType}` : variable.dataType }}
                    </div>
                  </div>

                  <div class="d-flex">
                    <v-btn variant="text" size="small" color="primary" icon @click="openEditDialog(index)">
                      <v-icon>mdi-pencil</v-icon>
                      <v-tooltip activator="parent" location="top">Edit</v-tooltip>
                    </v-btn>
                    <v-btn variant="text" size="small" color="error" icon @click="removeVariable(index)">
                      <v-icon>mdi-delete</v-icon>
                      <v-tooltip activator="parent" location="top">Delete</v-tooltip>
                    </v-btn>
                  </div>
                </div>
              </v-card>
            </template>
          </draggable>
        </ClientOnly>
      </div>
      <v-alert v-else type="info" variant="tonal" class="mt-2">
        No variables yet. Click "Add Variable" to start.
      </v-alert>

      <template #actions>
        <v-spacer></v-spacer>
        <v-btn color="secondary" variant="flat" prepend-icon="mdi-playlist-plus" @click="openInstrumentDialog">Add
          Instrument</v-btn>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" class="ml-6" @click="openDialog">Add
          Variable</v-btn>
      </template>
    </AppCard>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>
          {{ editingIndex !== null ? (newVar.kind === 'instrument' ? 'Edit Instrument' : 'Edit Variable') :
            (newVar.kind
              ===
              'instrument' ? 'Add Instrument' : 'Add Variable') }}
        </v-card-title>
        <v-card-text>
          <v-text-field v-model="newVar.name" :label="newVar.kind === 'instrument' ? 'Instrument Name' : 'Name'"
            variant="outlined" class="mb-2" :rules="[rules.variableName]"></v-text-field>
          <v-select v-model="newVar.dataType" :items="dataTypeOptions" label="Data Type" variant="outlined"></v-select>

          <v-select v-if="newVar.dataType" v-model="newVar.distribution.type" :items="availableDistributions"
            label="Distribution" variant="outlined" class="mt-2"></v-select>

          <template v-if="newVar.distribution?.type === DIST_NORMAL">
            <v-row class="mt-2">
              <v-col cols="6">
                <v-text-field v-model.number="newVar.distribution.mean" label="Mean" type="number" variant="outlined"
                  hide-details="auto" :rules="[rules.numeric]"></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field v-model.number="newVar.distribution.stdDev" label="Std Dev" type="number"
                  variant="outlined" hide-details="auto" :rules="[rules.positive]"></v-text-field>
              </v-col>
            </v-row>
          </template>

          <template v-if="newVar.distribution?.type === DIST_UNIFORM && newVar.dataType === VAR_CONTINUOUS">
            <v-row class="mt-2">
              <v-col cols="6">
                <v-text-field v-model.number="newVar.distribution.min" label="Min" type="number" variant="outlined"
                  hide-details="auto" :rules="[rules.numeric]"></v-text-field>
              </v-col>
              <v-col cols="6">
                <v-text-field v-model.number="newVar.distribution.max" label="Max" type="number" variant="outlined"
                  hide-details="auto" :rules="[rules.numeric]"></v-text-field>
              </v-col>
            </v-row>
          </template>

          <template v-if="[VAR_NOMINAL, VAR_ORDINAL].includes(newVar.dataType || '')">
            <div class="mt-4">
              <div class="d-flex justify-space-between align-center mb-2">
                <div class="text-subtitle-1">
                  {{ newVar.kind === 'instrument' ? 'Shared Response Scale' : 'Categories' }}
                  <span class="text-caption text-medium-emphasis">(Min 2)</span>
                </div>
                <v-btn v-if="newVar.dataType === VAR_ORDINAL" size="small" variant="text" color="primary"
                  prepend-icon="mdi-creation" @click="generateLevels">
                  Generate (0-4)
                </v-btn>
              </div>

              <div class="d-flex gap-2 mb-2">
                <v-text-field v-model="newCategory" label="Add Category" variant="outlined" density="compact"
                  :error-messages="newVar.categories?.includes(newCategory) ? 'Category already exists' : ''"
                  hide-details="auto" @keydown.enter.prevent="addCategory"></v-text-field>
                <v-btn color="primary" icon="mdi-plus" size="small" class="mt-1 ml-2" @click="addCategory"
                  :disabled="!newCategory || newVar.categories?.includes(newCategory)">
                  <v-tooltip activator="parent" location="top">Add Category</v-tooltip>
                </v-btn>
              </div>

              <ClientOnly>
                <div class="category-list-container border rounded pa-2 mt-2">
                  <draggable v-model="newVar.categories" handle=".cat-drag-handle" item-key="self"
                    ghost-class="ghost-item" drag-class="drag-item">
                    <template #item="{ element: category, index }">
                      <div class="d-flex align-center py-2 px-2 category-item">
                        <v-icon icon="mdi-drag" class="cat-drag-handle cursor-move mr-2 text-medium-emphasis"></v-icon>

                        <!-- Ordinal Index -->
                        <v-chip v-if="newVar.dataType === VAR_ORDINAL" size="small" color="primary" variant="flat"
                          class="mr-3 font-weight-bold" style="min-width: 32px; justify-content: center;">
                          {{ index }}
                        </v-chip>

                        <v-text-field v-model="newVar.categories[index]" variant="plain" density="compact"
                          hide-details="auto" class="flex-grow-1"
                          :error-messages="isCategoryDuplicate(newVar.categories[index], index) ? 'Duplicate' : ''"></v-text-field>

                        <v-btn icon="mdi-close" variant="text" size="small" color="error" density="comfortable"
                          @click="removeCategory(index)">
                          <v-tooltip activator="parent" location="top">Remove Category</v-tooltip>
                        </v-btn>
                      </div>
                    </template>
                  </draggable>
                  <div v-if="(!newVar.categories || newVar.categories.length === 0)"
                    class="text-caption text-medium-emphasis text-center py-4">
                    No categories added. Type above to add.
                  </div>
                </div>
              </ClientOnly>
              <div v-if="rules.categories(newVar.categories) !== true" class="text-error text-caption mt-1">
                {{ rules.categories(newVar.categories) }}
              </div>
            </div>
          </template>

          <template v-if="newVar.kind === 'instrument'">
            <div class="mt-4 border-t pt-4">
              <div class="text-h6 mb-2">Instrument Items</div>

              <v-row align="center" dense>
                <v-col cols="4">
                  <v-text-field v-model="itemPrefix" label="Prefix (e.g. Q)" density="compact" hide-details
                    variant="outlined"></v-text-field>
                </v-col>
                <v-col cols="3">
                  <v-text-field v-model.number="itemCount" type="number" label="Count" density="compact" hide-details
                    variant="outlined"></v-text-field>
                </v-col>
                <v-col cols="5">
                  <v-btn color="secondary" block prepend-icon="mdi-creation" @click="generateItems">Generate
                    Items</v-btn>
                </v-col>
              </v-row>

              <div class="mt-3 item-list-container border rounded pa-2" v-if="newVar.items && newVar.items.length > 0">
                <draggable v-model="newVar.items" handle=".item-drag-handle" item-key="id" ghost-class="ghost-item">
                  <template #item="{ element: item, index }">
                    <div class="d-flex align-center py-1 item-row">
                      <v-icon icon="mdi-drag" class="item-drag-handle cursor-move mr-2 text-medium-emphasis"
                        size="small"></v-icon>
                      <v-text-field v-model="item.name" density="compact" variant="plain" hide-details
                        class="flex-grow-1"></v-text-field>

                      <v-tooltip location="top" text="Reverse Keyed">
                        <template v-slot:activator="{ props }">
                          <v-btn v-bind="props" :color="item.reverse ? 'warning' : 'default'"
                            :variant="item.reverse ? 'flat' : 'text'" icon="mdi-swap-vertical" size="x-small"
                            density="comfortable" @click="item.reverse = !item.reverse"></v-btn>
                        </template>
                      </v-tooltip>

                      <v-btn icon="mdi-close" variant="text" size="small" color="error" density="comfortable"
                        @click="newVar.items.splice(index, 1)"></v-btn>
                    </div>
                  </template>
                </draggable>
              </div>
              <v-alert v-else type="info" variant="text" density="compact" class="mt-2">
                No items generated yet.
              </v-alert>
            </div>
          </template>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="secondary" variant="text" @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="save" :disabled="!isValid">{{ editingIndex !== null ? 'Save' : 'Add'
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { type } from 'arktype'
import draggable from 'vuedraggable'
import {
  type Variable, type VariableType, ValidDistributions, DefaultDistributions, CategoryList, PositiveNumber, SafeNumber, VariableName,
  VAR_CONTINUOUS, VAR_NOMINAL, VAR_ORDINAL, DIST_NORMAL, DIST_UNIFORM,
  type Instrument, type InstrumentItem, InstrumentSchema
} from '@sim-site/shared'

const design = useStudyDesign()
const { addVariable, removeVariable, updateVariable } = useStudyDesignActions()

const dataTypeOptions = [
  { title: 'Continuous', value: VAR_CONTINUOUS, props: { prependIcon: 'mdi-chart-bell-curve' } },
  { title: 'Ordinal', value: VAR_ORDINAL, props: { prependIcon: 'mdi-sort-ascending' } },
  { title: 'Nominal', value: VAR_NOMINAL, props: { prependIcon: 'mdi-tag-outline' } }
]

const dialog = ref(false)
// Initialize with a valid default state (Continuous -> Normal)
const newVar = ref<any>({
  name: '',
  dataType: VAR_CONTINUOUS,
  distribution: { type: DIST_NORMAL, mean: 0, stdDev: 1 }
})

const validateArk = (schema: any, val: any) => {
  const res = schema(val)
  return !(res instanceof type.errors) || res.summary
}

const rules = {
  numeric: (v: number) => validateArk(SafeNumber, v),
  positive: (v: number) => validateArk(PositiveNumber, v),
  categories: (v: string[]) => {
    if (validateArk(CategoryList, v) !== true) return "At least 2 categories required"
    if (new Set(v).size !== v.length) return "Categories must be unique"
    return true
  },
  variableName: (v: string) => {
    if (validateArk(VariableName, v) !== true) return "Invalid name format (no spaces, can't start with number, max 70 chars)"

    const isDuplicate = design.value.variables?.some((existing: Variable, i: number) => {
      // If editing, ignore the variable being edited (by index)
      if (editingIndex.value !== null && i === editingIndex.value) return false
      return existing.name === v
    })

    if (isDuplicate) return "Variable name must be unique (there is another variable with this name)"
    return true
  }
}

// Watch dataType to set correct default distribution
watch(() => newVar.value.dataType, (newType) => {
  if (!newType) return
  const defaultDist = DefaultDistributions[newType as keyof typeof DefaultDistributions]

  if (defaultDist === DIST_NORMAL) {
    newVar.value.distribution = { type: DIST_NORMAL, mean: 0, stdDev: 1 }
  } else {
    // For continuous, we need min/max. For others (categorical), just type.
    if (newType === VAR_CONTINUOUS) {
      newVar.value.distribution = { type: DIST_UNIFORM, min: 0, max: 1 }
    } else {
      newVar.value.distribution = { type: DIST_UNIFORM }
    }
  }
})

const availableDistributions = computed(() => {
  if (!newVar.value.dataType) return []
  return ValidDistributions[newVar.value.dataType as VariableType] || []
})

const isValid = computed(() => {
  if (!newVar.value.name || !newVar.value.dataType || !newVar.value.distribution) return false
  if (rules.variableName(newVar.value.name) !== true) return false

  // Validate Distribution Params
  if (newVar.value.distribution.type === 'normal') {
    if (validateArk(SafeNumber, newVar.value.distribution.mean) !== true) return false
    if (validateArk(PositiveNumber, newVar.value.distribution.stdDev) !== true) return false
  }
  if (newVar.value.distribution.type === 'uniform') {
    // Only constant/continuous uniform has min/max
    if (newVar.value.dataType === VAR_CONTINUOUS) {
      if (validateArk(SafeNumber, newVar.value.distribution.min) !== true) return false
      if (validateArk(SafeNumber, newVar.value.distribution.max) !== true) return false
    }
  }

  if (newVar.value.dataType === 'continuous') return true

  if (['nominal', 'ordinal'].includes(newVar.value.dataType)) {
    return rules.categories(newVar.value.categories) === true
  }
  return false
})

const editingIndex = ref<number | null>(null)

const isCategoryDuplicate = (val: string, index: number) => {
  return newVar.value.categories?.some((c: string, i: number) => c === val && i !== index)
}

const newCategory = ref('')
const addCategory = () => {
  if (newCategory.value && !newVar.value.categories?.includes(newCategory.value)) {
    if (!newVar.value.categories) newVar.value.categories = []
    newVar.value.categories.push(newCategory.value)
    newCategory.value = ''
  }
}

const removeCategory = (index: number) => {
  newVar.value.categories?.splice(index, 1)
}

const generateLevels = () => {
  newVar.value.categories = ['0', '1', '2', '3', '4']
}

const itemPrefix = ref('Q')
const itemCount = ref(5)

const generateItems = () => {
  if (!newVar.value.items) newVar.value.items = []

  for (let i = 1; i <= itemCount.value; i++) {
    newVar.value.items.push({
      id: crypto.randomUUID(),
      name: `${itemPrefix.value}${i}`,
      reverse: false
    })
  }
}

const openEditDialog = (index: number) => {
  const variable = design.value.variables?.[index]
  if (!variable) return

  newVar.value = JSON.parse(JSON.stringify(variable)) // Deep copy
  editingIndex.value = index
  dialog.value = true
}

const openDialog = () => {
  newVar.value = {
    // @ts-ignore
    kind: 'variable',
    name: '',
    dataType: VAR_CONTINUOUS,
    distribution: { type: DIST_NORMAL, mean: 0, stdDev: 1 },
    categories: []
  }
  editingIndex.value = null
  dialog.value = true
}

const openInstrumentDialog = () => {
  newVar.value = {
    kind: 'instrument',
    name: '',
    dataType: VAR_ORDINAL, // Default to Ordinal for instruments
    distribution: { type: DIST_NORMAL, mean: 0, stdDev: 1 },
    categories: [],
    items: []
  }
  editingIndex.value = null
  dialog.value = true
}

const save = () => {
  if (isValid.value) {
    if (editingIndex.value !== null) {
      updateVariable(editingIndex.value, newVar.value as Variable | Instrument)
    } else {
      addVariable(newVar.value as Variable | Instrument)
    }
    dialog.value = false
  }
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