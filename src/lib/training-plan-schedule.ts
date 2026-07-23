export type TrainingPlanSchedule = {
  published_at: string | null
  starts_on: string | null
  follow_up_date: string | null
}

export function buildTrainingPlanPublishUpdate(
  publishedAt: string,
  existing: TrainingPlanSchedule
): TrainingPlanSchedule {
  if (existing.published_at) return existing

  const publishedDate = new Date(publishedAt)
  if (Number.isNaN(publishedDate.getTime())) {
    throw new Error('Invalid training-plan publication date.')
  }

  const followUpDate = new Date(publishedDate)
  followUpDate.setUTCDate(followUpDate.getUTCDate() + 56)

  return {
    published_at: publishedAt,
    starts_on: publishedDate.toISOString().slice(0, 10),
    follow_up_date: followUpDate.toISOString().slice(0, 10),
  }
}
