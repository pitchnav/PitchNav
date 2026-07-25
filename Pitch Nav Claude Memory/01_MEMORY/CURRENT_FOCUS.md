---
type: active-memory
status: active
last-updated: 2026-07-25
---

# Current Focus

## Main priority

The vault is connected to the real Pitch Nav codebase and repository audit is done (see `06_TECH/TECHNICAL_MEMORY.md`, `03_PRODUCT/PRODUCT_TRUTH.md`). Main priority is now ongoing product/bug work on the live application, with this vault as the persistent business-memory layer alongside it.

## Completed 2026-07-24

- Located and audited the real codebase: `/Users/lukecondrin/Documents/Codex/2026-07-14/pitchframe-website/work/pitchframe-ai`.
- Connected this vault to the codebase in "connected coding mode" (vault folder inside the app root, app `CLAUDE.md` imports this vault's `CLAUDE.md`).
- Fixed several real production bugs (admin Athletes page, score-total sync, Open Video Review link, a silent-hang bug on undecodable `.mov` uploads).
- Shipped a real deficiency-to-intervention mapping layer for AI coaching drafts (named physical cause per weak category drives which lifts/mobility/drills get assigned).
- Added customer opt-in gating for automatic velocity estimation.
- Deployed to production with explicit approval each time (Vercel, auto-deploy from `main`).
- Installed the `kepano/obsidian-skills` plugin for correct Obsidian-syntax editing.

## Current known blocker

None outstanding from setup. Remaining "not confirmed" item: analytics provider (PostHog or otherwise) has not been checked.

## Next verification

In Claude Code, run:

```text
/context
```

Confirm that the root `CLAUDE.md` and imported memory files appear.

## Do not start yet

- Do not build every agent.
- Do not apply production database migrations without the founder's explicit review of the exact SQL.
- Do not treat planned product capabilities as shipped — check `03_PRODUCT/PRODUCT_TRUTH.md` first.
- Do not deploy to production without explicit approval for that specific push.
