import {
  parseCsv,
  parsePitchFile,
  averagesByPitchType,
  velocityOverTime,
  sourceLabel,
  formatSessionLabel,
  formatMeasurement,
  UNTAGGED_PITCH_TYPE,
  EMPTY_PITCH,
  type PitchRecord,
} from './pitch-data'

// A realistic TrackMan-shaped export: the columns Luke specified, two pitchers
// in one file (which is the normal case for a bullpen export), a blank spin
// cell, and an "NA" the way TrackMan writes absent values.
const TRACKMAN_CSV = [
  'Date,Pitcher,TaggedPitchType,RelSpeed,SpinRate,SpinAxis,InducedVertBreak,HorzBreak,RelHeight,RelSide,Extension',
  '2026-04-12,"Condrin, Luke",Fastball,91.4,2310,205,16.2,-8.1,5.92,-1.84,6.21',
  '2026-04-12,"Condrin, Luke",Fastball,92.6,2355,203,16.8,-8.6,5.95,-1.80,6.30',
  '2026-04-12,"Condrin, Luke",Slider,82.1,2480,118,1.2,9.4,5.88,-1.91,6.12',
  '2026-04-12,"Condrin, Luke",Slider,81.5,,120,0.8,10.1,5.90,-1.88,NA',
  '2026-04-12,"Other, Pitcher",Fastball,88.0,2100,210,14.0,-7.0,5.70,-1.50,6.00',
].join('\n')

describe('parseCsv', () => {
  it('handles quoted fields containing commas', () => {
    const rows = parseCsv('a,b\n"Condrin, Luke",91.4')
    expect(rows[1]).toEqual(['Condrin, Luke', '91.4'])
  })

  it('handles escaped double quotes', () => {
    const rows = parseCsv('name\n"He said ""hi"""')
    expect(rows[1]).toEqual(['He said "hi"'])
  })

  it('handles CRLF line endings', () => {
    const rows = parseCsv('a,b\r\n1,2\r\n')
    expect(rows).toEqual([['a', 'b'], ['1', '2']])
  })

  it('handles a final row with no trailing newline', () => {
    const rows = parseCsv('a,b\n1,2')
    expect(rows).toHaveLength(2)
    expect(rows[1]).toEqual(['1', '2'])
  })

  it('strips a UTF-8 byte-order mark so the first header still matches', () => {
    const rows = parseCsv('﻿RelSpeed,SpinRate\n91.4,2310')
    expect(rows[0][0]).toBe('RelSpeed')
  })

  it('keeps newlines that are inside quotes', () => {
    const rows = parseCsv('a,b\n"line1\nline2",x')
    expect(rows).toHaveLength(2)
    expect(rows[1][0]).toBe('line1\nline2')
  })
})

