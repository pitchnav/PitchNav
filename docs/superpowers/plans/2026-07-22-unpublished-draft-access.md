# Unpublished Draft Access Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent athletes from reading or self-publishing staff-review drafts while preserving automatic submission retries and published feedback.

**Architecture:** PostgreSQL row-level security becomes the authoritative publication boundary. Two narrow security-definer functions expose only submission metadata needed by the browser, while athlete-facing application queries add explicit publication filters.

**Tech Stack:** PostgreSQL, Supabase RLS/RPC, Next.js, TypeScript, Node.js built-in test runner

## Global Constraints

- Historical migrations remain unchanged.
- Staff and service-role processing must continue.
- Pending status remains visible through owned orders.
- Production is not changed until local verification passes.

---

### Task 1: Add the regression test

**Files:**
- Create: `supabase/tests/unpublished-draft-access.test.cjs`

**Interfaces:**
- Consumes: migration `026`, athlete-facing query files, submission component, review route
- Produces: one executable security regression test

- [ ] Write assertions for published-only select policies, unpublished-only
  inserts, removed athlete update policies, safe RPC permissions, published
  query filters, and service-role review lookup.
- [ ] Run `node --test supabase/tests/unpublished-draft-access.test.cjs`.
- [ ] Confirm failure because migration `026` and the required application
  protections do not exist.

### Task 2: Add the database boundary

**Files:**
- Create: `supabase/migrations/026_protect_unpublished_analysis_drafts.sql`

**Interfaces:**
- Produces: `get_motion_analysis_submission_state(uuid)` and
  `get_recent_motion_analysis_for_cooldown(uuid,timestamptz)`

- [ ] Replace athlete select policies with published-only conditions.
- [ ] Require unpublished state in athlete insert policies.
- [ ] Remove direct athlete update policies.
- [ ] Add owner-checked metadata helper functions and grant execution only to
  `authenticated`.
- [ ] Run the focused regression test and confirm remaining failures are
  application-side.

### Task 3: Preserve the submission and review flows

**Files:**
- Modify: `src/components/analysis/MotionAnalysisStudio.tsx`
- Modify: `src/app/api/motion-lab/request-review/route.ts`

**Interfaces:**
- Consumes: the two RPCs from Task 2
- Produces: submission retries without direct draft reads; authenticated,
  service-role review lookup with an ownership check

- [ ] Replace draft recovery and cooldown queries with the metadata RPCs.
- [ ] Stop requesting an inserted draft row back from PostgREST; retain the
  client-generated UUID.
- [ ] Load the draft through `createAdminClient()` only after authenticating
  the notification caller, then enforce owner-or-admin access.

### Task 4: Add application defense in depth

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/compare/page.tsx`
- Modify: `src/app/dashboard/feedback/[id]/page.tsx`

**Interfaces:**
- Produces: athlete-facing reads that request only `status = published` and a
  non-null `published_at`

- [ ] Add both publication filters to each athlete-facing analysis query.
- [ ] Run the focused regression test.
- [ ] Run `npm run type-check -- --incremental false`.
- [ ] Run `npm run lint`.
- [ ] Review `git diff --check`, the changed-file list, and preserved user
  changes before integration.

