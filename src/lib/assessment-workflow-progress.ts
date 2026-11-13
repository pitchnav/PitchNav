export const assessmentStages = [
  {id:'biomechanics', name:'Biomechanics'},
  {id:'followup', name:'Athlete Follow-Up'},
  {id:'training', name:'Training Plans'},
] as const

export type AssessmentStage = typeof assessmentStages[number]['id']
export type AssessmentWorkflowStatus = 'pending' | 'generating' | 'ready' | 'failed' | 'permission_required'

export function workflowStatusLabel(status: AssessmentWorkflowStatus, stage?: AssessmentStage | null) {
  const name = assessmentStages.find(item => item.id === stage)?.name
  switch (status) {
    case 'ready': return name ? 'Plan ready for review' : 'Ready for review'
    case 'permission_required': return 'Permission needed'
    case 'generating': return name ? name + ' in progress' : 'Writing draft'
    case 'pending': return name ? 'Queued for ' + name : 'Queued'
    case 'failed': return name ? name + ' needs a retry' : 'Generation failed'
  }
}

export function handoffStatus(id: AssessmentStage, stage: AssessmentStage, status: AssessmentWorkflowStatus) {
  const index = assessmentStages.findIndex(item => item.id === id)
  const current = assessmentStages.findIndex(item => item.id === stage)
  if (status === 'permission_required') return 'Paused'
  if (index < current || status === 'ready') return 'Complete'
  if (index > current) return 'Waiting'
  return status === 'failed' ? 'Needs retry' : status === 'generating' ? 'In progress' : 'Queued'
}
