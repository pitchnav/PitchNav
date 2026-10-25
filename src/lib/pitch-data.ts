/**
 * Pitch data: ball-flight numbers brought in from a real measuring device.
 *
 * Decision D-010 removed video-estimated velocity, and that still stands. This
 * module is the opposite approach: it never derives a number. It reads what a
 * TrackMan or Rapsodo export already contains, or takes what an athlete typed,
 * and keeps the origin attached to it.
 *
 * The source label is the whole point. A TrackMan reading and a number an
 * athlete remembered are different kinds of evidence, and a reviewer must be
 * able to tell which is which without asking. Every surface that prints a
 * number here is expected to print its source too.
 */

export type PitchDataSource = 'trackman' | 'rapsodo' | 'manual'

/**
 * Athlete- and reviewer-facing provenance text. Deliberately explicit that
 * uploads are athlete-supplied: Pitch Nav did not operate the device and has
 * not verified the reading.
 */
export const SOURCE_LABELS: Record<PitchDataSource, string> = {
  trackman: 'TrackMan, athlete-uploaded',
  rapsodo: 'Rapsodo, athlete-uploaded',
  manual: 'Athlete-entered',
}

export function sourceLabel(source: string): string {
  return SOURCE_LABELS[source as PitchDataSource] ?? 'Source not recorded'
}

/** One pitch. Every measurement is optional — real exports have gaps. */
export type PitchRecord = {
  pitchType: string | null
  relSpeedMph: number | null
  spinRateRpm: number | null
  spinAxisDeg: number | null
  inducedVertBreakIn: number | null
  horzBreakIn: number | null
  relHeightFt: number | null
  relSideFt: number | null
  extensionFt: number | null
  pitchNo: number | null
}

export const EMPTY_PITCH: PitchRecord = {
  pitchType: null,
  relSpeedMph: null,
  spinRateRpm: null,
  spinAxisDeg: null,
  inducedVertBreakIn: null,
  horzBreakIn: null,
  relHeightFt: null,
  relSideFt: null,
  extensionFt: null,
  pitchNo: null,
}

/**
 * TrackMan column names, mapped to our fields.
 *
 * Matching is case- and separator-insensitive because exports vary between
 * firmware versions and between the TrackMan and Rapsodo conventions
 * ("RelSpeed", "rel_speed", "Rel Speed"). Unrecognised columns are ignored
 * rather than guessed at.
 */
const COLUMN_MAP: Record<string, keyof PitchRecord> = {
  relspeed: 'relSpeedMph',
  spinrate: 'spinRateRpm',
  spinaxis: 'spinAxisDeg',
  inducedvertbreak: 'inducedVertBreakIn',
  horzbreak: 'horzBreakIn',
  relheight: 'relHeightFt',
  relside: 'relSideFt',
  extension: 'extensionFt',
  taggedpitchtype: 'pitchType',
}

const PITCHER_COLUMNS = ['pitcher']
const DATE_COLUMNS = ['date', 'gamedate', 'sessiondate']

function normalizeHeader(header: string): string {
  return header.replace(/[\s_\-.]/g, '').toLowerCase()
}

/**
 * Minimal RFC-4180 CSV reader.
 *
 * Written rather than installed: pitch exports are plain comma-separated files
 * with quoted fields, and a dependency for that is not worth the supply-chain
 * surface. Handles quoted fields, escaped double quotes, embedded commas and
 * newlines, and both CRLF and LF line endings.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  // Strip a UTF-8 byte-order mark; Excel adds one and it would otherwise become
  // part of the first column name and break header matching.
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  for (let i = 0; i < input.length; i++) {
    const char = input[i]

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char === '\r') {
      // Swallow CR; the following LF ends the row.
    } else {
      field += char
    }
  }

  // A final row with no trailing newline still counts.
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

/**
 * Parse a measurement cell.
 *
 * Returns null — not 0 — for anything unusable. A missing reading is not a
 * reading of zero, and letting blanks collapse to 0 would drag an athlete's
 * average velocity down with pitches the device never measured.
 */
function parseNumber(value: string | undefined): number | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (trimmed === '') return null
  // TrackMan writes absent values several ways depending on export path.
  if (/^(na|n\/a|null|-|--)$/i.test(trimmed)) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

