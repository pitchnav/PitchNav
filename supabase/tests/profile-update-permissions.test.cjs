const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const migrationPath = join(
  __dirname,
  '..',
  'migrations',
  '025_lock_profile_admin_updates.sql'
)

test('authenticated users can update safe profile fields but cannot change admin status', () => {
  const sql = readFileSync(migrationPath, 'utf8')
    .replace(/--.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

  assert.match(
    sql,
    /revoke update on table public\.profiles from anon, authenticated;/
  )
  assert.match(
    sql,
    /revoke update \(id, email, is_admin, created_at, updated_at\) on table public\.profiles from anon, authenticated;/
  )
  assert.match(
    sql,
    /grant update \(full_name, avatar_url\) on table public\.profiles to authenticated;/
  )
  assert.doesNotMatch(sql, /grant update \([^;]*is_admin[^;]*\) on table public\.profiles/)
  assert.match(
    sql,
    /create policy "users can update own profile" on public\.profiles for update to authenticated using \(id = \(select auth\.uid\(\)\)\) with check \(id = \(select auth\.uid\(\)\)\);/
  )
})
