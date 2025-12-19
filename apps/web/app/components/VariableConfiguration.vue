<template>
  <div>
    <v-select v-model="localModel.dataType" :items="dataTypeOptions" label="Data Type" variant="outlined"></v-select>

    <v-select v-if="localModel.dataType" v-model="localModel.distribution.type" :items="availableDistributions"
      label="Distribution" variant="outlined" class="mt-2"></v-select>

    <template v-if="localModel.distribution?.type === DIST_NORMAL">
      <v-row class="mt-2">
        <v-col cols="6">
          <v-text-field v-model.number="localModel.distribution.mean" label="Mean" type="number" variant="outlined"
            hide-details="auto" :rules="[rules.numeric]"></v-text-field>
        </v-col>
        <v-col cols="6">
          <v-text-field v-model.number="localModel.distribution.stdDev" label="Std Dev" type="number" variant="outlined"
            hide-details="auto" :rules="[rules.positive]"></v-text-field>
        </v-col>
      </v-row>
    </template>

    <template v-if="localModel.distribution?.type === DIST_UNIFORM && localModel.dataType === VAR_CONTINUOUS">
      <v-row class="mt-2">
        <v-col cols="6">
          <v-text-field v-model.number="localModel.distribution.min" label="Min" type="number" variant="outlined"
            hide-details="auto" :rules="[rules.numeric]"></v-text-field>
        </v-col>
        <v-col cols="6">
          <v-text-field v-model.number="localModel.distribution.max" label="Max" type="number" variant="outlined"
            hide-details="auto" :rules="[rules.numeric]"></v-text-field>
        </v-col>
      </v-row>
    </template>

    <template v-if="[VAR_NOMINAL, VAR_ORDINAL].includes(localModel.dataType || '')">
      <div class="mt-4">
        <div class="d-flex justify-space-between align-center mb-2">
          <div class="text-subtitle-1">
            {{ localModel.kind === 'instrument' ? 'Shared Response Scale' : 'Categories' }}
            <span class="text-caption text-medium-emphasis">(Min 2)</span>
          </div>
          <v-btn v-if="localModel.dataType === VAR_ORDINAL" size="small" variant="text" color="primary"
            prepend-icon="mdi-creation" @click="generateLevels">
            Generate (0-4)
          </v-btn>
        </div>

        <div class="d-flex gap-2 mb-2">
          <v-text-field v-model="newCategory" label="Add Category" variant="outlined" density="compact"
            :error-messages="localModel.categories?.includes(newCategory) ? 'Category already exists' : ''"
            hide-details="auto" @keydown.enter.prevent="addCategory"></v-text-field>
          <v-btn icon size="small" color="primary" class="mt-1 ml-2" @click="addCategory"
            :disabled="!newCategory || localModel.categories?.includes(newCategory)">
            <v-icon>mdi-plus</v-icon>
            <v-tooltip activator="parent" location="top">Add Category</v-tooltip>
          </v-btn>
        </div>

        <ClientOnly>
          <div class="category-list-container border rounded pa-2 mt-2">
            <draggable v-model="localModel.categories" handle=".cat-drag-handle" item-key="self"
              ghost-class="ghost-item" drag-class="drag-item">
              <template #item="{ element: category, index }">
                <div class="d-flex align-center py-2 px-2 category-item">
                  <v-icon icon="mdi-drag" class="cat-drag-handle cursor-move mr-2 text-medium-emphasis"></v-icon>

                  <!-- Ordinal Index -->
                  <v-chip v-if="localModel.dataType === VAR_ORDINAL" size="small" color="primary" variant="flat"
                    class="mr-3 font-weight-bold" style="min-width: 32px; justify-content: center;">
                    {{ index }}
                  </v-chip>

                  <v-text-field v-model="localModel.categories[index]" variant="plain" density="compact"
                    hide-details="auto" class="flex-grow-1"
                    :error-messages="isCategoryDuplicate(localModel.categories[index], index) ? 'Duplicate' : ''"></v-text-field>

                  <v-btn icon="mdi-close" variant="text" size="small" color="error" density="comfortable"
                    @click="removeCategory(index)">
                    <v-tooltip activator="parent" location="top">Remove Category</v-tooltip>
                  </v-btn>
                </div>
              </template>
            </draggable>
            <div v-if="(!localModel.categories || localModel.categories.length === 0)"
              class="text-caption text-medium-emphasis text-center py-4">
              No categories added. Type above to add.
            </div>
          </div>
        </ClientOnly>
        <div v-if="rules.categories(localModel.categories) !== true" class="text-error text-caption mt-1">
          {{ rules.categories(localModel.categories) }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { type } from 'arktype'
import draggable from 'vuedraggable'
import {
  type Variable, type VariableType, ValidDistributions, DefaultDistributions, CategoryList, PositiveNumber, SafeNumber,
  VAR_CONTINUOUS, VAR_NOMINAL, VAR_ORDINAL, DIST_NORMAL, DIST_UNIFORM,
  type Instrument
} from '@sim-site/shared'

const props = defineProps<{
  modelValue: Variable | Instrument
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Variable | Instrument): void
}>()

const localModel = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const dataTypeOptions = [
  { title: 'Continuous', value: VAR_CONTINUOUS, props: { prependIcon: 'mdi-chart-bell-curve' } },
  { title: 'Ordinal', value: VAR_ORDINAL, props: { prependIcon: 'mdi-sort-ascending' } },
  { title: 'Nominal', value: VAR_NOMINAL, props: { prependIcon: 'mdi-tag-outline' } }
]

const validateArk = (schema: any, val: any) => {
  const res = schema(val)
  return !(res instanceof type.errors) || res.summary
}

// Internal rules for this component
const rules = {
  numeric: (v: number) => validateArk(SafeNumber, v),
  positive: (v: number) => validateArk(PositiveNumber, v),
  categories: (v: string[]) => {
    if (validateArk(CategoryList, v) !== true) return "At least 2 categories required"
    if (new Set(v).size !== v.length) return "Categories must be unique"
    return true
  }
}

const availableDistributions = computed(() => {
  if (!localModel.value.dataType) return []
  return ValidDistributions[localModel.value.dataType as VariableType] || []
})

// Watch dataType to set correct default distribution
watch(() => localModel.value.dataType, (newType, oldType) => {
  if (!newType || newType === oldType) return
  const defaultDist = DefaultDistributions[newType as keyof typeof DefaultDistributions]

  if (defaultDist === DIST_NORMAL) {
    localModel.value.distribution = { type: DIST_NORMAL, mean: 0, stdDev: 1 }
  } else {
    // For continuous, we need min/max. For others (categorical), just type.
    if (newType === VAR_CONTINUOUS) {
      localModel.value.distribution = { type: DIST_UNIFORM, min: 0, max: 1 }
    } else {
      localModel.value.distribution = { type: DIST_UNIFORM }
    }
  }
})

const newCategory = ref('')
const addCategory = () => {
  if (newCategory.value && !localModel.value.categories?.includes(newCategory.value)) {
    if (!localModel.value.categories) localModel.value.categories = []
    localModel.value.categories.push(newCategory.value)
    newCategory.value = ''
  }
}

const removeCategory = (index: number) => {
  localModel.value.categories?.splice(index, 1)
}

const isCategoryDuplicate = (val: string, index: number) => {
  return localModel.value.categories?.some((c: string, i: number) => c === val && i !== index)
}

const generateLevels = () => {
  localModel.value.categories = ['0', '1', '2', '3', '4']
}

</script>

<style scoped>
.cursor-move {
  cursor: move;
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