export type ParsedPitchFile = {
  /** Distinct pitcher names found, in first-seen order. */
  pitchers: string[]
  /** Rows for the requested pitcher (or all rows when the file has no Pitcher column). */
  pitches: PitchRecord[]
  /** Session date read from the file, if it had one. */
  sessionDate: string | null
  /** Headers present in the file that we recognised. */
  matchedColumns: string[]
  /** True when the file had a Pitcher column, so the caller must choose. */
  hasPitcherColumn: boolean
}

/**
 * Read a TrackMan/Rapsodo CSV export.
 *
 * `pitcherFilter` selects one athlete out of a file that contains several — a
 * bullpen export routinely holds a whole staff, so the file by itself does not
 * identify whose numbers these are. Matching is case-insensitive and tolerates
 * surrounding whitespace, but is otherwise exact: fuzzy-matching a name would
 * risk attributing another player's pitches to this athlete.
 */
export function parsePitchFile(text: string, pitcherFilter?: string | null): ParsedPitchFile {
  const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim() !== ''))

  if (rows.length < 2) {
    return { pitchers: [], pitches: [], sessionDate: null, matchedColumns: [], hasPitcherColumn: false }
  }

  const headers = rows[0].map(normalizeHeader)
  const fieldByIndex = new Map<number, keyof PitchRecord>()
  const matchedColumns: string[] = []

  headers.forEach((header, index) => {
    const field = COLUMN_MAP[header]
    if (field) {
      fieldByIndex.set(index, field)
      matchedColumns.push(rows[0][index].trim())
    }
  })

  const pitcherIndex = headers.findIndex((header) => PITCHER_COLUMNS.includes(header))
  const dateIndex = headers.findIndex((header) => DATE_COLUMNS.includes(header))

  const pitchers: string[] = []
  const pitches: PitchRecord[] = []
  let sessionDate: string | null = null
  const wanted = pitcherFilter?.trim().toLowerCase()

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]

    let rowPitcher: string | null = null
    if (pitcherIndex >= 0) {
      rowPitcher = (row[pitcherIndex] ?? '').trim()
      if (rowPitcher && !pitchers.some((name) => name.toLowerCase() === rowPitcher!.toLowerCase())) {
        pitchers.push(rowPitcher)
      }
      if (wanted && rowPitcher.toLowerCase() !== wanted) continue
    }

    if (sessionDate === null && dateIndex >= 0) {
      const raw = (row[dateIndex] ?? '').trim()
      // Keep only an unambiguous ISO date. Guessing between US and European
      // ordering on "03/04/2026" would silently mis-date a session.
      const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/)
      if (iso) sessionDate = iso[1]
    }

    const pitch: PitchRecord = { ...EMPTY_PITCH, pitchNo: pitches.length + 1 }
    let hasAnyValue = false

    for (const [index, field] of fieldByIndex) {
      const cell = row[index]
      if (field === 'pitchType') {
        const tag = (cell ?? '').trim()
        if (tag) {
          pitch.pitchType = tag
          hasAnyValue = true
        }
      } else {
        const value = parseNumber(cell)
        if (value !== null) {
          pitch[field] = value as never
          hasAnyValue = true
        }
      }
    }

    // A row with nothing recognisable in it is not a pitch.
    if (hasAnyValue) pitches.push(pitch)
  }

  return {
    pitchers,
    pitches,
    sessionDate,
    matchedColumns,
    hasPitcherColumn: pitcherIndex >= 0,
  }
}

// ── Aggregation ────────────────────────────────────────────────────────────

export type PitchTypeAverages = {
  pitchType: string
  count: number
  avgRelSpeedMph: number | null
  maxRelSpeedMph: number | null
  avgSpinRateRpm: number | null
  avgSpinAxisDeg: number | null
  avgInducedVertBreakIn: number | null
  avgHorzBreakIn: number | null
  avgExtensionFt: number | null
  avgRelHeightFt: number | null
  avgRelSideFt: number | null
}

