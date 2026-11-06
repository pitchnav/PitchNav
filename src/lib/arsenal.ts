import { z } from 'zod'
import { parseCsv } from './pitch-data'

/** Canonical units: mph, inches of induced movement, rpm, feet of release/extension.
 * HB and release side are positive to the pitcher's right in pitcher view.
 * The source is a provenance label, never a certification of measurement quality. */
export const ARSENAL_ANALYSIS_VERSION = '1.0.0'
const MAX_PAIR_COMPARISONS = 2000
export const pitchTypeKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase()
const measurement = (min: number, max: number) => z.number().finite().min(min).max(max).nullable()
export const arsenalPitchSchema = z.object({
  id: z.string().trim().min(1).max(160),
  pitchType: z.string().trim().min(1).max(80),
  velocity: measurement(1, 120),
  ivb: measurement(-60, 60),
  hb: measurement(-60, 60),
  spin: measurement(0, 6000),
  releaseHeight: measurement(0, 10),
  releaseSide: measurement(-10, 10),
  extension: measurement(0, 12),
  count: z.number().finite().int().min(1).max(1000000).nullable(),
  source: z.string().trim().max(300),
}).strict()
export const arsenalSchema = z.object({
  name: z.string().trim().min(1).max(120),
  handedness: z.enum(['RHP', 'LHP']),
  pitches: z.array(arsenalPitchSchema).min(1),
}).strict().superRefine((input, ctx) => {
  const ids = new Set<string>()
  input.pitches.forEach((pitch, index) => {
    if (ids.has(pitch.id)) ctx.addIssue({code: z.ZodIssueCode.custom, message: 'Pitch identifiers must be unique.', path: ['pitches', index, 'id']})
    ids.add(pitch.id)
  })
})
export type ArsenalPitch = z.infer<typeof arsenalPitchSchema>
export type ArsenalInput = z.infer<typeof arsenalSchema>
export type ArsenalPair = {
  pitchA: string; pitchB: string
  velocityGap: number | null; ivbGap: number | null; hbGap: number | null; movementGap: number | null
  notes: string[]
}
export type ArsenalAddition = {name: string; reason: string; profile: string; tradeoff: string}
export type ArsenalReport = {
  strengths: string[]; opportunities: string[]; pairs: ArsenalPair[]; additions: ArsenalAddition[]
  matchups: {lhh: string; rhh: string}; development: string[]; methodology: string
}
const fields = ['velocity', 'ivb', 'hb', 'spin', 'releaseHeight', 'releaseSide', 'extension'] as const
const gap = (a: number | null, b: number | null) => a === null || b === null ? null : Math.abs(a - b)
const display = (value: number) => value.toFixed(1)
const signed = (value: number) => `${value >= 0 ? '+' : ''}${display(value)}`

/** Explicit grouping for imported individual samples. Unknown counts are not invented.
 * Each metric uses only rows containing that metric; mixed unknown counts use equal
 * row weighting. Keep the original rows if sample spread or denominators are needed. */
export function aggregatePitches(pitches: ArsenalPitch[]): ArsenalPitch[] {
  const groups = new Map<string, ArsenalPitch[]>()
  for (const pitch of pitches) {
    const key = pitchTypeKey(pitch.pitchType)
    const group = groups.get(key)
    if (group) group.push(pitch)
    else groups.set(key, [pitch])
  }
  return [...groups.values()].map(group => {
    const weighted = group.every(p => p.count !== null)
    const result = {...group[0], count: weighted ? group.reduce((n, p) => n + p.count!, 0) : null,
      source: [...new Set(group.map(p => p.source || 'Source not recorded'))].join('; ')}
    for (const field of fields) {
      const present = group.filter(p => p[field] !== null)
      const denominator = present.reduce((n, p) => n + (weighted ? p.count! : 1), 0)
      result[field] = denominator ? present.reduce((n, p) => n + p[field]! * (weighted ? p.count! : 1), 0) / denominator : null
    }
    return result
  })
}

