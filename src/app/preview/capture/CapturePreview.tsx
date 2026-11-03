'use client'
import { useState } from 'react'
import { VideoRecorder } from '@/components/capture/VideoRecorder'
export function CapturePreview() {
  const [message, setMessage] = useState('No recording selected. This preview does not upload or save anything.')
  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-28"><h1 className="text-3xl font-black text-white">Record a rep</h1><p role="status" className="text-slate-400">{message}</p>{['your delivery', 'this movement screen'].map(purpose => <VideoRecorder key={purpose} purpose={purpose} onUse={file => setMessage(`Ready for review: ${file.name} (${Math.round(file.size / 1024)} KB). Local preview only.`)} />)}</main>
}
