import { athletePracticeTask } from '@/lib/athlete-assessment-copy'
import type { MechanicsFinding } from '@/lib/mechanics-findings'

export function ReviewedPractice({ findings }: { findings?: MechanicsFinding[] | null }) {
  if (!Array.isArray(findings)) return null
  const tasks = new Map<string, string[]>()
  for (const finding of findings) {
    if (finding?.verdict !== 'observed') continue
    const action = athletePracticeTask(finding.coaching_action)
    if (!action) continue
    const topics = tasks.get(action) ?? []
    if (!topics.includes(finding.topic)) topics.push(finding.topic)
    tasks.set(action, topics)
  }
  if (!tasks.size) return null
  return <section className="card space-y-4">
    <h2 className="text-xl font-bold text-white">What to practice</h2>
    {Array.from(tasks, ([action, topics]) => <article key={action} className="border-t border-surface-border pt-4">
      <h3 className="font-semibold text-electric-blue-light">{topics.join(' · ')}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{action}</p>
    </article>)}
  </section>
}
