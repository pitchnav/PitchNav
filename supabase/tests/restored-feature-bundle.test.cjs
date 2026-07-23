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

test('throwing plan has eight ordered weeks and four reassessments', () => {
  const { buildEightWeekThrowingPlan } = requireTypeScript(
    join(projectRoot, 'src/lib/throwing-plan.ts')
  )
  const plan = buildEightWeekThrowingPlan([
    {
      category: 'Direction',
      score: 2,
      confidence: 'high',
      development: 'Keep the stride on the target line.',
    },
  ])

  assert.deepEqual(plan.map((week) => week.week), [1, 2, 3, 4, 5, 6, 7, 8])
  assert.deepEqual(
    plan.filter((week) => week.reassessment).map((week) => week.week),
    [2, 4, 6, 8]
  )
  assert.match(plan[7].days[6].work, /stops here and does not repeat/i)
  assert.match(plan[7].days[6].work, /in-season, preseason, or offseason/i)
})

test('throwing plan favors clearer evidence when ranking the primary focus', () => {
  const { buildEightWeekThrowingPlan } = requireTypeScript(
    join(projectRoot, 'src/lib/throwing-plan.ts')
  )
  const plan = buildEightWeekThrowingPlan([
    {
      category: 'Direction',
      score: 1,
      confidence: 'low',
      development: 'Keep the stride on the target line.',
    },
    {
      category: 'Posture',
      score: 1.5,
      confidence: 'high',
      development: 'Keep the head centered over the base.',
    },
  ])

  assert.equal(plan[0].days[0].focus, 'Posture drill work')
  assert.match(plan[0].days[0].work, /Keep the head centered over the base/)
})

test('athlete calendar stops after the final week instead of looping', () => {
  const source = readFileSync(
    join(projectRoot, 'src/components/reports/InteractiveFeedbackTools.tsx'),
    'utf8'
  )

  assert.doesNotMatch(source, /%\s*weeks\.length/)
  assert.match(source, /programWeekIndex\s*>=\s*weeks\.length/)
  assert.match(source, /Eight-week (?:review|block) complete/)
})

test('first publication anchors the training plan for exactly eight weeks', () => {
  const { buildTrainingPlanPublishUpdate } = requireTypeScript(
    join(projectRoot, 'src/lib/training-plan-schedule.ts')
  )

  assert.deepEqual(
    buildTrainingPlanPublishUpdate('2026-07-23T14:30:00.000Z', {
      published_at: null,
      starts_on: null,
      follow_up_date: null,
    }),
    {
      published_at: '2026-07-23T14:30:00.000Z',
      starts_on: '2026-07-23',
      follow_up_date: '2026-09-17',
    }
  )
})

test('re-publication preserves the original training plan schedule', () => {
  const { buildTrainingPlanPublishUpdate } = requireTypeScript(
    join(projectRoot, 'src/lib/training-plan-schedule.ts')
  )
  const existing = {
    published_at: '2026-07-23T14:30:00.000Z',
    starts_on: '2026-07-23',
    follow_up_date: '2026-09-17',
  }

  assert.deepEqual(
    buildTrainingPlanPublishUpdate('2026-08-01T12:00:00.000Z', existing),
    existing
  )
})
