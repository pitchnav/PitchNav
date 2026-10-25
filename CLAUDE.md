@Pitch Nav Claude Memory/CLAUDE.md

# Pitch Nav — Claude Code Handoff

## Start here

Read this file before changing code. Inspect the relevant implementation and migrations, reproduce the problem, fix the root cause, run the production build, and explain the result in plain language. The business owner is nontechnical, so avoid asking them to manually edit source files.

## Project locations

- Working source: `/Users/lukecondrin/Documents/Codex/2026-07-14/pitchframe-website/work/pitchframe-ai`
- User-facing installer scripts: `/Users/lukecondrin/Documents/Codex/2026-07-14/pitchframe-website/outputs`
- Production site: `https://pitchnav.com` (custom domain). `https://pitch-nav.vercel.app` only 307-redirects here — check pitchnav.com to confirm a deploy landed.
- Git-backed deployment copy currently used by the installer scripts: `/Users/lukecondrin/Library/Application Support/Claude/local-agent-mode-sessions/28690780-510d-40c4-a6be-5c2d3e63a627/adb5d981-1d83-4c6c-85ed-38290d289509/local_8116bd30-1e72-46b8-a3ca-73aa321175be/outputs/pitchframe`

Important: the working source is not itself a clean standalone Git repository. Do not commit from the user's home-directory Git repository. Existing installer scripts copy selected files from the working source into the deployment copy, type-check, commit, and push. Prefer improving this workflow rather than staging the user's home directory.

## Product

Pitch Nav is a premium remote pitching-analysis service for baseball pitchers. The workflow is:

1. Athlete creates an account and persistent profile.
2. Athlete buys one of two monthly memberships through Stripe.
3. Athlete records and submits one open-side video.
4. Athlete films the movement screens — short held positions facing the camera that measure physical capacity, so a limitation is measured rather than inferred from the pitch.
5. Automatic pose processing prepares six candidate phase screenshots, measurements, a skeleton visualization, and a coaching draft.
6. Staff verifies the material before publishing it.
7. Athlete receives a report, drills, and a rolling training calendar.

Memberships:

- $25/month Throwing Development: one analysis every two weeks, mechanics feedback, drills, and throwing plan.
- $40/month Complete Performance: everything above plus baseball-specific strength and mobility programming tied to observed development priorities.

## Safety and accuracy rules

- Never describe ordinary phone-video analysis as laboratory-grade, exact 3D biomechanics, or a medical assessment.
- Pose measurements are video-based 2D estimates and must show confidence/quality limitations.
- AI creates a coaching draft only. Staff must visually verify it before release.
- Do not diagnose injuries or calculate clinical injury risk.
- Do not guarantee velocity gains or outcomes.
- Velocity is never estimated from video. Decision D-010 removed it: realistic single-camera error is ±3–5 mph, which is the difference between 88 and 93 to a college coach. Athletes report a radar-verified number at intake instead. Do not reintroduce a video-derived velocity figure on the mechanics track.

## Technology

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS
- Supabase Auth, Postgres, RLS, and private Storage
- Stripe Checkout and webhooks
- Resend transactional email
- OpenAI API for staff-reviewed coaching drafts
- MediaPipe Tasks Vision for browser-side 2D pose estimation
- Vercel deployment

## Resolved — the "Could not save this analysis" failure

**Status: fixed. Do not start here.** This section headed this file as the
highest-priority bug for months after it was resolved, which sends a fresh
session chasing a closed issue.

Automatic pose analysis would complete, but **Submit for staff review** could end
with a generic `Could not save this analysis.`, blocking the six screenshots and
the AI coaching draft. The generic message no longer exists in the codebase, the
save path now surfaces real Supabase error codes, privileged persistence moved to
protected routes under `src/app/api/admin/`, and the delivery pipeline is verified
live end to end through AI draft generation and apply.

For current priorities read `Pitch Nav Claude Memory/01_MEMORY/CURRENT_FOCUS.md`
and the newest entry in `09_SESSIONS/SESSION_HANDOFF.md` — not this file.

## Relevant implementation

