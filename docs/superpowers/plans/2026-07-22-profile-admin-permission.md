# Profile Admin Permission Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent authenticated users from changing `profiles.is_admin` while preserving safe profile edits.

**Architecture:** Use PostgreSQL column privileges as the primary boundary and retain row-level ownership checks as defense in depth. Ship the change as a new forward-only Supabase migration without modifying historical migrations or application code.

**Tech Stack:** PostgreSQL, Supabase migrations, Node.js built-in test runner

## Global Constraints

- Do not apply the migration to production in this task.
- Do not modify existing migrations or application code.
- Preserve updates to `full_name` and `avatar_url` for authenticated users.
- Keep `is_admin` changes server-side or database-administrator-only.

---

### Task 1: Lock down profile update privileges

**Files:**
- Create: `supabase/tests/profile-update-permissions.test.cjs`
- Create: `supabase/migrations/025_lock_profile_admin_updates.sql`

**Interfaces:**
- Consumes: PostgreSQL roles `anon` and `authenticated`; `public.profiles`; policy `Users can update own profile`
- Produces: authenticated column-level updates for `full_name` and `avatar_url`; protected `is_admin`

- [ ] **Step 1: Write the failing regression test**

Create `supabase/tests/profile-update-permissions.test.cjs` using Node's built-in
test runner. Read and normalize migration `025`, then assert these statements:

```js
assert.match(sql, /revoke update on table public\.profiles from anon, authenticated;/)
assert.match(sql, /revoke update \(id, email, is_admin, created_at, updated_at\)/)
assert.match(sql, /grant update \(full_name, avatar_url\)/)
assert.doesNotMatch(sql, /grant update \([^;]*is_admin/)
assert.match(sql, /using \(id = \(select auth\.uid\(\)\)\) with check/)
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test supabase/tests/profile-update-permissions.test.cjs`

Expected: FAIL because `025_lock_profile_admin_updates.sql` does not exist.

- [ ] **Step 3: Add the minimal migration**

Create migration `025` with explicit revokes, the narrow grant, and the revised
own-profile update policy.

```sql
revoke update on table public.profiles from anon, authenticated;
revoke update (id, email, is_admin, created_at, updated_at)
  on table public.profiles from anon, authenticated;
grant update (full_name, avatar_url)
  on table public.profiles to authenticated;

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
```

- [ ] **Step 4: Run focused and project verification**

Run: `node --test supabase/tests/profile-update-permissions.test.cjs`

Expected: one passing test and zero failures.

Run: `npm run type-check -- --incremental false`

Expected: exit code 0.

Run: `npm run lint`

Expected: exit code 0, allowing only pre-existing warnings.

- [ ] **Step 5: Review the final diff**

Run: `git diff --check && git diff --stat && git status --short`

Expected: no whitespace errors and only the approved documentation, test, and
migration files are changed.