describe('parsePitchFile', () => {
  it('lists every pitcher in the file so the athlete can be chosen', () => {
    const result = parsePitchFile(TRACKMAN_CSV)
    expect(result.hasPitcherColumn).toBe(true)
    expect(result.pitchers).toEqual(['Condrin, Luke', 'Other, Pitcher'])
  })

  it('returns only the requested pitcher\'s pitches', () => {
    const result = parsePitchFile(TRACKMAN_CSV, 'Condrin, Luke')
    expect(result.pitches).toHaveLength(4)
  })

  it('does not attribute another pitcher\'s rows to the athlete', () => {
    const result = parsePitchFile(TRACKMAN_CSV, 'Condrin, Luke')
    // 88.0 is the other pitcher's only throw.
    expect(result.pitches.some((p) => p.relSpeedMph === 88.0)).toBe(false)
  })

  it('matches the pitcher name case-insensitively', () => {
    const result = parsePitchFile(TRACKMAN_CSV, 'condrin, luke')
    expect(result.pitches).toHaveLength(4)
  })

  it('reads every specified TrackMan column', () => {
    const [first] = parsePitchFile(TRACKMAN_CSV, 'Condrin, Luke').pitches
    expect(first).toMatchObject({
      pitchType: 'Fastball',
      relSpeedMph: 91.4,
      spinRateRpm: 2310,
      spinAxisDeg: 205,
      inducedVertBreakIn: 16.2,
      horzBreakIn: -8.1,
      relHeightFt: 5.92,
      relSideFt: -1.84,
      extensionFt: 6.21,
    })
  })

  it('reads an ISO session date out of the file', () => {
    expect(parsePitchFile(TRACKMAN_CSV, 'Condrin, Luke').sessionDate).toBe('2026-04-12')
  })

  it('refuses an ambiguous non-ISO date rather than guessing day/month order', () => {
    const csv = 'Date,RelSpeed\n03/04/2026,91.4'
    expect(parsePitchFile(csv).sessionDate).toBeNull()
  })

  it('leaves a blank measurement null instead of zero', () => {
    // Pitch 4 has an empty SpinRate. Averaging a 0 in would understate spin.
    const pitches = parsePitchFile(TRACKMAN_CSV, 'Condrin, Luke').pitches
    expect(pitches[3].spinRateRpm).toBeNull()
  })

  it('treats TrackMan "NA" as absent, not as a number', () => {
    const pitches = parsePitchFile(TRACKMAN_CSV, 'Condrin, Luke').pitches
    expect(pitches[3].extensionFt).toBeNull()
  })

  it('ignores columns it does not recognise rather than guessing', () => {
    const csv = 'RelSpeed,SomeFutureMetric\n91.4,999'
    const result = parsePitchFile(csv)
    expect(result.matchedColumns).toEqual(['RelSpeed'])
    expect(result.pitches[0].relSpeedMph).toBe(91.4)
  })

  it('matches headers regardless of case, spaces or underscores', () => {
    const csv = 'rel_speed,Spin Rate,TAGGEDPITCHTYPE\n91.4,2310,Fastball'
    const [pitch] = parsePitchFile(csv).pitches
    expect(pitch.relSpeedMph).toBe(91.4)
    expect(pitch.spinRateRpm).toBe(2310)
    expect(pitch.pitchType).toBe('Fastball')
  })

  it('numbers pitches in file order', () => {
    const pitches = parsePitchFile(TRACKMAN_CSV, 'Condrin, Luke').pitches
    expect(pitches.map((p) => p.pitchNo)).toEqual([1, 2, 3, 4])
  })

  it('returns nothing for an empty or header-only file', () => {
    expect(parsePitchFile('').pitches).toHaveLength(0)
    expect(parsePitchFile('RelSpeed,SpinRate').pitches).toHaveLength(0)
  })

  it('skips rows with no recognisable values', () => {
    const csv = 'RelSpeed\n91.4\n\n,\n92.0'
    expect(parsePitchFile(csv).pitches).toHaveLength(2)
  })

  it('keeps all rows when the file has no Pitcher column', () => {
    const csv = 'RelSpeed\n91.4\n92.0'
    const result = parsePitchFile(csv, 'Anyone')
    expect(result.hasPitcherColumn).toBe(false)
    expect(result.pitches).toHaveLength(2)
  })
})

describe('averagesByPitchType', () => {
  const pitches = parsePitchFile(TRACKMAN_CSV, 'Condrin, Luke').pitches

  it('groups by tagged pitch type', () => {
    const rows = averagesByPitchType(pitches)
    expect(rows.map((r) => r.pitchType).sort()).toEqual(['Fastball', 'Slider'])
  })

  it('averages velocity within a pitch type', () => {
    const fastball = averagesByPitchType(pitches).find((r) => r.pitchType === 'Fastball')!
    expect(fastball.avgRelSpeedMph).toBeCloseTo(92.0, 5)
    expect(fastball.maxRelSpeedMph).toBe(92.6)
    expect(fastball.count).toBe(2)
  })

  it('averages only the pitches that actually had a reading', () => {
    // Sliders: spin present on one of two (2480 and blank). The average must be
    // 2480, not 1240 — a missing reading is not a reading of zero.
    const slider = averagesByPitchType(pitches).find((r) => r.pitchType === 'Slider')!
    expect(slider.avgSpinRateRpm).toBe(2480)
    expect(slider.count).toBe(2)
  })

  it('returns null, not zero, when no pitch in the group had a reading', () => {
    const noSpin: PitchRecord[] = [{ ...EMPTY_PITCH, pitchType: 'Fastball', relSpeedMph: 90 }]
    expect(averagesByPitchType(noSpin)[0].avgSpinRateRpm).toBeNull()
  })

  it('keeps untagged pitches as their own group instead of dropping them', () => {
    const mixed: PitchRecord[] = [
      { ...EMPTY_PITCH, pitchType: 'Fastball', relSpeedMph: 90 },
      { ...EMPTY_PITCH, pitchType: null, relSpeedMph: 85 },
    ]
    const rows = averagesByPitchType(mixed)
    expect(rows.map((r) => r.pitchType)).toContain(UNTAGGED_PITCH_TYPE)
    expect(rows.reduce((sum, r) => sum + r.count, 0)).toBe(2)
  })

  it('orders the most-thrown pitch first', () => {
    const mixed: PitchRecord[] = [
      { ...EMPTY_PITCH, pitchType: 'Slider', relSpeedMph: 82 },
      { ...EMPTY_PITCH, pitchType: 'Fastball', relSpeedMph: 91 },
      { ...EMPTY_PITCH, pitchType: 'Fastball', relSpeedMph: 92 },
    ]
    expect(averagesByPitchType(mixed)[0].pitchType).toBe('Fastball')
  })
})

