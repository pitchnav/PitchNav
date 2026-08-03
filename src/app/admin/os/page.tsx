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
const DEFAULT_SEVERITY_STYLE = 'bg-slate-700/40 text-slate-300'

// Mirrors the urgent/attention/info rank order applied in analytics.ts.
// PostgREST does not guarantee row order without an explicit .order(), so the
// sort has to be re-applied here after the fetch -- otherwise the careful
// ordering the agent computed is discarded at this database round trip.
const SEVERITY_RANK: Record<string, number> = { urgent: 0, attention: 1, info: 2 }

// Postgres error code for "relation does not exist" — the specific signal
// that migration 031 (agent_runs / agent_findings) has not been applied yet.
// Any other error code is a real fault (RLS, connection, typo, etc.) and
// must not be mistaken for a migration that is already applied.
const MISSING_TABLE_CODE = '42P01'
const MIGRATION_FILE = 'supabase/migrations/031_agent_os.sql'

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

function MigrationNeededNotice({ tail }: { tail: string }) {
  return (
    <p className="mt-2 text-sm text-slate-400">
      This screen needs one more step: open the Supabase SQL editor for this project and run the file{' '}
      <code className="text-slate-300">{MIGRATION_FILE}</code> once. As soon as that finishes, {tail}.
    </p>
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
  // rather than returning an empty set. Only treat that specific "table
  // missing" error as a setup step — any other error (RLS, connection, a
  // future typo) is a real fault and must say so plainly instead of sending
  // the product owner to re-apply a migration he already ran.
  if (runsError) {
    const missingTable = runsError.code === MISSING_TABLE_CODE
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="card">
          <h2 className="font-bold text-white">{missingTable ? 'Setup needed' : 'Could not load agent data'}</h2>
          {missingTable ? (
            <MigrationNeededNotice tail="this page will work" />
          ) : (
            <p className="mt-2 text-sm text-slate-400">
              Something went wrong loading agent data. Reloading the page usually fixes this; if it keeps
              happening, share the message below.
            </p>
          )}
          <p className="mt-3 text-xs font-mono text-slate-600">{runsError.message}</p>
        </div>
      </div>
    )
  }

  // Newest run per agent regardless of status, so a failed or in-flight run
  // is still visible on the agent's own card.
  const latestByAgent = new Map<string, NonNullable<typeof runs>[number]>()
  for (const run of runs ?? []) {
    if (!latestByAgent.has(run.agent)) latestByAgent.set(run.agent, run)
  }

  // The findings panel must never read off the newest row blindly: a run
  // that failed, or one still mid-flight (or killed by a serverless timeout
  // before it could mark itself failed), has zero findings recorded and
  // would otherwise render as a false "nothing needs your attention" while
  // the last genuinely good run's real findings are hidden. So the panel
  // reads the newest run PER AGENT that actually finished with status 'ok'.
  const lastGoodRunByAgent = new Map<string, NonNullable<typeof runs>[number]>()
  for (const run of runs ?? []) {
    if (lastGoodRunByAgent.has(run.agent)) continue
    if (run.status === 'ok' && run.finished_at) lastGoodRunByAgent.set(run.agent, run)
  }
  const goodRunIds = Array.from(lastGoodRunByAgent.values()).map((run) => run.id)

  const { data: rawFindings, error: findingsError } = goodRunIds.length
    ? await supabase
        .from('agent_findings')
        .select('id,severity,title,detail,entity_type,entity_id')
        .in('run_id', goodRunIds)
    : { data: [], error: null }

  // Re-sort after the fetch: PostgREST gives no row-order guarantee without
  // an explicit .order(), so the urgent-first ordering analytics.ts computed
  // is not preserved by an .eq()/.in() round trip and must be re-applied here.
  const findings = [...(rawFindings ?? [])].sort(
    (a, b) => (SEVERITY_RANK[a.severity] ?? 99) - (SEVERITY_RANK[b.severity] ?? 99),
  )

  const overallLatestRun = runs?.[0] ?? null
  const overallLatestRunOk = overallLatestRun?.status === 'ok'

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
                    : run.status === 'running' ? 'bg-electric-blue/10 text-electric-blue-light'
                    : 'bg-red-400/10 text-red-400'
                }`}>
                  {!run ? 'Never run' : run.status === 'ok' ? 'OK' : run.status === 'running' ? 'Running' : 'Failed'}
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
          findingsError.code === MISSING_TABLE_CODE ? (
            <MigrationNeededNotice tail="findings will show up here" />
          ) : (
            <p className="mt-2 text-sm text-red-400">
              Findings could not be loaded. {findingsError.message}
            </p>
          )
        ) : (
          <>
            {overallLatestRun && !overallLatestRunOk && (
              <p className="mt-2 text-sm text-yellow-300">
                {overallLatestRun.status === 'running'
                  ? 'The last run has not finished yet.'
                  : 'The last run failed.'}{' '}
                {goodRunIds.length > 0
                  ? 'Showing findings from the last successful run instead.'
                  : 'There is no earlier successful run to show yet.'}
              </p>
            )}
            {findings.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                {!overallLatestRun
                  ? 'Press Run now to check your data for the first time.'
                  : goodRunIds.length > 0
                    ? 'Nothing needed attention as of the last successful run.'
                    : 'Nothing to show yet.'}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {findings.map((finding) => (
                  <li key={finding.id} className="rounded-xl border border-surface-border bg-navy-950 p-4">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLES[finding.severity] ?? DEFAULT_SEVERITY_STYLE}`}>
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
          </>
        )}
      </div>
    </div>
  )
}
