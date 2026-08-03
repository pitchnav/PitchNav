import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AGENTS } from '@/lib/agents/registry'
import { RunAgentButton } from './RunAgentButton'

export const dynamic = 'force-dynamic'

const SEVERITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-400/10 text-red-400',
  attention: 'bg-yellow-400/10 text-yellow-300',
  info: 'bg-slate-700/40 text-slate-300',
}

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Pitch Nav OS</h1>
      <p className="mt-1 text-sm text-slate-400">
        Agents read your data and report what needs attention. They cannot send, publish, or spend anything.
      </p>
    </div>
  )
}

export default async function AgentOsPage() {
  const supabase = await createClient()

  const { data: runs, error: runsError } = await supabase
    .from('agent_runs')
    .select('id,agent,started_at,finished_at,status,error,findings_count')
    .order('started_at', { ascending: false })
    .limit(50)

  // The agent_runs / agent_findings tables ship in migration 031, which has
  // not been applied to every database yet. Until it runs, this query fails
  // rather than returning an empty set — degrade to a clear setup message
  // instead of crashing or rendering a broken skeleton.
  if (runsError) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="card">
          <h2 className="font-bold text-white">Setup needed</h2>
          <p className="mt-2 text-sm text-slate-400">
            The Pitch Nav OS database migration has not been applied to this database yet, so agent runs and
            findings cannot be stored or displayed. Apply migration <code className="text-slate-300">031</code>
            {' '}(<code className="text-slate-300">agent_runs</code> and{' '}
            <code className="text-slate-300">agent_findings</code>), then reload this page.
          </p>
          <p className="mt-3 text-xs font-mono text-slate-600">{runsError.message}</p>
        </div>
      </div>
    )
  }

  const latestByAgent = new Map<string, NonNullable<typeof runs>[number]>()
  for (const run of runs ?? []) {
    if (!latestByAgent.has(run.agent)) latestByAgent.set(run.agent, run)
  }

  const latestRunId = runs?.[0]?.id
  const { data: findings, error: findingsError } = latestRunId
    ? await supabase
        .from('agent_findings')
        .select('id,severity,title,detail,entity_type,entity_id')
        .eq('run_id', latestRunId)
    : { data: [], error: null }

  return (
    <div className="space-y-6">
      <PageHeader />

      <div className="grid gap-4 sm:grid-cols-2">
        {AGENTS.map((agent) => {
          const run = latestByAgent.get(agent.id)
          return (
            <div key={agent.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-bold text-white">{agent.name}</h2>
                  <p className="mt-1 text-xs text-slate-400">{agent.description}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                  !run ? 'bg-slate-700/40 text-slate-400'
                    : run.status === 'ok' ? 'bg-accent-green/10 text-accent-green'
                    : 'bg-red-400/10 text-red-400'
                }`}>
                  {!run ? 'Never run' : run.status === 'ok' ? 'OK' : 'Failed'}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {run
                  ? `Last run ${new Date(run.started_at).toLocaleString()} · ${run.findings_count} findings`
                  : 'This agent has not run yet.'}
              </p>
              {run?.error && <p className="mt-2 text-xs text-red-400">{run.error}</p>}
              <div className="mt-4">
                <RunAgentButton agentId={agent.id} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="card">
        <h2 className="font-bold text-white">Findings</h2>
        {findingsError ? (
          <p className="mt-2 text-sm text-red-400">
            Findings could not be loaded: {findingsError.message}
          </p>
        ) : (findings ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            {latestRunId ? 'Nothing needs your attention right now.' : 'Press Run now to check your data for the first time.'}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {(findings ?? []).map((finding) => (
              <li key={finding.id} className="rounded-xl border border-surface-border bg-navy-950 p-4">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLES[finding.severity]}`}>
                    {finding.severity}
                  </span>
                  <span className="font-semibold text-white">{finding.title}</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{finding.detail}</p>
                {finding.entity_type === 'order' && finding.entity_id && (
                  <Link href={`/admin/orders/${finding.entity_id}`} className="mt-2 inline-block text-xs text-electric-blue-light">
                    Open this order →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