function unpairedMovementTypes(pitches: ArsenalPitch[]): Set<string> {
  return new Set(pitches.filter(p => (p.hb === null) !== (p.ivb === null)).map(p => pitchTypeKey(p.pitchType)))
}
function comparisons(pitches: ArsenalPitch[], unpaired: Set<string>): ArsenalPair[] {
  const pairs: ArsenalPair[] = []
  for (let a = 0; a < pitches.length; a++) for (let b = a + 1; b < pitches.length; b++) {
    if (pairs.length >= MAX_PAIR_COMPARISONS) return pairs
    const first = pitches[a], second = pitches[b]
    const velocityGap = gap(first.velocity, second.velocity)
    const ivbGap = gap(first.ivb, second.ivb)
    const hbGap = gap(first.hb, second.hb)
    const differentSamples = unpaired.has(pitchTypeKey(first.pitchType)) || unpaired.has(pitchTypeKey(second.pitchType))
    const movementGap = ivbGap === null || hbGap === null || differentSamples ? null : Math.hypot(ivbGap, hbGap)
    const notes: string[] = []
    if (differentSamples) notes.push('HB and IVB averages use different samples for at least one type. Combined movement distance is withheld; individual axis gaps remain descriptive.')
    if (velocityGap !== null) notes.push(`${display(velocityGap)} mph velocity separation.`)
    if (movementGap !== null) notes.push(`${display(movementGap)} in movement separation (${display(hbGap!)} HB, ${display(ivbGap!)} IVB).`)
    if (movementGap !== null && velocityGap !== null && movementGap <= 4 && velocityGap <= 3) notes.push('Potential overlap: compare intent, command and locations before calling either pitch redundant.')
    if (movementGap !== null && movementGap >= 8) notes.push('Distinct recorded movement profiles; usefulness still depends on execution.')
    if (movementGap === null || velocityGap === null) notes.push('Incomplete measurements limit compatibility assessment.')
    pairs.push({pitchA: first.pitchType, pitchB: second.pitchType, velocityGap, ivbGap, hbGap, movementGap, notes})
  }
  return pairs
}

export function basicAnalysis(input: ArsenalInput): Pick<ArsenalReport, 'strengths' | 'opportunities'> {
  const strengths: string[] = [], opportunities: string[] = []
  const pitches = aggregatePitches(input.pitches)
  const unpaired = unpairedMovementTypes(input.pitches)
  const pairs = comparisons(pitches, unpaired)
  const distinct = pairs.filter(p => p.movementGap !== null && p.movementGap >= 8)
  const separated = pairs.filter(p => p.velocityGap !== null && p.velocityGap >= 6)
  const overlap = pairs.filter(p => p.movementGap !== null && p.velocityGap !== null && p.movementGap <= 4 && p.velocityGap <= 3)
  if (distinct.length) strengths.push(`${distinct[0].pitchA} and ${distinct[0].pitchB} show ${display(distinct[0].movementGap!)} in of movement separation.`)
  if (separated.length) strengths.push(`${separated[0].pitchA} and ${separated[0].pitchB} offer a recorded ${display(separated[0].velocityGap!)} mph speed contrast.`)
  const armSign = input.handedness === 'RHP' ? 1 : -1
  if (pitches.some(p => p.hb !== null && p.hb * armSign >= 4) && pitches.some(p => p.hb !== null && p.hb * armSign <= -4)) strengths.push('Recorded movement includes both arm-side and glove-side shapes.')
  if (overlap.length) opportunities.push(`${overlap[0].pitchA} and ${overlap[0].pitchB} show potential overlap: ${display(overlap[0].movementGap!)} in movement and ${display(overlap[0].velocityGap!)} mph speed separation. Compare their intended roles and command.`)
  if (pitches.some(p => p.velocity === null || p.hb === null || p.ivb === null)) opportunities.push('Complete missing velocity, HB and IVB measurements before judging pitch compatibility; blanks are not zero.')
  if (unpaired.size) opportunities.push('Some HB and IVB averages use different samples. Combined movement comparisons for those types are withheld; retain the individual measurements and collect paired readings.')
  const possiblePairs = pitches.length * (pitches.length - 1) / 2
  if (possiblePairs > MAX_PAIR_COMPARISONS) opportunities.push(`Partial analysis: first ${MAX_PAIR_COMPARISONS.toLocaleString('en-US')} of ${possiblePairs.toLocaleString('en-US')} type pairs in entry order were compared. Review a focused revision for exhaustive comparisons; pitch-addition suggestions are withheld.`)
  if (pitches.length < 2) opportunities.push('Add another measured offering to compare separation within the arsenal.')
  if (pitches.some(p => p.count === null || p.count < 5)) opportunities.push('Sample size is unknown or below five for at least one profile. Confirm repeatability across planned sessions.')
  if (!strengths.length) strengths.push('These profiles establish a baseline for comparison; the available data do not yet demonstrate a specific separation strength.')
  if (!opportunities.length) opportunities.push('Check whether the recorded differences persist across sessions and intended locations before changing the mix.')
  return {strengths, opportunities}
}