/**
 * Average a column across pitches, ignoring the ones that have no reading.
 *
 * `count` on the returned row is the number of PITCHES, which is deliberately
 * not the number of readings behind any single average — a bullpen can have 40
 * tagged pitches but spin on only 31 of them. Each average is therefore over
 * whatever actually had a value, and returns null when nothing did, rather
 * than reporting a confident 0.
 */
function mean(values: (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null)
  if (present.length === 0) return null
  return present.reduce((sum, value) => sum + value, 0) / present.length
}

function max(values: (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null)
  if (present.length === 0) return null
  return Math.max(...present)
}

/** Label used when a pitch arrived with no TaggedPitchType. */
export const UNTAGGED_PITCH_TYPE = 'Untagged'

export function averagesByPitchType(pitches: PitchRecord[]): PitchTypeAverages[] {
  const groups = new Map<string, PitchRecord[]>()

  for (const pitch of pitches) {
    // Untagged pitches are kept as their own group rather than dropped or
    // folded into a real pitch type. They were still thrown, and hiding them
    // would make the counts disagree with the athlete's own session.
    const key = pitch.pitchType?.trim() || UNTAGGED_PITCH_TYPE
    const existing = groups.get(key)
    if (existing) existing.push(pitch)
    else groups.set(key, [pitch])
  }

  return [...groups.entries()]
    .map(([pitchType, group]) => ({
      pitchType,
      count: group.length,
      avgRelSpeedMph: mean(group.map((p) => p.relSpeedMph)),
      maxRelSpeedMph: max(group.map((p) => p.relSpeedMph)),
      avgSpinRateRpm: mean(group.map((p) => p.spinRateRpm)),
      avgSpinAxisDeg: mean(group.map((p) => p.spinAxisDeg)),
      avgInducedVertBreakIn: mean(group.map((p) => p.inducedVertBreakIn)),
      avgHorzBreakIn: mean(group.map((p) => p.horzBreakIn)),
      avgExtensionFt: mean(group.map((p) => p.extensionFt)),
      avgRelHeightFt: mean(group.map((p) => p.relHeightFt)),
      avgRelSideFt: mean(group.map((p) => p.relSideFt)),
    }))
    // Most-thrown first: that is the athlete's primary pitch.
    .sort((a, b) => b.count - a.count || a.pitchType.localeCompare(b.pitchType))
}

export type SessionVelocityPoint = {
  sessionId: string
  label: string
  sortKey: string
  avgRelSpeedMph: number | null
  maxRelSpeedMph: number | null
  pitchCount: number
  source: string
}

/**
 * Velocity per session, oldest first, for the trend chart.
 *
 * Sessions whose pitches carry no velocity reading at all are dropped: a gap in
 * the line is honest, a plotted zero is not.
 */
export function velocityOverTime(
  sessions: { id: string; session_date: string | null; created_at: string; source: string }[],
  pitchesBySession: Map<string, PitchRecord[]>,
): SessionVelocityPoint[] {
  return sessions
    .map((session) => {
      const pitches = pitchesBySession.get(session.id) ?? []
      const avg = mean(pitches.map((p) => p.relSpeedMph))
      const peak = max(pitches.map((p) => p.relSpeedMph))
      const sortKey = session.session_date ?? session.created_at.slice(0, 10)
      return {
        sessionId: session.id,
        label: formatSessionLabel(session.session_date, session.created_at),
        sortKey,
        avgRelSpeedMph: avg,
        maxRelSpeedMph: peak,
        pitchCount: pitches.length,
        source: session.source,
      }
    })
    .filter((point) => point.avgRelSpeedMph !== null)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
}

/**
 * A session with no thrown-date falls back to its upload date, marked so the
 * athlete is not told we know when they threw when we do not.
 */
export function formatSessionLabel(sessionDate: string | null, createdAt: string): string {
  if (sessionDate) return formatShortDate(sessionDate)
  return `${formatShortDate(createdAt.slice(0, 10))} (uploaded)`
}

function formatShortDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${MONTHS[month - 1]} ${day}`
}

/** Round for display without implying precision the device did not report. */
export function formatMeasurement(value: number | null, digits = 1, unit = ''): string {
  if (value === null) return '—'
  return `${value.toFixed(digits)}${unit}`
}
