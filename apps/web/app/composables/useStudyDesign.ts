import type { StudyDesign, Variable } from '@sim-site/shared'

export const useStudyDesign = () => useState<StudyDesign>('studyDesign', () => ({
  studyType: 'cross-sectional',
  variables: []
}))

export const useStudyDesignActions = () => {
  const design = useStudyDesign()

  const setStudyType = (type: StudyDesign['studyType']) => {
    design.value.studyType = type
  }

  const addVariable = (variable: Variable) => {
    if (!design.value.variables) {
      design.value.variables = []
    }
    design.value.variables.push(variable)
  }

  const removeVariable = (index: number) => {
    design.value.variables?.splice(index, 1)
  }

  const updateVariable = (index: number, variable: Variable) => {
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
  }

  // Persistence Logic
  onMounted(() => {
    const saved = localStorage.getItem('study-design-v1')
    if (saved) {
      try {
        design.value = JSON.parse(saved)
      } catch (e) {
        console.error('Failed to load study design', e)
      }
    }

    // Auto-save
    watch(() => design.value, (newVal) => {
      localStorage.setItem('study-design-v1', JSON.stringify(newVal))
    }, { deep: true })
  })

  return {
    setStudyType,
    addVariable,
    removeVariable,
    updateVariable,
    resetDesign
  }
}
