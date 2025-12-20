import type { StudyDesign, Variable, Instrument, StudyNode } from '@sim-site/shared'

export const useStudyDesign = () => useState<StudyDesign>('studyDesign', () => ({
  studyType: 'cross-sectional',
  variables: []
}))

export const useStudyDesignActions = () => {
  const design = useStudyDesign()
  const isPersisted = useState<boolean>('isPersisted', () => false)

  const setStudyType = (type: StudyDesign['studyType']) => {
    design.value.studyType = type
  }

  const addVariable = (variable: StudyNode) => {
    if (!design.value.variables) {
      design.value.variables = []
    }
    design.value.variables.push(variable)
  }

  const removeVariable = (index: number) => {
    const vars = design.value.variables
    if (!vars) return

    const variableToRemove = vars[index]
    vars.splice(index, 1)

    // Cascade delete effects
    if (variableToRemove && variableToRemove.name && design.value.effects) {
      design.value.effects = design.value.effects.filter(e =>
        e.source !== variableToRemove.name && e.target !== variableToRemove.name
      )
    }
  }

  const clearVariables = () => {
    design.value.variables = []
    design.value.effects = []
  }

  const updateVariable = (index: number, variable: StudyNode) => {
    if (design.value.variables) {
      design.value.variables[index] = variable
    }
  }

  const resetDesign = () => {
    design.value = {
      studyType: 'cross-sectional',
      variables: [],
      effects: []
    }
    localStorage.removeItem('study-design-v1')
    isPersisted.value = false
  }

  return {
    design,
    isPersisted,
    setStudyType,
    addVariable,
    removeVariable,
    clearVariables,
    updateVariable,
    resetDesign
  }
}

export const useStudyPersistence = () => {
  const design = useStudyDesign()
  const isPersisted = useState<boolean>('isPersisted', () => false)

  onMounted(() => {
    let isHydrating = false
    const saved = localStorage.getItem('study-design-v1')

    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Check if different from default
        const hasVariables = parsed.variables && parsed.variables.length > 0
        const isNotDefaultType = parsed.studyType !== 'cross-sectional'

        if (hasVariables || isNotDefaultType) {
          isHydrating = true
          design.value = parsed
          isPersisted.value = true
          // Reset hydration flag after the update cycle
          nextTick(() => {
            isHydrating = false
          })
        }
      } catch (e) {
        console.error('Failed to load study design', e)
      }
    }

    // Auto-save and clear persistence flag on change
    watch(() => design.value, (newVal) => {
      if (isHydrating) return

      isPersisted.value = false
      localStorage.setItem('study-design-v1', JSON.stringify(newVal))
    }, { deep: true })
  })
}

const MAX_HISTORY = 50

// Global history state (singleton)
const history = ref<string[]>([])
const historyIndex = ref(-1)
let isUndoing = false

export const useStudyHistory = () => {
  const design = useStudyDesign()

  const canUndo = computed(() => historyIndex.value > 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  // Initialize history
  if (history.value.length === 0 && design.value) {
    history.value.push(JSON.stringify(design.value))
    historyIndex.value = 0
  }

  // Watch for changes
  watch(() => design.value, (newVal) => {
    if (isUndoing) return

    // If we are in the middle of history and make a change, chop off the future
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }

    history.value.push(JSON.stringify(newVal))
    historyIndex.value++

    if (history.value.length > MAX_HISTORY) {
      history.value.shift()
      historyIndex.value--
    }
  }, { deep: true })

  const undo = () => {
    if (!canUndo.value) return
    isUndoing = true
    historyIndex.value--
    design.value = JSON.parse(history.value[historyIndex.value])
    // Tiny timeout to let watcher ignore this change
    setTimeout(() => { isUndoing = false }, 0)
  }

  const redo = () => {
    if (!canRedo.value) return
    isUndoing = true
    historyIndex.value++
    design.value = JSON.parse(history.value[historyIndex.value])
    setTimeout(() => { isUndoing = false }, 0)
  }

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    history: computed(() => history.value),
    clear: () => {
      history.value = []
      historyIndex.value = -1
    }
  }
}