export function fullAnalysis(input: ArsenalInput): ArsenalReport {
  const basic = basicAnalysis(input)
  const pitches = aggregatePitches(input.pitches)
  const unpaired = unpairedMovementTypes(input.pitches)
  const pairs = comparisons(pitches, unpaired)
  const additions: ArsenalAddition[] = []
  const armSign = input.handedness === 'RHP' ? 1 : -1
  // Anchor a test to an actual fastball, never to an empty chart quadrant.
  const fastball = pitches.filter(p => /fastball|fast ball|four.?seam|two.?seam|sinker|^fb$|^ff$|^si$|^ft$/i.test(p.pitchType)
    && !unpaired.has(pitchTypeKey(p.pitchType)) && p.velocity !== null && p.hb !== null && p.ivb !== null).sort((a, b) => b.velocity! - a.velocity!)[0]
  if (fastball && pitches.length * (pitches.length - 1) / 2 <= MAX_PAIR_COMPARISONS) {
    const known = pitches.filter(p => !unpaired.has(pitchTypeKey(p.pitchType)) && p.velocity !== null && p.hb !== null && p.ivb !== null)
    const hasGloveAlternative = known.some(p => p.hb! * armSign <= -4 && gap(p.velocity, fastball.velocity)! >= 3)
    const hasSlowerAlternative = known.some(p => fastball.velocity! - p.velocity! >= 6 && Math.hypot(p.hb! - fastball.hb!, p.ivb! - fastball.ivb!) >= 4)
    if (!hasGloveAlternative && fastball.hb! * armSign >= 6 && fastball.ivb! >= 8) {
      additions.push({name: 'Slider / cutter shape trial',
        reason: `${fastball.pitchType} is ${display(fastball.velocity!)} mph with ${signed(fastball.hb!)} in HB and ${signed(fastball.ivb!)} in IVB. No fully measured slower glove-side alternative is recorded.`,
        profile: `Compare a glove-side trial around ${signed(-4 * armSign)} to ${signed(-8 * armSign)} in HB, 4–8 in less IVB and 4–8 mph less velocity than ${fastball.pitchType}. These are exploratory contrasts, not prescribed targets.`,
        tradeoff: 'Test command, comfort and repeatability with a coach during planned throwing. A new grip may change velocity or release; shape alone does not establish effectiveness.'})
    }
    if (!hasSlowerAlternative && fastball.velocity! > 20) {
      additions.push({name: 'Changeup shape trial',
        reason: `No fully measured offering combines at least 6 mph less velocity with 4 in of movement separation from ${fastball.pitchType}.`,
        profile: `Explore 6–10 mph less velocity and 4–8 in less IVB than ${fastball.pitchType}, while observing whether arm-side movement and a repeatable release can be retained.`,
        tradeoff: 'A slower pitch is not automatically useful. Compare location, release consistency and actual hitter results; avoid forcing a target shape.'})
    }
  }
  const directions = pitches.filter(p => p.hb !== null)
  const diversity = directions.some(p => p.hb! >= 4) && directions.some(p => p.hb! <= -4)
    ? 'Both horizontal directions are represented.' : 'The recorded horizontal shapes do not establish both directions; this alone is not a weakness.'
  const matchup = (side: string) => `Results against ${side} hitters were not supplied. ${diversity} Review pitch usage, location and actual outcomes against ${side} hitters before making a matchup judgment; movement alone cannot establish an advantage or disadvantage.`
  const development = [
    'Confirm missing measurements, units, HB convention and source with the original export. Athlete-entered and uploaded values are not independently verified by Pitch Nav.',
    'Repeat the existing mix during planned throwing and compare per-pitch spread, command and intent, rather than changing pitches from averages alone.',
    ...(pairs.some(p => p.movementGap !== null && p.velocityGap !== null && p.movementGap <= 4 && p.velocityGap <= 3) ? ['For overlapping profiles, test distinct intended locations and roles before replacing or merging an offering.'] : []),
    ...(additions.length ? ['Test one proposed shape at a time with a coach and compare it with the current fastball. Keep it only if it is repeatable and serves a useful role.'] : []),
    'Connect a selected development priority to the existing mechanics review or training plan; mechanics video does not supply validated spin or movement measurements.',
  ]
  return {...basic, pairs, additions, matchups: {lhh: matchup('left-handed'), rhh: matchup('right-handed')}, development,
    methodology: 'Descriptive heuristics, not validated grades or performance predictions: overlap means movement distance ≤4 in and velocity gap ≤3 mph; distinct movement ≥8 in; speed contrast ≥6 mph. Movement distance is Euclidean HB/IVB separation. Labels are grouped ignoring case and whitespace only. At most 2,000 pairs are compared in entry order; larger arsenals receive a partial comparison and no addition suggestions. Combined movement is withheld when HB and IVB means use different rows. Same-type rows are averaged using supplied counts when every count is known, otherwise equally by row; each metric excludes its missing values. Sample spread and metric-specific sample sizes may differ. HB is positive to pitcher right, negative to pitcher left in pitcher view (RHP arm-side positive; LHP arm-side negative). Missing values stay unavailable. Sources and units require user confirmation. No matchup statistics, normative grades or inferred video measurements are used.'}
}

