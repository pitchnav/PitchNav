'use client'

import { useEffect, useState } from 'react'
import { hubOrigin, parseHubCommand, replyToHub } from '@/lib/followup-hub-bridge'

export function StaffFollowupBridge({ nonce }: { nonce: string }) {
  const [state, setState] = useState<'waiting'|'connected'|'disconnected'>('waiting')
  useEffect(() => {
    const opener = window.opener as Window | null
    if (!opener) { setState('disconnected'); return }
    const controller = new AbortController()
    const requests = new Set<string>()
    let connected = false
    async function receive(event: MessageEvent) {
      const command = parseHubCommand(event, opener, nonce)
      if (!command || !opener || controller.signal.aborted) return
      if (command.type === 'hello') { connected = true; setState('connected') }
      else {
        if (!connected || requests.has(command.id) || requests.size >= 8) return
        requests.add(command.id)
      }
      try {
        const result = await replyToHub(command, controller.signal)
        if (!controller.signal.aborted) opener.postMessage(result, hubOrigin)
      } finally { if (command.type !== 'hello') requests.delete(command.id) }
    }
    window.addEventListener('message', receive)
    const timer = setInterval(() => { if (opener.closed) { controller.abort(); setState('disconnected'); clearInterval(timer) } }, 2000)
    return () => { controller.abort(); window.removeEventListener('message',receive); clearInterval(timer) }
  }, [nonce])
  return <main className="mx-auto max-w-xl px-5 pb-16 pt-28">
    <h1 className="text-3xl font-bold text-white">PitchNav staff connection</h1>
    <p role="status" className="my-4 text-slate-300">{state === 'connected'
      ? 'Connected to your private Agent Hub. Keep this window open and return to the hub to review coaching drafts.'
      : state === 'waiting' ? 'Waiting for your private Agent Hub…' : 'Open Staff Follow-ups from your private Agent Hub to connect.'}</p>
    <button type="button" className="btn-secondary" onClick={() => window.close()}>{state === 'connected' ? 'Disconnect and close' : 'Close window'}</button>
  </main>
}
