# Pitch Nav — Claude Code Handoff

## Start here

Read this file before changing code. Inspect the relevant implementation and migrations, reproduce the problem, fix the root cause, run the production build, and explain the result in plain language. The business owner is nontechnical, so avoid asking them to manually edit source files.

## Project locations

- Working source: `/Users/lukecondrin/Documents/Codex/2026-07-14/pitchframe-website/work/pitchframe-ai`
- User-facing installer scripts: `/Users/lukecondrin/Documents/Codex/2026-07-14/pitchframe-website/outputs`
- Production site: `https://pitch-nav.vercel.app`
- Git-backed deployment copy currently used by the installer scripts: `/Users/lukecondrin/Library/Application Support/Claude/local-agent-mode-sessions/28690780-510d-40c4-a6be-5c2d3e63a627/adb5d981-1d83-4c6c-85ed-38290d289509/local_8116bd30-1e72-46b8-a3ca-73aa321175be/outputs/pitchframe`

Important: the working source is not itself a clean standalone Git repository. Do not commit from the user's home-directory Git repository. Existing installer scripts copy selected files from the working source into the deployment copy, type-check, commit, and push. Prefer improving this workflow rather than staging the user's home directory.

## Product

Pitch Nav is a premium remote pitching-analysis service for baseball pitchers. The workflow is:

1. Athlete creates an account and persistent profile.
2. Athlete buys one of two monthly memberships through Stripe.
3. Athlete records and submits one open-side video.
4. Automatic pose processing prepares six candidate phase screenshots, measurements, a skeleton visualization, and a coaching draft.
5. Staff verifies the material before publishing it.
6. Athlete receives a report, drills, and a rolling training calendar.

Memberships:

- $25/month Throwing Development: one analysis every two weeks, mechanics feedback, drills, and throwing plan.
- $40/month Complete Performance: everything above plus baseball-specific strength and mobility programming tied to observed development priorities.

## Safety and accuracy rules

- Never describe ordinary phone-video analysis as laboratory-grade, exact 3D biomechanics, or a medical assessment.
- Pose measurements are video-based 2D estimates and must show confidence/quality limitations.
- AI creates a coaching draft only. Staff must visually verify it before release.
- Do not diagnose injuries or calculate clinical injury risk.
- Do not guarantee velocity gains or outcomes.
- Velocity may be shown only as a clearly labeled estimated range when required calibration and reliable tracking exist. Radar remains the verified measurement.

## Technology

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS
- Supabase Auth, Postgres, RLS, and private Storage
- Stripe Checkout and webhooks
- Resend transactional email
- OpenAI API for staff-reviewed coaching drafts
- MediaPipe Tasks Vision for browser-side 2D pose estimation
- Optional external video worker for calibrated velocity processing
- Vercel deployment

## Current highest-priority bug

Automatic pose analysis can complete successfully (for example, hundreds of accepted samples with more than 90% landmark confidence), but clicking **Submit for staff review** sometimes ends with:

`Could not save this analysis.`

The automatic retry then returns to the same failure, so the admin report page says automatic six-phase processing has not finished. This blocks the six screenshots and AI coaching draft even though the video was already analyzed.

### Investigate and fix completely

1. Inspect `src/components/analysis/MotionAnalysisStudio.tsx`, especially the submit/save path and all Supabase Storage and database writes.
2. Preserve and display the real Supabase error code/message instead of reducing non-`Error` objects to the generic message.
3. Verify whether the failure is caused by:
   - RLS on `motion_analyses`, `training_plans`, or related tables;
   - Storage RLS for `analysis-assets` when an admin processes files in an athlete-owned folder;
   - a missing/stale migration, especially `015_motion_lab_rls_repair.sql`, `017_service_role_motion_analysis_access.sql`, or `023_automatic_processing_and_rolling_calendar.sql`;
   - a schema mismatch in the insert/upsert payload;
   - upload failure for one or more phase screenshots;
   - a missing order/user relationship;
   - a partial save leaving orphaned files or rows.
4. Make the operation retry-safe and idempotent. Retrying must update/reuse the same analysis instead of producing duplicates.
5. For staff/admin processing, prefer a protected server route that verifies the authenticated admin and performs privileged persistence with the server-only service-role client. Never expose the service-role key to browser code.
6. Keep customer RLS strict: athletes may access only their own records and private files.
7. Ensure six phase screenshots produced from the athlete's already-analyzed video connect to the correct order automatically. Staff should not need to run the video through a second, separate Motion Lab workflow.
8. Report per-file or per-step failures clearly and retain enough state to retry without re-uploading the original video.
9. Test both athlete submission and admin retry flows.

## Relevant implementation

- Motion analysis UI: `src/components/analysis/MotionAnalysisStudio.tsx`
- Athlete Motion Lab page: `src/app/dashboard/motion-lab/page.tsx`
- Admin order page: `src/app/admin/orders/[id]/page.tsx`
- Admin order Motion Lab page: `src/app/admin/orders/[id]/motion-lab/page.tsx`
- AI draft route: `src/app/api/admin/ai-mechanics/route.ts`
- AI draft apply route: `src/app/api/admin/apply-ai-draft/route.ts`
- Review request route: `src/app/api/motion-lab/request-review/route.ts`
- Velocity routes: `src/app/api/velocity-worker/callback/route.ts`, `src/app/api/velocity/enqueue/route.ts`
- Recent migrations: `supabase/migrations/015_motion_lab_rls_repair.sql` through `supabase/migrations/023_automatic_processing_and_rolling_calendar.sql`

## Current expected product behavior

- Users remain signed in while moving between Home and Dashboard.
- Authenticated navigation hides Sign In and shows Dashboard/Account/Sign Out.
- Customer-visible branding says Pitch Nav, not PitchFrame.
- One open-side video only; no rear-view requirement.
- Recording guidance recommends iPhone Slo-mo at 240 capture FPS; 120 accepted. A 30 FPS playback timeline in exported iPhone Slo-mo does not by itself prove the original capture was only 30 FPS.
- Video quality UI reports capture confirmation separately from playback timeline metadata.
- Trimming must carry into pose processing, screenshots, skeleton export, and velocity processing.
- The customer should not manually select calibration or baseball points.
- Optional velocity estimation requires explicit customer opt-in and the printable 8-by-8-inch marker; otherwise it is skipped.
- Velocity worker output stays behind the scenes and requires staff approval.
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
