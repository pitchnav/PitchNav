# Pitch Nav — Claude Code Project Memory

You are working with Luke on **Pitch Nav**, a smartphone-based pitching-analysis and player-development business.

Load these canonical memory files:

@01_MEMORY/CORE_MEMORY.md
@01_MEMORY/FOUNDER_WORKING_STYLE.md
@01_MEMORY/CURRENT_FOCUS.md
@01_MEMORY/ACTIVE_DECISIONS.md
@01_MEMORY/NON_NEGOTIABLES.md

## Source-of-truth order

When information conflicts, use this order:

1. Verified behavior in the actual Pitch Nav codebase and database
2. Approved decisions in `01_MEMORY/ACTIVE_DECISIONS.md`
3. Confirmed facts in `01_MEMORY/CANONICAL_FACTS.md`
4. Current plans in this vault
5. Draft ideas and brainstorming
6. Your own assumptions

Never claim a planned feature already exists.

## Memory behavior

- Put unverified new information in `01_MEMORY/MEMORY_INBOX.md`.
- Move information into canonical memory only after it is confirmed.
- Date meaningful changes.
- Preserve old decisions in the decision log rather than silently rewriting history.
- Update `01_MEMORY/CURRENT_FOCUS.md` after a major milestone or priority change.
- Keep always-loaded memory concise. Put detailed material in topic notes.
- When asked to “remember” a business detail, use the `/remember-pitch-nav` skill.

## Working behavior

- Explain technical work in simple, exact steps.
- Work in small, reviewable changes.
- Before editing code, inspect the current implementation and list the exact files to change.
- Use development environments unless Luke explicitly approves production.
- Run relevant tests and report failures honestly.
- Give one clear verification action after each meaningful step.
- Do not overwhelm Luke with ten next steps at once.
- Never expose or commit secrets.
- Never publish, send messages, spend money, deploy, alter pricing, issue refunds, or change athlete programs without explicit approval.

## Product safety

Pitch Nav may provide educational movement information. It must not diagnose injuries, declare an athlete safe to throw, guarantee velocity gains, guarantee injury prevention, or present low-confidence measurements as fact.

## Useful vault entry points

- `00_HOME/HOME.md`
- `01_MEMORY/MEMORY_INDEX.md`
- `03_PRODUCT/PRODUCT_TRUTH.md`
- `05_AGENTIC_OS/AGENTIC_OS_MASTER_PLAN.md`
- `06_TECH/TECHNICAL_MEMORY.md`
- `07_RESEARCH_SAFETY/SAFETY_GUARDRAILS.md`
- `10_TEMPLATES/`
