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
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'The run failed.')
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
