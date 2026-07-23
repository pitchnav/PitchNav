const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const root = join(__dirname, '..', '..')
const read = (path) => readFileSync(join(root, path), 'utf8')

test('unpublished analysis content is staff-only without breaking submissions', () => {
  const sql = read('supabase/migrations/026_protect_unpublished_analysis_drafts.sql')
    .replace(/--.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

  assert.match(
    sql,
    /create policy "athletes view published motion analyses".*for select to authenticated.*user_id = auth\.uid\(\).*status = 'published'.*published_at is not null/
  )
  assert.match(
    sql,
    /create policy "athletes view published plans".*for select to authenticated.*user_id = auth\.uid\(\).*published_at is not null/
  )
  assert.match(
    sql,
    /create policy "athletes create own motion analyses".*for insert to authenticated.*status = any \(array\['athlete_draft'::text, 'submitted_for_review'::text\]\).*published_at is null/
  )
  assert.match(
    sql,
    /create policy "athletes create own plans".*for insert to authenticated.*published_at is null.*owns_motion_analysis\(motion_analysis_id\)/
  )
  assert.match(sql, /drop policy if exists "athletes update own drafts"/)
  assert.match(sql, /drop policy if exists "athletes update own plans"/)
  assert.match(sql, /drop policy if exists "athletes update own unpublished plans"/)
  assert.doesNotMatch(sql, /create policy "athletes update/)

  assert.match(sql, /create or replace function public\.get_motion_analysis_submission_state/)
  assert.match(sql, /create or replace function public\.get_recent_motion_analysis_for_cooldown/)
  assert.match(sql, /revoke all on function public\.get_motion_analysis_submission_state\(uuid\) from public/)
  assert.match(sql, /grant execute on function public\.get_motion_analysis_submission_state\(uuid\) to authenticated/)
  assert.match(sql, /revoke all on function public\.get_recent_motion_analysis_for_cooldown\(uuid, timestamptz\) from public/)
  assert.match(sql, /grant execute on function public\.get_recent_motion_analysis_for_cooldown\(uuid, timestamptz\) to authenticated/)

  const studio = read('src/components/analysis/MotionAnalysisStudio.tsx')
  assert.match(studio, /\.rpc\('get_motion_analysis_submission_state'/)
  assert.match(studio, /\.rpc\('get_recent_motion_analysis_for_cooldown'/)
  assert.doesNotMatch(studio, /\}\)\.select\('id'\)\.single\(\)/)

  const reviewRoute = read('src/app/api/motion-lab/request-review/route.ts')
  assert.match(reviewRoute, /createAdminClient/)
  assert.match(reviewRoute, /admin\.from\('motion_analyses'\)/)
  assert.match(reviewRoute, /analysis\.user_id !== user\.id && !viewerProfile\?\.is_admin/)

  for (const path of [
    'src/app/page.tsx',
    'src/app/dashboard/page.tsx',
    'src/app/dashboard/compare/page.tsx',
    'src/app/dashboard/feedback/[id]/page.tsx',
  ]) {
    const source = read(path)
    assert.match(source, /\.eq\('status', 'published'\)/, `${path} must filter by published status`)
    assert.match(source, /\.not\('published_at', 'is', null\)/, `${path} must require published_at`)
  }
})