- Motion analysis UI: `src/components/analysis/MotionAnalysisStudio.tsx`
- Athlete Motion Lab page: `src/app/dashboard/motion-lab/page.tsx`
- Admin order page: `src/app/admin/orders/[id]/page.tsx`
- Admin order Motion Lab page: `src/app/admin/orders/[id]/motion-lab/page.tsx`
- AI draft route: `src/app/api/admin/ai-mechanics/route.ts`
- AI draft apply route: `src/app/api/admin/apply-ai-draft/route.ts`
- Review request route: `src/app/api/motion-lab/request-review/route.ts`
- Movement screens: `src/lib/movement-screens.ts`, `src/lib/screen-mechanics-convergence.ts`, `src/app/dashboard/movement-screens/`, public guide `src/app/movement-screens/page.tsx`
- Ball-flight physics (built, not wired to any surface): `src/lib/pitch-tracking/physics.ts`
- Recent migrations: `supabase/migrations/015_motion_lab_rls_repair.sql` through `supabase/migrations/031_agent_os.sql`

## Current expected product behavior

- Users remain signed in while moving between Home and Dashboard.
- Authenticated navigation hides Sign In and shows Dashboard/Account/Sign Out.
- Customer-visible branding says Pitch Nav, not PitchFrame.
- One open-side video only; no rear-view requirement.
- Recording guidance recommends iPhone Slo-mo at 240 capture FPS; 120 accepted. A 30 FPS playback timeline in exported iPhone Slo-mo does not by itself prove the original capture was only 30 FPS.
- Video quality UI reports capture confirmation separately from playback timeline metadata.
- Trimming must carry into pose processing, screenshots, skeleton export, and velocity processing.
- The customer should not manually select calibration or baseball points.
- No video velocity estimation anywhere on the mechanics track. The printable 8-inch calibration marker, the opt-in, the velocity worker and its routes were all removed; the marker section came off `/camera-setup` on 2026-10-25.
- Movement screens are a separate capture: short held positions filmed facing the camera, each with its own phone placement. Definitions live in `src/lib/movement-screens.ts` and the public guide at `/movement-screens` renders them from that file — update the definitions, not the page copy.
- Staff review notifications go to `STAFF_REVIEW_EMAIL` through a Resend-verified sender.
- Staff can approve/reject video quality; rejection removes cooldown and allows replacement upload.
- Paid status comes from verified Stripe webhook events, not a success redirect.
- Admin can see payment status, delete erroneous test submissions, generate an AI coaching draft, verify it, and publish.
- Feedback includes overall score, six category scores, strengths, priorities, one biggest opportunity, six phase frames, three drills, confidence notes, and reviewer narrative.
- The athlete calendar exposes a rolling 14-day window and expands one week at a time rather than revealing the entire plan. It has Today and detail views with sets, reps, cues, and instructions.

## Environment and secrets

Expected names are documented in `.env.example`, including Supabase, Stripe, Resend, OpenAI, and video-worker variables.

- Never print, commit, or place secret values in client code.
- Never prefix service keys, Stripe secret keys, OpenAI keys, Resend keys, or worker secrets with `NEXT_PUBLIC_`.
- The user previously exposed GitHub personal access tokens in chat. Do not reuse or record them. Recommend revoking/rotating them.
- Do not change production environment variables unless explicitly instructed.

## Quality gate

Before declaring a fix complete:

1. Run `npm run type-check`.
2. Run `npm run build` with safe local placeholder environment values when needed, without committing them.
3. Run relevant tests or add focused tests for authorization/idempotency.
4. Review storage and database authorization.
5. Confirm no secrets are in source or Git history.
6. Create or update one idempotent Supabase migration if schema/RLS changes are needed.
7. Provide the business owner one simple installer command or a precise deployment procedure. Do not make them copy terminal output into the Supabase SQL editor; copy the actual SQL content to the clipboard if a manual SQL step remains necessary.

## Working style

- Diagnose before editing; do not guess from screenshots alone.
- Fix root causes rather than adding another disconnected workflow.
- Keep the UI premium, mobile-friendly, accessible, and honest about confidence.
- Do not claim a feature works until the build and relevant flow have been verified.
