'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, PencilLine, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { parsePitchFile, EMPTY_PITCH, type PitchRecord, type ParsedPitchFile } from '@/lib/pitch-data'

/**
 * Two ways in: a device export, or one pitch typed by hand.
 *
 * The file is parsed in the browser so the athlete can confirm what was found —
 * and crucially *which pitcher* — before anything is stored. A TrackMan bullpen
 * export routinely contains a whole staff, and silently taking the first name in
 * the file would file another player's pitches against this athlete.
 */

type Mode = 'upload' | 'manual'

const MANUAL_FIELDS: { key: keyof PitchRecord; label: string; unit: string; step: string }[] = [
  { key: 'relSpeedMph', label: 'Velocity', unit: 'mph', step: '0.1' },
  { key: 'spinRateRpm', label: 'Spin rate', unit: 'rpm', step: '1' },
  { key: 'spinAxisDeg', label: 'Spin axis', unit: '°', step: '1' },
  { key: 'inducedVertBreakIn', label: 'Induced vertical break', unit: 'in', step: '0.1' },
  { key: 'horzBreakIn', label: 'Horizontal break', unit: 'in', step: '0.1' },
  { key: 'relHeightFt', label: 'Release height', unit: 'ft', step: '0.01' },
  { key: 'relSideFt', label: 'Release side', unit: 'ft', step: '0.01' },
  { key: 'extensionFt', label: 'Extension', unit: 'ft', step: '0.01' },
]

const MAX_FILE_BYTES = 8 * 1024 * 1024

