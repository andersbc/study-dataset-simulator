<template>
  <div class="mb-3">
    <!-- Edit Mode -->
    <v-card v-if="isEditing" class="pa-3 variable-card border-primary" variant="outlined" style="border-width: 2px;">
      <v-card-text class="pa-2">
        <div class="d-flex justify-space-between align-center mb-4" :class="{ 'cursor-pointer': isValid }"
          @click="attemptCollapse">
          <div class="text-h6">{{ cardTitle }}</div>
          <v-btn v-if="isValid" icon="mdi-chevron-up" variant="text" size="small" density="comfortable"></v-btn>
        </div>

        <v-text-field v-model="localVar.name" :label="localVar.kind === 'instrument' ? 'Instrument Name' : 'Name'"
          variant="outlined" class="mb-2" :rules="[rules.variableName]"></v-text-field>

        <!-- Variable Config (Flat for Variable) -->
        <template v-if="localVar.kind === 'variable'">
          <VariableConfiguration v-model="localVar" />
        </template>

        <!-- Accordion for Instrument -->
        <template v-else>
          <v-expansion-panels variant="accordion" multiple v-model="openPanels">
            <v-expansion-panel value="itemtype">
              <v-expansion-panel-title class="text-uppercase font-weight-bold">Variables (Item
                type)</v-expansion-panel-title>
              <v-expansion-panel-text>
                <VariableConfiguration v-model="localVar" />
              </v-expansion-panel-text>
            </v-expansion-panel>

            <v-expansion-panel value="items">
              <v-expansion-panel-title class="text-uppercase font-weight-bold">Items</v-expansion-panel-title>
              <v-expansion-panel-text>
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
                    <v-btn color="secondary" block prepend-icon="mdi-creation" @click="generateItems">Generate</v-btn>
                  </v-col>
                </v-row>

                <div class="mt-3 item-list-container border rounded pa-2"
                  v-if="localVar.items && localVar.items.length > 0">
                  <draggable v-model="localVar.items" handle=".item-drag-handle" item-key="id" ghost-class="ghost-item">
                    <template #item="{ element: item, index }">
                      <div class="d-flex align-center py-1 item-row">
                        <v-icon icon="mdi-drag" class="item-drag-handle cursor-move mr-2 text-medium-emphasis"
                          size="small"></v-icon>
                        <v-text-field v-model="item.name" density="compact" variant="plain" hide-details="auto"
                          :rules="[(val) => isItemNameUnique(val, item.id)]" class="flex-grow-1"></v-text-field>

                        <v-btn icon="mdi-close" variant="text" size="small" color="error" density="comfortable"
                          @click="removeItem(index)"></v-btn>
                      </div>
                    </template>
                  </draggable>
                </div>
                <v-alert v-else type="info" variant="text" density="compact" class="mt-2 text-caption">
                  No items generated yet.
                </v-alert>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <v-expansion-panel value="scales">
              <v-expansion-panel-title class="text-uppercase font-weight-bold">Scales</v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="text-caption text-medium-emphasis mb-2">
                  Define scales by grouping items.
                </div>

                <div class="d-flex gap-2 mb-2">
                  <v-text-field v-model="newScaleName" label="Add Scale" variant="outlined" density="compact"
                    hide-details="auto" @keydown.enter.prevent="addScale"></v-text-field>
                  <v-btn icon size="small" color="secondary" class="mt-1 ml-2" @click="addScale"
                    :disabled="!newScaleName">
                    <v-icon>mdi-plus</v-icon>
                    <v-tooltip activator="parent" location="top">Add Scale</v-tooltip>
                  </v-btn>
                </div>

                <div class="scale-list-container border rounded pa-2 mt-2"
                  v-if="localVar.scales && localVar.scales.length > 0">
                  <div v-for="(scale, index) in localVar.scales" :key="scale.id"
                    class="scale-item mb-2 pa-2 border rounded">
                    <div class="d-flex justify-space-between align-center mb-1">
                      <div class="font-weight-medium">{{ scale.name }}</div>
                      <v-btn icon="mdi-close" variant="text" size="small" color="error" density="comfortable"
                        @click="removeScale(index)"></v-btn>
                    </div>

                    <!-- Add Items to Scale -->
                    <v-select label="Add Items to Scale" :items="getAvailableItemsForScale(scale)" item-title="name"
                      item-value="id" multiple chips density="compact" variant="outlined" hide-details class="mb-2"
                      :model-value="[]" @update:model-value="(val) => addItemsToScale(scale, val)">
                    </v-select>

                    <!-- List of Items in Scale -->
                    <div v-if="scale.items && scale.items.length > 0" class="pl-2 border-l-2 ml-1">
                      <div v-for="(sItem, sIndex) in scale.items" :key="sItem.itemId" class="d-flex align-center py-1">
                        <span class="text-body-2 flex-grow-1">
                          {{ getItemName(sItem.itemId) }}
                        </span>

                        <v-tooltip location="top" text="Reverse Keyed">
                          <template v-slot:activator="{ props }">
                            <v-btn v-bind="props" :color="sItem.reverse ? 'warning' : 'grey'"
                              :variant="sItem.reverse ? 'flat' : 'text'" icon="mdi-swap-vertical" size="x-small"
                              density="comfortable" class="mr-1" @click="sItem.reverse = !sItem.reverse"></v-btn>
                          </template>
                        </v-tooltip>

                        <v-btn icon="mdi-close" size="x-small" color="error" variant="text"
                          @click="scale.items.splice(sIndex, 1)"></v-btn>
                      </div>
                    </div>
                    <div v-else class="text-caption text-medium-emphasis ml-2">No items in scale</div>
                  </div>
                </div>
                <v-alert v-else type="info" variant="text" density="compact" class="mt-2 text-caption">
                  No scales defined.
                </v-alert>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
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
            {{ variable.kind === 'instrument' ? `Instrument (${variable.items?.length || 0} items,
            ${variable.scales?.length
              || 0} scales) •
            ${variable.dataType}` : variable.dataType }}
          </div>
        </div>

        <div class="d-flex">

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
import draggable from 'vuedraggable'
import {
  type Variable, type VariableType, ValidDistributions, DefaultDistributions, CategoryList, PositiveNumber, SafeNumber, VariableName,
  VAR_CONTINUOUS, VAR_NOMINAL, VAR_ORDINAL, DIST_NORMAL, DIST_UNIFORM,
  type Instrument, type InstrumentItem, InstrumentSchema, type Scale
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

const itemPrefix = ref('Q')
const itemCount = ref(5)
const openPanels = ref(props.modelValue.name ? ['itemtype', 'items', 'scales'] : ['itemtype'])

const validateArk = (schema: any, val: any) => {
  const res = schema(val)
  return !(res instanceof type.errors) || res.summary
}

const rules = {
  variableName: (v: string) => {
    if (validateArk(VariableName, v) !== true) return "Invalid name format (no spaces, can't start with number, max 70 chars)"

    const occupied = getOtherOccupiedNames()
    if (occupied.has(v)) return "Variable name must be globally unique"
    return true
  }
}

const cardTitle = computed(() => {
  if (!props.modelValue.name) {
    return localVar.value.kind === 'instrument' ? 'Add Instrument' : 'Add Variable'
  }
  return localVar.value.kind === 'instrument' ? 'Edit Instrument' : 'Edit Variable'
})

const isValid = computed(() => {
  // Basic validation. Detailed validation happens in input fields (which prevents visual errors),
  // but we need to block save.
  if (!localVar.value.name || !localVar.value.dataType || !localVar.value.distribution) return false
  if (rules.variableName(localVar.value.name) !== true) return false

  // For categories (ordinal/nominal), check if we have enough
  if (['nominal', 'ordinal'].includes(localVar.value.dataType)) {
    if (!localVar.value.categories || localVar.value.categories.length < 2) return false
    // Check duplicates in categories
    if (new Set(localVar.value.categories).size !== localVar.value.categories.length) return false
  }

  return true
})

// Helper to get names used by OTHER variables/instruments in the design
const getOtherOccupiedNames = () => {
  const names = new Set<string>()
  if (!design.value.variables) return names

  design.value.variables.forEach(v => {
    if (v === props.modelValue) return
    validNameOrSkip(v.name, names)

    if (v.kind === 'instrument' && v.items) {
      v.items.forEach((item: any) => validNameOrSkip(item.name, names))
    }
  })
  return names
}

const validNameOrSkip = (name: string, set: Set<string>) => {
  if (name && typeof name === 'string') set.add(name)
}




const generateItems = () => {
  if (!localVar.value.items) localVar.value.items = []

  const occupied = getOtherOccupiedNames()
  // Also add currently existing items in this instrument to occupied for the purpose of generation
  localVar.value.items.forEach((i: any) => validNameOrSkip(i.name, occupied))

  for (let i = 1; i <= itemCount.value; i++) {
    let candidate = `${itemPrefix.value}${i}`
    let counter = 1
    // Auto-increment if collision
    while (occupied.has(candidate)) {
      counter++
      candidate = `${itemPrefix.value}${i}_${counter}` // e.g. Q1_2
    }

    // Add to occupied so subsequent iterations respect it
    occupied.add(candidate)

    localVar.value.items.push({
      id: crypto.randomUUID(),
      name: candidate
    })
  }
}

// Check uniqueness for individual item editing
const isItemNameUnique = (name: string, itemId: string) => {
  if (!name) return true

  // 1. Check against other variables/instruments
  const others = getOtherOccupiedNames()
  if (others.has(name)) return "Name conflicts with another variable in study"

  // 2. Check against other items in THIS instrument
  const duplicateInSelf = localVar.value.items?.some((i: any) => i.name === name && i.id !== itemId)
  if (duplicateInSelf) return "Name must be unique within instrument"

  return true
}

const newScaleName = ref('')
const addScale = () => {
  if (newScaleName.value) {
    if (!localVar.value.scales) localVar.value.scales = []
    localVar.value.scales.push({
      id: crypto.randomUUID(),
      name: newScaleName.value,
      items: []
    })
    newScaleName.value = ''
  }
}

const removeScale = (index: number) => {
  localVar.value.scales?.splice(index, 1)
}

const getAvailableItemsForScale = (scale: any) => {
  if (!localVar.value.items) return []
  const usedIds = new Set(scale.items?.map((i: any) => i.itemId) || [])
  return localVar.value.items.filter((i: any) => !usedIds.has(i.id))
}

const addItemsToScale = (scale: any, ids: string[]) => {
  if (!scale.items) scale.items = []

  // ids will contain the newly selected IDs (since we reset model to [] effectively)
  ids.forEach(id => {
    // Double check uniqueness just in case
    if (!scale.items.some((i: any) => i.itemId === id)) {
      scale.items.push({
        itemId: id,
        reverse: false
      })
    }
  })
}

const getItemName = (id: string) => {
  const item = localVar.value.items?.find((i: any) => i.id === id)
  return item ? item.name : 'Unknown Item'
}

const removeItem = (index: number) => {
  const item = localVar.value.items[index]
  if (!item) return

  // 1. Remove from item list
  localVar.value.items.splice(index, 1)

  // 2. Remove from all scales
  if (localVar.value.scales) {
    localVar.value.scales.forEach((scale: any) => {
      if (scale.items) {
        scale.items = scale.items.filter((si: any) => si.itemId !== item.id)
      }
    })
  }
}

const attemptCollapse = () => {
  if (isValid.value) {
    save()
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
