// Order reports store a reviewed private path. Live reviews also know the analysis ID.
export function isMechanicsOverview(path: unknown, owner: string, analysisId?: string): path is string {
  if (typeof path !== 'string') return false
  const parts = path.split('/')
  return parts.length === 5 && parts[0] === owner && parts[1] === 'motion-lab'
    && /^[a-zA-Z0-9_-]+$/.test(parts[2]) && (!analysisId || parts[2] === analysisId)
    && parts[3] === 'phases' && parts[4] === 'delivery_overview.png'
}

export const overviewEvidence = { key: 'delivery_overview', label: 'Whole delivery filmstrip' }
