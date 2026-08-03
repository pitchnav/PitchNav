'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export function RunAgentButton({ agentId }: { agentId: string }) {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setRunning(true)
    setError(null)
    try {
      const response = await fetch(`/api/agents/${agentId}`, { method: 'POST' })
      // A 504 or a platform error page comes back as HTML or an empty body,
      // not JSON. Parsing that unconditionally throws a confusing "Unexpected
      // token" error instead of the real problem, so parse defensively and
      // fall back to the HTTP status when the body isn't valid JSON.
      const payload: { error?: string } = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error ?? `The run failed (HTTP ${response.status}).`)
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The run failed.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div>
      <button type="button" onClick={run} disabled={running} className="btn-secondary text-sm">
        <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} /> {running ? 'Running…' : 'Run now'}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  )
}
