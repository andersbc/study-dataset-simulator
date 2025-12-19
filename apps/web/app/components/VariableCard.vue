<template>
  <div class="mb-3">
    <!-- Edit Mode -->
    <v-card v-if="isEditing" class="pa-3 variable-card border-primary" variant="outlined" style="border-width: 2px;">
      <v-card-text class="pa-2">
        <div class="d-flex justify-space-between align-center mb-4">
          <div class="text-h6">{{ cardTitle }}</div>
        </div>

        <v-text-field v-model="localVar.name" :label="localVar.kind === 'instrument' ? 'Instrument Name' : 'Name'"
          variant="outlined" class="mb-2" :rules="[rules.variableName]"></v-text-field>
        <v-select v-model="localVar.dataType" :items="dataTypeOptions" label="Data Type" variant="outlined"></v-select>

        <v-select v-if="localVar.dataType" v-model="localVar.distribution.type" :items="availableDistributions"
          label="Distribution" variant="outlined" class="mt-2"></v-select>

        <template v-if="localVar.distribution?.type === DIST_NORMAL">
          <v-row class="mt-2">
            <v-col cols="6">
              <v-text-field v-model.number="localVar.distribution.mean" label="Mean" type="number" variant="outlined"
                hide-details="auto" :rules="[rules.numeric]"></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field v-model.number="localVar.distribution.stdDev" label="Std Dev" type="number"
                variant="outlined" hide-details="auto" :rules="[rules.positive]"></v-text-field>
            </v-col>
          </v-row>
        </template>

        <template v-if="localVar.distribution?.type === DIST_UNIFORM && localVar.dataType === VAR_CONTINUOUS">
          <v-row class="mt-2">
            <v-col cols="6">
              <v-text-field v-model.number="localVar.distribution.min" label="Min" type="number" variant="outlined"
                hide-details="auto" :rules="[rules.numeric]"></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field v-model.number="localVar.distribution.max" label="Max" type="number" variant="outlined"
                hide-details="auto" :rules="[rules.numeric]"></v-text-field>
            </v-col>
          </v-row>
        </template>

        <template v-if="[VAR_NOMINAL, VAR_ORDINAL].includes(localVar.dataType || '')">
          <div class="mt-4">
            <div class="d-flex justify-space-between align-center mb-2">
              <div class="text-subtitle-1">
                {{ localVar.kind === 'instrument' ? 'Shared Response Scale' : 'Categories' }}
                <span class="text-caption text-medium-emphasis">(Min 2)</span>
              </div>
              <v-btn v-if="localVar.dataType === VAR_ORDINAL" size="small" variant="text" color="primary"
                prepend-icon="mdi-creation" @click="generateLevels">
                Generate (0-4)
              </v-btn>
            </div>

            <div class="d-flex gap-2 mb-2">
              <v-text-field v-model="newCategory" label="Add Category" variant="outlined" density="compact"
                :error-messages="localVar.categories?.includes(newCategory) ? 'Category already exists' : ''"
                hide-details="auto" @keydown.enter.prevent="addCategory"></v-text-field>
              <v-btn color="primary" icon="mdi-plus" size="small" class="mt-1 ml-2" @click="addCategory"
                :disabled="!newCategory || localVar.categories?.includes(newCategory)">
                <v-tooltip activator="parent" location="top">Add Category</v-tooltip>
              </v-btn>
            </div>

            <ClientOnly>
              <div class="category-list-container border rounded pa-2 mt-2">
                <draggable v-model="localVar.categories" handle=".cat-drag-handle" item-key="self"
                  ghost-class="ghost-item" drag-class="drag-item">
                  <template #item="{ element: category, index }">
                    <div class="d-flex align-center py-2 px-2 category-item">
                      <v-icon icon="mdi-drag" class="cat-drag-handle cursor-move mr-2 text-medium-emphasis"></v-icon>

                      <!-- Ordinal Index -->
                      <v-chip v-if="localVar.dataType === VAR_ORDINAL" size="small" color="primary" variant="flat"
                        class="mr-3 font-weight-bold" style="min-width: 32px; justify-content: center;">
                        {{ index }}
                      </v-chip>

                      <v-text-field v-model="localVar.categories[index]" variant="plain" density="compact"
                        hide-details="auto" class="flex-grow-1"
                        :error-messages="isCategoryDuplicate(localVar.categories[index], index) ? 'Duplicate' : ''"></v-text-field>

                      <v-btn icon="mdi-close" variant="text" size="small" color="error" density="comfortable"
                        @click="removeCategory(index)">
                        <v-tooltip activator="parent" location="top">Remove Category</v-tooltip>
                      </v-btn>
                    </div>
                  </template>
                </draggable>
                <div v-if="(!localVar.categories || localVar.categories.length === 0)"
                  class="text-caption text-medium-emphasis text-center py-4">
                  No categories added. Type above to add.
                </div>
              </div>
            </ClientOnly>
            <div v-if="rules.categories(localVar.categories) !== true" class="text-error text-caption mt-1">
              {{ rules.categories(localVar.categories) }}
            </div>
          </div>
        </template>

        <template v-if="localVar.kind === 'instrument'">
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

            <div class="mt-3 item-list-container border rounded pa-2"
              v-if="localVar.items && localVar.items.length > 0">
              <draggable v-model="localVar.items" handle=".item-drag-handle" item-key="id" ghost-class="ghost-item">
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
                      @click="localVar.items.splice(index, 1)"></v-btn>
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
        <v-btn color="secondary" variant="text" @click="cancel">Cancel</v-btn>
        <v-btn color="primary" @click="save" :disabled="!isValid">Save</v-btn>
      </v-card-actions>
    </v-card>

    <!-- View Mode -->
    <v-card v-else class="pa-3 variable-card cursor-pointer" variant="outlined" @click="startEdit" link>
      <div class="d-flex align-center">
        <v-icon icon="mdi-drag" size="48" class="drag-handle cursor-move mr-4 text-medium-emphasis"></v-icon>

        <div class="flex-grow-1">
          <div class="d-flex align-center">
            <v-icon v-if="variable.kind === 'instrument'" icon="mdi-playlist-check" class="mr-2" color="secondary"
              size="small"></v-icon>
            <div class="text-subtitle-1 font-weight-medium">{{ variable.name }}</div>
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ variable.kind === 'instrument' ? `Instrument (${variable.items?.length || 0} items) •
            ${variable.dataType}` : variable.dataType }}
          </div>
        </div>

        <div class="d-flex">
          <v-btn variant="text" size="small" color="primary" icon @click.stop="startEdit">
            <v-icon>mdi-pencil</v-icon>
            <v-tooltip activator="parent" location="top">Edit</v-tooltip>
          </v-btn>
          <v-btn variant="text" size="small" color="error" icon @click.stop="$emit('remove')">
            <v-icon>mdi-delete</v-icon>
            <v-tooltip activator="parent" location="top">Delete</v-tooltip>
          </v-btn>
        </div>
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { type } from 'arktype'
// @ts-expect-error
import draggable from 'vuedraggable'
import {
  type Variable, type VariableType, ValidDistributions, DefaultDistributions, CategoryList, PositiveNumber, SafeNumber, VariableName,
  VAR_CONTINUOUS, VAR_NOMINAL, VAR_ORDINAL, DIST_NORMAL, DIST_UNIFORM,
  type Instrument, type InstrumentItem, InstrumentSchema
} from '@sim-site/shared'

