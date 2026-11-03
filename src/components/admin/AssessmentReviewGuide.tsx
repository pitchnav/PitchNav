import Link from 'next/link'
import { assessmentReview } from '@/lib/assessment-review'

export function AssessmentReviewGuide() {
  return (
    <details className="my-3 rounded-lg border border-surface-border p-3 text-sm text-slate-300">
      <summary className="cursor-pointer font-semibold text-white">Before you release this assessment</summary>
      <ul className="my-3 list-disc space-y-2 pl-5">
        {assessmentReview.map(item => <li key={item}>{item}</li>)}
      </ul>
      <Link href="/sample-report" target="_blank" className="text-electric-blue-light">Read the sample assessment</Link>
    </details>
  )
}
