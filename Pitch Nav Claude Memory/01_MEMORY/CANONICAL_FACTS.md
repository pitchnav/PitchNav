---
type: canonical-memory
status: active
---

# Canonical Facts

Only confirmed information belongs here.

| Fact | Status | Confirmed | Source | Notes |
|---|---|---|---|---|
| The business is named Pitch Nav. | Confirmed | 2026-07-25 | Founder context |  |
| Luke is the founder and primary decision maker. | Confirmed | 2026-07-25 | Founder context |  |
| Pitch Nav focuses on baseball pitching analysis and development. | Confirmed | 2026-07-25 | Founder context |  |
| The core direction uses smartphone video. | Confirmed | 2026-07-25 | Founder context |  |
| Premium dark navy, blue, and white is the preferred brand direction. | Confirmed | 2026-07-25 | Existing brand work | Exact tokens still need audit. |
| The product should look realistic, professional, and scientific. | Confirmed | 2026-07-25 | Founder preference | Avoid cartoon visuals. |
| Mobile experience is important. | Confirmed | 2026-07-25 | Founder preference |  |
| The actual local codebase architecture is known. | Confirmed | 2026-07-24 | Direct repository audit | Next.js 16 App Router, React 19, TypeScript, Tailwind. See `06_TECH/TECHNICAL_MEMORY.md`. |
| Supabase is currently connected in production. | Confirmed | 2026-07-24 | Live admin panel + code audit | Auth, Postgres, RLS, private Storage. |
| Stripe is currently connected. | Confirmed | 2026-07-24 | Code audit (`src/lib/stripe.ts`) | Separate $25/$40 price IDs, webhook-verified. |
| PostHog is currently connected. | Not confirmed |  |  | Not checked; do not assume. |
| The repo path is `/Users/lukecondrin/Documents/Codex/2026-07-14/pitchframe-website/work/pitchframe-ai`. | Confirmed | 2026-07-24 | Direct inspection |  |
| Production deploys via `git push` to `main` on `github.com/pitchnav/PitchNav`, auto-deployed by Vercel. | Confirmed | 2026-07-24 | Verified by pushing and observing the live site update |  |
| Chrome cannot play `.mov`/QuickTime video inline, which was silently hanging automatic Motion Lab processing for real submitted videos. | Confirmed | 2026-07-24 | Reproduced live in production, fixed same day | See `06_TECH/TECHNICAL_MEMORY.md`. |

## Rule

When Claude verifies something in the actual codebase, update this table with the date and evidence path.