const props = defineProps<{
  modelValue: Variable | Instrument
  startExpanded?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Variable | Instrument): void
  (e: 'remove'): void
}>()

// Use a computed for 'variable' to be consistent with existing template code
const variable = computed(() => props.modelValue)

const isEditing = ref(props.startExpanded || false)
// Buffer for edits
const localVar = ref<any>(JSON.parse(JSON.stringify(props.modelValue)))

// Reset local var when modelValue changes externally (if we aren't editing)
watch(() => props.modelValue, (newVal) => {
  if (!isEditing.value) {
    localVar.value = JSON.parse(JSON.stringify(newVal))
  }
}, { deep: true })

const design = useStudyDesign()

const dataTypeOptions = [
  { title: 'Continuous', value: VAR_CONTINUOUS, props: { prependIcon: 'mdi-chart-bell-curve' } },
  { title: 'Ordinal', value: VAR_ORDINAL, props: { prependIcon: 'mdi-sort-ascending' } },
  { title: 'Nominal', value: VAR_NOMINAL, props: { prependIcon: 'mdi-tag-outline' } }
]

const validateArk = (schema: any, val: any) => {
  const res = schema(val)
  return !(res instanceof type.errors) || res.summary
}

// NOTE: Moved rules here. 
// Ideally design-wide duplicate checks should still check the designStore, which we can access.
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

    // Check duplicates against GLOBAL design list, ensuring we don't count ourselves.
    // If we have an ID, we could check ID. But Variable type has no ID.
    // So we rely on: if the name exists and is NOT equal to our ORIGINAL name (props.modelValue.name), it's a dupe.
    // Wait, if we rename 'A' to 'B', and 'B' exists, that's a dupe.
    // If we rename 'A' to 'A' (no change), that's fine.

    // We can iterate design.value.variables
    const isDuplicate = design.value.variables?.some((existing: Variable) => {
      // If the existing name matches the new name
      if (existing.name === v) {
        // AND it's not the same variable we started with
        if (existing.name === props.modelValue.name) return false
        return true
      }
      return false
    })

    if (isDuplicate) return "Variable name must be unique"
    return true
  }
}

