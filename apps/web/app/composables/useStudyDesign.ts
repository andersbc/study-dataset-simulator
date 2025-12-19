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

  return {
    setStudyType,
    addVariable,
    removeVariable,
    updateVariable
  }
}
