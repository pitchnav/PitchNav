---
type: product-source-of-truth
status: audited
last-audited: 2026-07-24
---

# Product Truth

This note must reflect what the application actually does, not what is planned.

## Confirmed concept

Pitch Nav is a smartphone pitching-analysis and development product.

## Current shipped features

Verified 2026-07-24 by direct code inspection and live production testing (not repeated on every session — re-verify before relying on this for anything consequential):

| Feature | Status | Evidence path | Notes |
|---|---|---|---|
| Account creation | Shipped | `src/app/signup` | Supabase Auth |
| Login | Shipped | `src/app/login` | |
| Video upload | Shipped | `src/app/start-analysis/upload/page.tsx` | One required side-view video, no rear view |
| Camera guide | Shipped | `src/app/camera-setup`, upload pre-flight modal | 240/120 FPS distinction, 15ft/6ft setup, capture-vs-playback FPS messaging |
| Pose estimation | Shipped | `src/components/analysis/MotionAnalysisStudio.tsx` | MediaPipe PoseLandmarker, client-side, browser-verified live |
| Mechanics metrics | Shipped | same file, `calculateMetrics`/`buildCategoryFeedback` | Deterministic first pass; AI draft refines it |
| Six-phase screenshots | Shipped | same file, `capturePhaseScreenshots` | Peak leg lift, hand separation, foot strike, max ext. rotation, ball release, finish |
| Analysis report | Shipped | `src/app/dashboard/reports/[id]/page.tsx` | Delivery score, six category scores, phase frames |
| Personalized drills | Shipped | Drill Library + `src/lib/throwing-plan.ts` | As of 2026-07-24, drills are tied to a specific likely physical cause per weak category, not just the category |
| Eight-week plan | Shipped | `src/lib/throwing-plan.ts`, `src/lib/performance-plan.ts` | 8 weeks, reassessed at 2/4/6/8; $25 = throwing only, $40 = + strength/mobility |
| Rolling training calendar | Shipped | `src/components/reports/InteractiveFeedbackTools.tsx` | 2-week rolling window |
| Progress tracking | Partial | `src/app/dashboard/compare/page.tsx` | Compares two analyses' delivery scores |
| Stripe billing | Shipped | `src/lib/stripe.ts`, `src/app/api/checkout` | Separate $25/$40 price IDs, webhook-verified payment |
| Admin dashboard | Shipped | `src/app/admin/**` | Orders, athletes, drill library, motion-lab review, AI draft generation/apply/publish, mark-paid test override, delete-faulty-analysis |
| Automatic velocity estimate | Shipped, opt-in only | `video_submissions.velocity_opt_in` (added 2026-07-24) | Customer must confirm the printed 8x8 calibration marker; otherwise skipped entirely, never guessed |

## Claims rule

Marketing and Claude must never describe an unknown or planned feature as shipped.
