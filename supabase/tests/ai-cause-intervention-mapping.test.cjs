const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const Module = require('node:module')
const { dirname, join } = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const projectRoot = join(__dirname, '..', '..')

function requireTypeScript(filePath) {
  const source = readFileSync(filePath, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const loaded = new Module(filePath)
  loaded.filename = filePath
  loaded.paths = Module._nodeModulePaths(dirname(filePath))
  loaded._compile(output, filePath)
  return loaded.exports
}

test('performance plan uses a generic category default when no likely_cause is given', () => {
  const { buildBaseballPerformancePlan } = requireTypeScript(
    join(projectRoot, 'src/lib/performance-plan.ts')
  )
  const plan = buildBaseballPerformancePlan([
    { category: 'Front-Side Stability', score: 1, confidence: 'High', development: 'The lead leg keeps traveling forward instead of blocking.' },
    { category: 'Posture', score: 4, confidence: 'High' },
  ])

  assert.match(plan[0].correlations[0].lift_emphasis, /Single-leg Romanian deadlift/)
  assert.doesNotMatch(plan[0].correlations[0].rationale, /Likely driven by/)
})

test('a hamstring-tightness likely_cause overrides the lift/mobility emphasis and names the cause', () => {
  const { buildBaseballPerformancePlan } = requireTypeScript(
    join(projectRoot, 'src/lib/performance-plan.ts')
  )
  const plan = buildBaseballPerformancePlan([
    {
      category: 'Front-Side Stability',
      score: 1,
      confidence: 'High',
      development: 'The lead leg keeps traveling forward instead of blocking at foot strike.',
      likely_cause: 'hamstring_tightness_or_weakness',
    },
    { category: 'Posture', score: 4, confidence: 'High' },
  ])

  const correlation = plan[0].correlations[0]
  assert.match(correlation.lift_emphasis, /Single-leg Romanian deadlift/)
  assert.match(correlation.mobility_emphasis, /hamstring/i)
  assert.match(correlation.rationale, /Likely driven by hamstring tightness or strength/)
})

test('two athletes with the same weak category but different likely_cause get different lifts', () => {
  const { buildBaseballPerformancePlan } = requireTypeScript(
    join(projectRoot, 'src/lib/performance-plan.ts')
  )
  const hamstringPlan = buildBaseballPerformancePlan([
    { category: 'Front-Side Stability', score: 1, confidence: 'High', likely_cause: 'hamstring_tightness_or_weakness' },
    { category: 'Posture', score: 4, confidence: 'High' },
  ])
  const anklePlan = buildBaseballPerformancePlan([
    { category: 'Front-Side Stability', score: 1, confidence: 'High', likely_cause: 'ankle_stability_limitation' },
    { category: 'Posture', score: 4, confidence: 'High' },
  ])

  assert.notEqual(
    hamstringPlan[0].correlations[0].lift_emphasis,
    anklePlan[0].correlations[0].lift_emphasis
  )
})

test('throwing plan pulls a real drill name from the catalog for the weakest category', () => {
  const { buildEightWeekThrowingPlan } = requireTypeScript(
    join(projectRoot, 'src/lib/throwing-plan.ts')
  )
  const plan = buildEightWeekThrowingPlan(
    [{ category: 'Front-Side Stability', score: 1, confidence: 'high', development: 'Loose lead-leg block.' }],
    [],
    [
      { name: 'Lead-Leg Isometric Hold', category: 'lead_leg_stability', description: 'Hold a stable post-contact position.', sets: 3, reps: '20 seconds' },
      { name: 'Nine-Box Command', category: 'command', description: 'Hit nine targets.', sets: 3, reps: '9 pitches' },
    ]
  )

  assert.match(plan[0].days[0].work, /Lead-Leg Isometric Hold/)
  assert.doesNotMatch(plan[0].days[0].work, /Nine-Box Command/)
})

test('throwing plan falls back to generic wording when no matching drill is in the catalog', () => {
  const { buildEightWeekThrowingPlan } = requireTypeScript(
    join(projectRoot, 'src/lib/throwing-plan.ts')
  )
  const plan = buildEightWeekThrowingPlan([
    { category: 'Direction', score: 1, confidence: 'high', development: 'Keep the stride on the target line.' },
  ])

  assert.match(plan[0].days[0].work, /complete 3 sets of 5 controlled reps/)
})
