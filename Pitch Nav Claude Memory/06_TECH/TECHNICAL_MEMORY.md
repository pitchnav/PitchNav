---
type: technical-memory
status: active
last-audited: 2026-07-24
---

# Technical Memory

## Current repository

- Path: `/Users/lukecondrin/Documents/Codex/2026-07-14/pitchframe-website/work/pitchframe-ai`
- Framework: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- Package manager: npm
- Deployment: Vercel, auto-deploys from `main` on the GitHub repo `pitchnav/PitchNav`
- Default branch: main
- Local development command: `npm run dev`
- Production site: https://pitch-nav.vercel.app

## Confirmed systems (verified 2026-07-24 by direct repo/DB/prod inspection)

- **Supabase**: confirmed live in production — Auth, Postgres, RLS, private Storage (`pitch-videos`, `analysis-assets` buckets). Project ref `rzgjighhkzsmxneijybe`.
- **Stripe**: confirmed wired correctly — separate `STRIPE_THROWING_PRICE_ID` ($25) and `STRIPE_PERFORMANCE_PRICE_ID` ($40), webhook-verified payment confirmation (not success-redirect based).
- **Resend**: confirmed for transactional email, including staff-review-request notifications with a documented fallback chain and clear error logging.
- **OpenAI**: confirmed for staff-reviewed AI coaching drafts (`OPENAI_MECHANICS_MODEL`, defaults to `gpt-5.4-mini`), called from `/api/admin/ai-mechanics`.
- **MediaPipe Tasks Vision** (`PoseLandmarker`): confirmed, runs client-side in the browser for pose estimation — verified live (WASM graph initializes, tracks landmarks).
- **Video storage/processing**: browser-based canvas skeleton rendering + export, not a queue like Trigger.dev/Inngest. An `automatic_velocity_jobs` table + optional external `VIDEO_WORKER_URL` handles calibrated velocity estimation only, gated behind explicit customer opt-in (`video_submissions.velocity_opt_in`, added 2026-07-24).
- **Claude Code**: confirmed as the active development agent for this codebase.

## Not yet confirmed

- PostHog or any analytics provider — not checked; do not assume it exists.
- Background job queue beyond the velocity-jobs table pattern described above.

## Known real-world gotcha (verified 2026-07-24)

Chrome cannot decode `.mov`/QuickTime files inline in an HTML5 `<video>` element, regardless of codec. Two real production video submissions were `.mov` and silently hung the entire automatic Motion Lab pipeline forever with no error. Fixed with upload-time rejection + an `onError` handler + a stall watchdog. See the app's own `CLAUDE.md` and git history around 2026-07-24 for detail.

## Do not infer

A package mentioned in an old discussion does not prove it is installed or configured — but see "Confirmed systems" above, which reflects direct verification, not a discussion.