export function AddPitchData() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('upload')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  // Upload state
  const [parsed, setParsed] = useState<ParsedPitchFile | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rawText, setRawText] = useState<string | null>(null)
  const [device, setDevice] = useState<'trackman' | 'rapsodo'>('trackman')
  const [pitcher, setPitcher] = useState<string>('')
  const [uploadDate, setUploadDate] = useState<string>('')

  // Manual state
  const [manualType, setManualType] = useState('')
  const [manualDate, setManualDate] = useState('')
  const [manual, setManual] = useState<Record<string, string>>({})

  function reset() {
    setError(null)
    setDone(null)
  }

  async function handleFile(file: File) {
    reset()
    if (file.size > MAX_FILE_BYTES) {
      setError('That file is larger than 8 MB. Export just the session you want to add.')
      return
    }
    const text = await file.text()
    const result = parsePitchFile(text)

    if (result.pitches.length === 0 && result.pitchers.length === 0) {
      setError(
        'No pitch columns were recognised in that file. A TrackMan export should contain columns like RelSpeed, SpinRate and TaggedPitchType.',
      )
      setParsed(null)
      return
    }

    setRawText(text)
    setFileName(file.name)
    setParsed(result)
    setUploadDate(result.sessionDate ?? '')
    // Do not pre-select when the file holds several pitchers — that choice is
    // the athlete's, and a wrong default is a silent misattribution.
    setPitcher(result.pitchers.length === 1 ? result.pitchers[0] : '')
  }

  const selected = parsed && rawText ? parsePitchFile(rawText, parsed.hasPitcherColumn ? pitcher : null) : null
  const readyToSave = Boolean(
    selected && selected.pitches.length > 0 && (!parsed?.hasPitcherColumn || pitcher),
  )

  async function saveUpload() {
    if (!selected || !readyToSave) return
    setBusy(true)
    reset()
    try {
      const response = await fetch('/api/pitch-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: device,
          sessionDate: uploadDate || null,
          fileName,
          pitcherName: pitcher || null,
          notes: null,
          pitches: selected.pitches,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Could not save that session.')
      setDone(`Saved ${payload.saved} pitch${payload.saved === 1 ? '' : 'es'}.`)
      setParsed(null)
      setRawText(null)
      setFileName(null)
      setPitcher('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that session.')
    } finally {
      setBusy(false)
    }
  }

  async function saveManual() {
    setBusy(true)
    reset()
    try {
      const pitch: PitchRecord = { ...EMPTY_PITCH, pitchType: manualType.trim() || null, pitchNo: 1 }
      for (const field of MANUAL_FIELDS) {
        const raw = manual[field.key]?.trim()
        if (raw) {
          const value = Number(raw)
          // Reject rather than coerce: a typo that becomes NaN would be stored
          // as a null and look like the device simply did not measure it.
          if (!Number.isFinite(value)) throw new Error(`${field.label} is not a number.`)
          pitch[field.key] = value as never
        }
      }

      const hasAny = MANUAL_FIELDS.some((f) => manual[f.key]?.trim())
      if (!hasAny) throw new Error('Enter at least one measurement.')

      const response = await fetch('/api/pitch-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'manual',
          sessionDate: manualDate || null,
          fileName: null,
          pitcherName: null,
          notes: null,
          pitches: [pitch],
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Could not save that pitch.')
      setDone('Pitch saved.')
      setManual({})
      setManualType('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that pitch.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <div className="mb-5 flex flex-wrap gap-2">
        {([
          ['upload', 'Upload a file', Upload],
          ['manual', 'Enter by hand', PencilLine],
        ] as const).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => { setMode(value); reset() }}
            className={
              mode === value
                ? 'inline-flex items-center gap-2 rounded-lg border border-electric-blue bg-electric-blue/10 px-4 py-2 text-sm font-semibold text-white'
                : 'inline-flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white'
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {mode === 'upload' ? (
        <div>
          <label className="block">
            <span className="label">TrackMan or Rapsodo CSV export</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="mt-2 block w-full cursor-pointer rounded-lg border border-surface-border bg-navy-800 p-3 text-sm text-slate-300 file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-electric-blue file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleFile(file)
              }}
            />
          </label>
          <p className="mt-2 text-xs text-slate-500">
            Your file is read in your browser so you can check it before anything is saved. Columns read:
            RelSpeed, SpinRate, SpinAxis, InducedVertBreak, HorzBreak, RelHeight, RelSide, Extension,
            TaggedPitchType, Pitcher.
          </p>

          {parsed && (
            <div className="mt-5 rounded-xl border border-surface-border bg-navy-950 p-4">
              <p className="text-sm font-semibold text-white">Found in {fileName}</p>
              <p className="mt-1 text-xs text-slate-400">
                {parsed.matchedColumns.length} recognised column
                {parsed.matchedColumns.length === 1 ? '' : 's'}: {parsed.matchedColumns.join(', ') || 'none'}
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="label">Which device?</span>
                  <select
                    className="input mt-1"
                    value={device}
                    onChange={(event) => setDevice(event.target.value as 'trackman' | 'rapsodo')}
                  >
                    <option value="trackman">TrackMan</option>
                    <option value="rapsodo">Rapsodo</option>
                  </select>
                </label>

                <label>
                  <span className="label">Date thrown {parsed.sessionDate ? '(read from file)' : '(optional)'}</span>
                  <input
                    type="date"
                    className="input mt-1"
                    value={uploadDate}
                    onChange={(event) => setUploadDate(event.target.value)}
                  />
                </label>
              </div>

              {parsed.hasPitcherColumn && (
                <label className="mt-4 block">
                  <span className="label">
                    Which pitcher are you? ({parsed.pitchers.length} in this file)
                  </span>
                  <select
                    className="input mt-1"
                    value={pitcher}
                    onChange={(event) => setPitcher(event.target.value)}
                  >
                    <option value="">Select your name…</option>
                    {parsed.pitchers.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  {parsed.pitchers.length > 1 && !pitcher && (
                    <span className="mt-1 block text-xs text-yellow-300">
                      This file has more than one pitcher in it. Pick your name so another player&apos;s
                      pitches are not saved to your account.
                    </span>
                  )}
                </label>
              )}

              {selected && (!parsed.hasPitcherColumn || pitcher) && (
                <p className="mt-4 text-sm text-accent-green">
                  {selected.pitches.length} pitch{selected.pitches.length === 1 ? '' : 'es'} ready to save.
                </p>
              )}

              <button
                type="button"
                disabled={!readyToSave || busy}
                onClick={() => void saveUpload()}
                className="btn-primary mt-4 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Save this session
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="label">Pitch type (optional)</span>
              <input
                className="input mt-1"
                placeholder="Fastball"
                value={manualType}
                onChange={(event) => setManualType(event.target.value)}
              />
            </label>
            <label>
              <span className="label">Date thrown (optional)</span>
              <input
                type="date"
                className="input mt-1"
                value={manualDate}
                onChange={(event) => setManualDate(event.target.value)}
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {MANUAL_FIELDS.map((field) => (
              <label key={field.key}>
                <span className="label">{field.label} ({field.unit})</span>
                <input
                  type="number"
                  step={field.step}
                  className="input mt-1"
                  value={manual[field.key] ?? ''}
                  onChange={(event) => setManual((prev) => ({ ...prev, [field.key]: event.target.value }))}
                />
              </label>
            ))}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Fill in whatever you have. Anything you leave blank stays empty rather than counting as a zero.
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={() => void saveManual()}
            className="btn-primary mt-4 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PencilLine className="h-4 w-4" />}
            Save pitch
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      {done && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-accent-green/20 bg-accent-green/10 p-3">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-green" />
          <p className="text-sm text-accent-green">{done}</p>
        </div>
      )}
    </div>
  )
}
