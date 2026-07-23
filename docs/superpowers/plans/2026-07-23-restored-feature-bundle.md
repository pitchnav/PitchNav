# Restored Feature Bundle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the restored athlete-feedback feature bundle and make every eight-week training plan start on its first publication date without resetting on re-publication.

**Architecture:** Keep the existing throwing-plan generator as the shared source for browser submissions and staff AI review. Add a small pure scheduling module that computes immutable publication-day dates, test it directly, and call it from the existing admin publication route after confirming the analysis, report, and training plan exist. Add characterization tests around the restored generator and calendar behavior so later edits cannot reintroduce looping or weaken the eight-week structure.

**Tech Stack:** Next.js App Router, TypeScript, Supabase, Node's built-in test runner, Jest, ESLint

## Global Constraints

- Preserve the restored working-tree changes as one coherent release.
- Do not add a database migration or change environment variables.
- Keep athlete report authorization unchanged: owner, published status, and non-null publication timestamp.
- Keep staff review as the gate for AI-generated coaching language.
- Do not reset `starts_on` or `follow_up_date` after a plan has been published.
- Do not use subagents in this session; execute this plan inline.

---

### Task 1: Lock the restored eight-week behavior with characterization tests

**Files:**
- Create: `supabase/tests/restored-feature-bundle.test.cjs`
- Test: `src/lib/throwing-plan.ts`
- Test: `src/app/dashboard/feedback/[id]/page.tsx`

- [ ] **Step 1: Write a TypeScript module loader for the Node test**

Use the installed `typescript` package to transpile `src/lib/throwing-plan.ts` to CommonJS in memory:

```js
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
```

- [ ] **Step 2: Add throwing-plan characterization tests**

Assert that `buildEightWeekThrowingPlan`:

```js
assert.deepEqual(plan.map((week) => week.week), [1, 2, 3, 4, 5, 6, 7, 8])
assert.deepEqual(
  plan.filter((week) => week.reassessment).map((week) => week.week),
  [2, 4, 6, 8]
)
assert.match(plan[7].days[6].work, /stops here and does not repeat/i)
assert.match(plan[7].days[6].work, /in-season, preseason, or offseason/i)
```

Use a low-score/low-confidence category and a slightly higher-score/high-confidence category to prove the clearer observation becomes Monday's primary focus.

- [ ] **Step 3: Add a calendar non-looping characterization test**

Read `src/app/dashboard/feedback/[id]/page.tsx` as text and assert that it:

```js
assert.doesNotMatch(source, /%\s*weeks\.length/)
assert.match(source, /programWeekIndex\s*>=\s*weeks\.length/)
assert.match(source, /Eight-week program complete/)
```

- [ ] **Step 4: Run the focused test**

Run:

```bash
node --test supabase/tests/restored-feature-bundle.test.cjs
```

Expected: all characterization tests pass, proving the restored behavior is already present.

- [ ] **Step 5: Commit the tests**

```bash
git add supabase/tests/restored-feature-bundle.test.cjs
git commit -m "test: cover restored training plan behavior"
```

---

### Task 2: Add a publication-day scheduling helper test-first

**Files:**
- Modify: `supabase/tests/restored-feature-bundle.test.cjs`
- Create: `src/lib/training-plan-schedule.ts`

- [ ] **Step 1: Write failing scheduling tests**

Add tests for a first publication:

```js
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
```

Add a re-publication test proving existing values remain unchanged:

```js
assert.deepEqual(
  buildTrainingPlanPublishUpdate('2026-08-01T12:00:00.000Z', existing),
  existing
)
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
node --test supabase/tests/restored-feature-bundle.test.cjs
```

Expected: fail because `src/lib/training-plan-schedule.ts` does not exist.

- [ ] **Step 3: Implement the smallest pure helper**

Create:

```ts
export type TrainingPlanSchedule = {
  published_at: string | null
  starts_on: string | null
  follow_up_date: string | null
}

export function buildTrainingPlanPublishUpdate(
  publishedAt: string,
  existing: TrainingPlanSchedule
): TrainingPlanSchedule {
  if (existing.published_at) return existing

  const publishedDate = new Date(publishedAt)
  if (Number.isNaN(publishedDate.getTime())) {
    throw new Error('Invalid training-plan publication date.')
  }

  const followUpDate = new Date(publishedDate)
  followUpDate.setUTCDate(followUpDate.getUTCDate() + 56)

  return {
    published_at: publishedAt,
    starts_on: publishedDate.toISOString().slice(0, 10),
    follow_up_date: followUpDate.toISOString().slice(0, 10),
  }
}
```

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run:

```bash
node --test supabase/tests/restored-feature-bundle.test.cjs
```

Expected: all tests pass.

- [ ] **Step 5: Commit the helper and tests**

```bash
git add src/lib/training-plan-schedule.ts supabase/tests/restored-feature-bundle.test.cjs
git commit -m "feat: anchor training plans to publication day"
```

---

### Task 3: Wire the publication route without permitting schedule resets

**Files:**
- Modify: `src/app/api/admin/publish-report/route.ts`
- Modify: `supabase/tests/restored-feature-bundle.test.cjs`

- [ ] **Step 1: Write a failing route integration test**

Read the route as text and assert it imports `buildTrainingPlanPublishUpdate`, loads `published_at,starts_on,follow_up_date` from `training_plans`, and passes the helper result to the plan update.

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
node --test supabase/tests/restored-feature-bundle.test.cjs
```

Expected: the new route integration assertion fails.

- [ ] **Step 3: Load the training plan before changing publication state**

Before updating the analysis, select:

```ts
const { data: plan, error: planLoadError } = await admin
  .from('training_plans')
  .select('id,published_at,starts_on,follow_up_date')
  .eq('motion_analysis_id', analysisId)
  .single()
```

Return `409` if the plan is missing so the route does not knowingly publish an incomplete report.

- [ ] **Step 4: Apply the immutable scheduling update**

Import the helper, compute:

```ts
const planUpdate = buildTrainingPlanPublishUpdate(now, plan)
```

Then update `training_plans` by the loaded plan ID. On first publication this writes all three schedule fields; on re-publication it writes the original values back unchanged.

- [ ] **Step 5: Run focused and type checks**

Run:

```bash
node --test supabase/tests/restored-feature-bundle.test.cjs
npm run type-check -- --incremental false
```

Expected: both pass.

- [ ] **Step 6: Commit the route integration**

```bash
git add src/app/api/admin/publish-report/route.ts supabase/tests/restored-feature-bundle.test.cjs
git commit -m "fix: preserve published training plan schedule"
```

---

### Task 4: Verify and release the complete restored feature bundle

**Files:**
- Review: all modified and untracked feature files

- [ ] **Step 1: Review the final diff for scope and authorization**

Run:

```bash
git status --short
git diff --stat HEAD
git diff --check
```

Confirm there are no migration, secret, payment, or authorization-boundary changes.

- [ ] **Step 2: Run all automated checks**

Run:

```bash
node --test supabase/tests/*.test.cjs
npm test -- --runInBand --cacheDirectory /tmp/pitch-nav-restored-feature-jest
npm run type-check -- --incremental false
npm run lint
```

Expected: tests and type-check pass; lint has zero errors, with only the repository's known warnings.

- [ ] **Step 3: Run the production build with safe placeholders**

Run the existing production build with non-secret placeholder values for the required public Supabase variables and a placeholder service-role value.

Expected: compilation, static generation, and route collection all complete successfully.

- [ ] **Step 4: Commit the restored feature bundle**

Stage only the approved restored feature files and commit:

```bash
git commit -m "feat: finish restored athlete feedback experience"
```

- [ ] **Step 5: Push `main` and inspect production deployment**

Push the verified commits to `origin/main`, then confirm the production Vercel deployment reaches a successful terminal state.

- [ ] **Step 6: Give one athlete-facing verification action**

Ask the user to open a newly published athlete report and confirm its calendar begins on the publication date, shows reassessments at weeks 2, 4, 6, and 8, and displays the completed-program message after week 8.