// Watch dataType to set correct default distribution
watch(() => localVar.value.dataType, (newType, oldType) => {
  if (!newType || newType === oldType) return
  // Only reset distribution if type ACTUALLY changed to avoid overwriting on init
  const defaultDist = DefaultDistributions[newType as keyof typeof DefaultDistributions]

  if (defaultDist === DIST_NORMAL) {
    localVar.value.distribution = { type: DIST_NORMAL, mean: 0, stdDev: 1 }
  } else {
    // For continuous, we need min/max. For others (categorical), just type.
    if (newType === VAR_CONTINUOUS) {
      localVar.value.distribution = { type: DIST_UNIFORM, min: 0, max: 1 }
    } else {
      localVar.value.distribution = { type: DIST_UNIFORM }
    }
  }
})

const cardTitle = computed(() => {
  // If the variable has no name yet, it's likely "Add". Otherwise "Edit".
  // Or we can infer from checking if it exists in the original list?
  // Let's just say if props.startExpanded is true AND name was empty, it's Add.
  // user wants "Add" vs "Edit" titles.
  // Actually, we can just display "Edit Variable" / "Edit Instrument" for existing ones.
  // If it's a new one, the name is empty.
  if (!props.modelValue.name) {
    return localVar.value.kind === 'instrument' ? 'Add Instrument' : 'Add Variable'
  }
  return localVar.value.kind === 'instrument' ? 'Edit Instrument' : 'Edit Variable'
})

const availableDistributions = computed(() => {
  if (!localVar.value.dataType) return []
  return ValidDistributions[localVar.value.dataType as VariableType] || []
})

const isValid = computed(() => {
  if (!localVar.value.name || !localVar.value.dataType || !localVar.value.distribution) return false
  if (rules.variableName(localVar.value.name) !== true) return false

  // Validate Distribution Params
  if (localVar.value.distribution.type === 'normal') {
    if (validateArk(SafeNumber, localVar.value.distribution.mean) !== true) return false
    if (validateArk(PositiveNumber, localVar.value.distribution.stdDev) !== true) return false
  }
  if (localVar.value.distribution.type === 'uniform') {
    if (localVar.value.dataType === VAR_CONTINUOUS) {
      if (validateArk(SafeNumber, localVar.value.distribution.min) !== true) return false
      if (validateArk(SafeNumber, localVar.value.distribution.max) !== true) return false
    }
  }

  if (localVar.value.dataType === 'continuous') return true

  if (['nominal', 'ordinal'].includes(localVar.value.dataType)) {
    return rules.categories(localVar.value.categories) === true
  }
  return false
})

const isCategoryDuplicate = (val: string, index: number) => {
  return localVar.value.categories?.some((c: string, i: number) => c === val && i !== index)
}

const newCategory = ref('')
const addCategory = () => {
  if (newCategory.value && !localVar.value.categories?.includes(newCategory.value)) {
    if (!localVar.value.categories) localVar.value.categories = []
    localVar.value.categories.push(newCategory.value)
    newCategory.value = ''
  }
}

const removeCategory = (index: number) => {
  localVar.value.categories?.splice(index, 1)
}

const generateLevels = () => {
  localVar.value.categories = ['0', '1', '2', '3', '4']
}

const itemPrefix = ref('Q')
const itemCount = ref(5)

const generateItems = () => {
  if (!localVar.value.items) localVar.value.items = []

  for (let i = 1; i <= itemCount.value; i++) {
    localVar.value.items.push({
      id: crypto.randomUUID(),
      name: `${itemPrefix.value}${i}`,
      reverse: false
    })
  }
}

const startEdit = () => {
  localVar.value = JSON.parse(JSON.stringify(props.modelValue))
  isEditing.value = true
}

const cancel = () => {
  // If we cancel a "new" variable (empty name), we probably want to remove it?
  // Or simpler: just revert state. Parent handles lifecycle of 'new' items 
  // by observing they are empty/removed?
  // Let's just emit 'remove' if it was a new item (empty name originally)
  if (!props.modelValue.name) {
    emit('remove')
  } else {
    isEditing.value = false
    localVar.value = JSON.parse(JSON.stringify(props.modelValue)) // Revert
  }
}

const save = () => {
  if (isValid.value) {
    emit('update:modelValue', localVar.value)
    isEditing.value = false
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
