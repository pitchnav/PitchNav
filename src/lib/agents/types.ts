export type Severity = 'info' | 'attention' | 'urgent'

export type Finding = {
  agent: string
  severity: Severity
  title: string
  detail: string
  entity_type: string | null
  entity_id: string | null
}

export type OrderRow = {
  id: string
  status: string
  payment_confirmed_at: string | null
  refunded_at: string | null
  report_published_at: string | null
  athlete_name: string | null
  has_video: boolean
}

export type AnalysisRow = {
  id: string
  order_id: string | null
  phase_snapshot_count: number
  published_at: string | null
}

export type SubmissionRow = {
  id: string
  order_id: string
  quality_approved: boolean | null
  quality_reviewed_at: string | null
  replaced: boolean
}

/** Current time is passed in so every rule is testable against fixed inputs. */
export type AnalyticsInput = {
  now: Date
  orders: OrderRow[]
  analyses: AnalysisRow[]
  submissions: SubmissionRow[]
}