describe('velocityOverTime', () => {
  const sessions = [
    { id: 'b', session_date: '2026-05-01', created_at: '2026-05-02T00:00:00Z', source: 'trackman' },
    { id: 'a', session_date: '2026-04-12', created_at: '2026-04-13T00:00:00Z', source: 'trackman' },
  ]
  const byId = new Map<string, PitchRecord[]>([
    ['a', [{ ...EMPTY_PITCH, relSpeedMph: 90 }, { ...EMPTY_PITCH, relSpeedMph: 92 }]],
    ['b', [{ ...EMPTY_PITCH, relSpeedMph: 93 }]],
  ])

  it('orders oldest first regardless of input order', () => {
    expect(velocityOverTime(sessions, byId).map((p) => p.sessionId)).toEqual(['a', 'b'])
  })

  it('reports average and peak per session', () => {
    const [first] = velocityOverTime(sessions, byId)
    expect(first.avgRelSpeedMph).toBe(91)
    expect(first.maxRelSpeedMph).toBe(92)
    expect(first.pitchCount).toBe(2)
  })

  it('drops a session with no velocity rather than plotting it as zero', () => {
    const withEmpty = [...sessions, { id: 'c', session_date: '2026-06-01', created_at: '2026-06-01T00:00:00Z', source: 'manual' }]
    const map = new Map(byId)
    map.set('c', [{ ...EMPTY_PITCH, spinRateRpm: 2300 }])
    const points = velocityOverTime(withEmpty, map)
    expect(points.map((p) => p.sessionId)).not.toContain('c')
  })

  it('falls back to the upload date when the session has no thrown-date', () => {
    const undated = [{ id: 'x', session_date: null, created_at: '2026-07-04T00:00:00Z', source: 'manual' }]
    const map = new Map([['x', [{ ...EMPTY_PITCH, relSpeedMph: 88 }]]])
    expect(velocityOverTime(undated, map)[0].label).toContain('uploaded')
  })

  it('returns nothing when there are no sessions', () => {
    expect(velocityOverTime([], new Map())).toEqual([])
  })
})

describe('source labelling', () => {
  it('names the device and says the athlete supplied it', () => {
    expect(sourceLabel('trackman')).toBe('TrackMan, athlete-uploaded')
    expect(sourceLabel('rapsodo')).toBe('Rapsodo, athlete-uploaded')
    expect(sourceLabel('manual')).toBe('Athlete-entered')
  })

  it('never silently claims a source it does not know', () => {
    expect(sourceLabel('something_else')).toBe('Source not recorded')
  })
})

describe('formatting', () => {
  it('marks a session without a thrown-date as an upload date', () => {
    expect(formatSessionLabel(null, '2026-07-04T12:00:00Z')).toBe('Jul 4 (uploaded)')
    expect(formatSessionLabel('2026-04-12', '2026-04-13T12:00:00Z')).toBe('Apr 12')
  })

  it('shows an em-dash for a missing measurement rather than 0.0', () => {
    expect(formatMeasurement(null)).toBe('—')
    expect(formatMeasurement(91.42, 1, ' mph')).toBe('91.4 mph')
  })
})