export type ArsenalImportOptions = {handedness: 'RHP' | 'LHP'; convention: 'pitcher-right' | 'catcher-right' | 'arm-side'; velocityUnit: 'mph' | 'kmh'; movementUnit: 'in' | 'cm'; source: string; pitcher?: string}
type ImportField = typeof fields[number] | 'pitchType' | 'count' | 'pitcher' | 'source'
const aliases: Record<string, ImportField> = {
  pitchtype: 'pitchType', taggedpitchtype: 'pitchType', pitch: 'pitchType',
  velocity: 'velocity', averagevelocity: 'velocity', avgvelocity: 'velocity', relspeed: 'velocity', releasespeed: 'velocity',
  ivb: 'ivb', inducedvertbreak: 'ivb', inducedverticalbreak: 'ivb',
  hb: 'hb', horzbreak: 'hb', horizontalbreak: 'hb',
  spin: 'spin', spinrate: 'spin', releaseheight: 'releaseHeight', relheight: 'releaseHeight',
  releaseside: 'releaseSide', relside: 'releaseSide', extension: 'extension',
  count: 'count', pitchcount: 'count', numberofpitches: 'count', recordedpitches: 'count',
  pitcher: 'pitcher', pitchername: 'pitcher', source: 'source', datasource: 'source',
}
function column(header: string): {field: ImportField; unit?: string} | null {
  const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (aliases[normalized]) return {field: aliases[normalized]}
  for (const suffix of ['inches', 'kmh', 'mph', 'rpm', 'feet', 'inch', 'cm', 'ft', 'in', 'm']) {
    if (normalized.endsWith(suffix) && aliases[normalized.slice(0, -suffix.length)]) return {field: aliases[normalized.slice(0, -suffix.length)], unit: suffix === 'inches' || suffix === 'inch' ? 'in' : suffix === 'feet' ? 'ft' : suffix}
  }
  const explicitUnit = header.match(/^(.*?)\s*[([]([^()[\]]+)[)\]]\s*$/)
  if (explicitUnit && aliases[explicitUnit[1].toLowerCase().replace(/[^a-z0-9]/g, '')]) throw new Error(`Unsupported unit in ${header}.`)
  return null
}
function validateCsvQuotes(text: string) {
  // parseCsv deliberately tolerates malformed input; refuse unclosed quotes here.
  let quoted = false
  for (let i = 0; i < text.length; i++) if (text[i] === '"') {
    if (quoted && text[i + 1] === '"') i++
    else quoted = !quoted
  }
  if (quoted) throw new Error('CSV has an unclosed quote. Export the file again.')
}
function numeric(value: string, row: number, header: string): number | null {
  const cell = value.trim()
  if (!cell || /^(na|n\/a|null|-|--)$/i.test(cell)) return null
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(cell) || !Number.isFinite(Number(cell))) throw new Error(`Row ${row}: ${header} must be a finite number or blank.`)
  return Number(cell)
}
export function importCsv(text: string, options: ArsenalImportOptions): {pitches: ArsenalPitch[]; warnings: string[]; pitchers: string[]} {
  validateCsvQuotes(text)
  const rows = parseCsv(text).filter(row => row.some(cell => cell.trim()))
  if (rows.length < 2) throw new Error('CSV must include a header and at least one pitch row.')
  const columns = rows[0].map(column)
  if (!columns.some(col => col && col.field !== 'pitcher' && col.field !== 'source')) throw new Error('No recognized pitch columns. Include PitchType, Velocity, IVB or HB headers.')
  const seen = new Set<ImportField>()
  columns.forEach(col => {
    if (!col) return
    if (seen.has(col.field)) throw new Error(`Duplicate ${col.field} columns. Keep one confirmed column per measurement.`)
    seen.add(col.field)
    if (!col.unit) return
    const expected = col.field === 'velocity' ? [options.velocityUnit] : col.field === 'ivb' || col.field === 'hb' ? [options.movementUnit] : col.field === 'spin' ? ['rpm'] : ['releaseHeight', 'releaseSide', 'extension'].includes(col.field) ? ['ft', 'm', 'cm', 'in'] : []
    if (!expected.includes(col.unit)) throw new Error(`Header unit for ${col.field} conflicts with the selected unit or is unsupported.`)
  })
  const pitcherColumn = columns.findIndex(col => col?.field === 'pitcher')
  const pitchers = [...new Map(rows.slice(1).map(row => (row[pitcherColumn] ?? '').trim()).filter(Boolean).map(name => [name.toLowerCase(), name])).values()]
  const warnings = ['Uploaded values are athlete-supplied and not independently verified. Confirm source, units and horizontal convention before saving.', 'Release height, release side and extension use feet unless the header specifies a unit. Each row is retained; averages exclude missing metrics.']
  const unassigned = pitcherColumn >= 0 && rows.slice(1).some(row => !(row[pitcherColumn] ?? '').trim())
  if (!options.pitcher && (pitchers.length > 1 || (pitchers.length > 0 && unassigned))) return {pitches: [], pitchers, warnings: [...warnings, 'Select one pitcher before importing this file. Unassigned rows are excluded from a named selection.']}
  if (options.pitcher && (pitcherColumn < 0 || !pitchers.some(name => name.toLowerCase() === options.pitcher!.trim().toLowerCase()))) throw new Error('Selected pitcher was not found in this CSV.')
  const sign = options.convention === 'catcher-right' ? -1 : options.convention === 'arm-side' && options.handedness === 'LHP' ? -1 : 1
  const pitches: ArsenalPitch[] = []
  rows.slice(1).forEach((row, index) => {
    if (row.length !== columns.length) throw new Error(`Row ${index + 2}: column count differs from the header.`)
    if (options.pitcher && row[pitcherColumn].trim().toLowerCase() !== options.pitcher.trim().toLowerCase()) return
    const pitch: ArsenalPitch = {id: `csv-${index + 1}`, pitchType: 'Untagged', velocity: null, ivb: null, hb: null, spin: null, releaseHeight: null, releaseSide: null, extension: null, count: null, source: options.source.trim() || 'CSV, athlete-uploaded'}
    columns.forEach((col, columnIndex) => {
      if (!col || col.field === 'pitcher') return
      const cell = row[columnIndex].trim()
      if (col.field === 'pitchType') { pitch.pitchType = cell || 'Untagged'; return }
      if (col.field === 'source') { if (cell) pitch.source = `${pitch.source}; ${cell}`; return }
      let value = numeric(cell, index + 2, rows[0][columnIndex])
      if (value !== null) {
        if (col.field === 'velocity' && options.velocityUnit === 'kmh') value /= 1.609344
        if ((col.field === 'hb' || col.field === 'ivb') && options.movementUnit === 'cm') value /= 2.54
        if (['releaseHeight', 'releaseSide', 'extension'].includes(col.field)) value *= col.unit === 'm' ? 1 / 0.3048 : col.unit === 'cm' ? 1 / 30.48 : col.unit === 'in' ? 1 / 12 : 1
        if (col.field === 'hb' || col.field === 'releaseSide') value *= sign
      }
      pitch[col.field] = value
    })
    const valid = arsenalPitchSchema.safeParse(pitch)
    if (!valid.success) throw new Error(`Row ${index + 2}: ${valid.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`)
    pitches.push(valid.data)
  })
  if (!pitches.length) throw new Error('No pitch rows matched the selected pitcher.')
  if (pitches.some(pitch => pitch.count === null)) warnings.push('Sample counts are unknown for rows without an explicit Count value. A CSV row may be an average; row totals are not recorded pitch totals.')
  return {pitches, warnings, pitchers}
}
