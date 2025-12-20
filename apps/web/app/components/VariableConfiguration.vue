<template>
  <div>
    <v-row>
      <v-col cols="12" :md="localModel.dataType ? 6 : 12">
        <v-select v-model="localModel.dataType" :items="dataTypeOptions" label="Data Type" variant="outlined"
          hide-details="auto"></v-select>
      </v-col>

      <v-col cols="12" md="6" v-if="localModel.dataType">
        <v-select v-model="localModel.distribution.type" :items="availableDistributions" label="Distribution"
          variant="outlined" hide-details="auto"></v-select>
      </v-col>
    </v-row>

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

    <template v-if="([VAR_NOMINAL, VAR_ORDINAL] as string[]).includes(localModel.dataType || '')">
      <div class="mt-4">
        <div class="d-flex justify-space-between align-center mb-2">
          <div class="text-subtitle-1">
            {{ localModel.kind === 'instrument' ? 'Categories (response scale)' : 'Categories' }}
            <span class="text-caption text-medium-emphasis">(Min 2)</span>
          </div>
          <v-btn v-if="localModel.dataType === VAR_ORDINAL" size="small" variant="text" color="primary"
            prepend-icon="mdi-creation" @click="generateLevels">
            Generate (0-4)
          </v-btn>
        </div>

        <div class="d-flex gap-2 mb-2">
          <v-text-field v-model="newCategory" label="Add Category" variant="outlined" density="compact"
            :error-messages="categories.includes(newCategory) ? 'Category already exists' : ''" hide-details="auto"
            @keydown.enter.prevent="addCategory"></v-text-field>
          <v-btn icon size="small" color="primary" class="mt-1 ml-2" @click="addCategory"
            :disabled="!newCategory || categories.includes(newCategory)">
            <v-icon>mdi-plus</v-icon>
            <v-tooltip activator="parent" location="top">Add Category</v-tooltip>
          </v-btn>
        </div>

        <ClientOnly>
          <div class="category-list-container border rounded pa-2 mt-2">
            <!-- Column Headers -->
            <div class="d-flex align-center px-2 pb-2 text-caption font-weight-bold text-medium-emphasis">
              <!-- Spacer for drag handle -->
              <div style="width: 24px" class="mr-2"></div>

              <!-- Value Header (Ordinal Only) -->
              <div v-if="localModel.dataType === VAR_ORDINAL" style="min-width: 32px" class="mr-3 text-center">
                Rank
              </div>

              <!-- Label/Value Header -->
              <div class="flex-grow-1">
                {{ localModel.dataType === VAR_NOMINAL ? 'Value' : 'Label' }}
              </div>

              <!-- Spacer for delete button -->
              <div style="width: 28px" class="ml-2"></div>
            </div>

            <draggable v-model="categories" handle=".cat-drag-handle" item-key="self" ghost-class="ghost-item"
              drag-class="drag-item">
              <template #item="{ element: category, index }">
                <div class="d-flex align-center py-1 px-2 category-item rounded">
                  <v-icon icon="mdi-drag" class="cat-drag-handle cursor-move mr-2 text-medium-emphasis"></v-icon>

                  <!-- Ordinal Index -->
                  <v-chip v-if="localModel.dataType === VAR_ORDINAL" size="small" color="primary" variant="flat"
                    class="mr-3 font-weight-bold" style="min-width: 32px; justify-content: center;">
                    {{ index }}
                  </v-chip>

                  <div class="flex-grow-1 position-relative d-flex align-center">
                    <v-text-field v-model="categories[index]" variant="plain" density="compact" hide-details="auto"
                      class="flex-grow-1 centered-input"
                      :error-messages="isCategoryDuplicate(categories[index], index) ? 'Duplicate' : ''">
                    </v-text-field>
                  </div>

                  <v-btn size="small" variant="text" color="error" icon class="ml-2" @click="removeCategory(index)">
                    <v-icon>mdi-delete</v-icon>
                    <v-tooltip activator="parent" location="top">Remove Category</v-tooltip>
                  </v-btn>
                </div>
              </template>
            </draggable>
            <div v-if="(!categories || categories.length === 0)"
              class="text-caption text-medium-emphasis text-center py-4">
              No categories added. Type above to add.
            </div>
          </div>
        </ClientOnly>
        <div v-if="rules.categories(categories) !== true" class="text-error text-caption mt-1">
          {{ rules.categories(categories) }}
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

const categories = computed({
  get: () => (localModel.value as any).categories || [],
  set: (val: string[]) => {
    if (!('categories' in localModel.value)) {
      // Force it if missing (though logic shouldn't allow this state ideally)
      Object.assign(localModel.value, { categories: val })
    } else {
      (localModel.value as any).categories = val
    }
  }
})

const newCategory = ref('')
const addCategory = () => {
  if (newCategory.value && !categories.value.includes(newCategory.value)) {
    const newCats = [...categories.value, newCategory.value]
    categories.value = newCats
    newCategory.value = ''
  }
}

const removeCategory = (index: number) => {
  const newCats = [...categories.value]
  newCats.splice(index, 1)
  categories.value = newCats
}

const isCategoryDuplicate = (val: string, index: number) => {
  return categories.value.some((c: string, i: number) => c === val && i !== index)
}

const generateLevels = () => {
  categories.value = ['0', '1', '2', '3', '4']
}

</script>

<style scoped>
.cursor-move {
  cursor: move;
}

.category-item {
  transition: background-color 0.2s;
}

/* Show text cursor on hover to indicate editability */
.category-item:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.05);
  cursor: text;
}

/* Force vertical alignment for the input inside text-field */
.centered-input :deep(.v-field__input) {
  padding-top: 0;
  padding-bottom: 0;
  min-height: 24px;
  display: flex;
  align-items: center;
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
