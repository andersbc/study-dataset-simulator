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
    design.value.variables?.splice(index, 1)
  }

  const clearVariables = () => {
    design.value.variables = []
  }

  const updateVariable = (index: number, variable: StudyNode) => {
    if (design.value.variables) {
      design.value.variables[index] = variable
    }
  }

  const resetDesign = () => {
    design.value = {
      studyType: 'cross-sectional',
      variables: []
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
