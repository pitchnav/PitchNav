---
type: guide
status: active
---

# How Claude Memory Works Here

## Always-loaded memory

The root `CLAUDE.md` imports a small set of high-value files:

- Core business memory
- Founder working style
- Current focus
- Active decisions
- Non-negotiables

These should stay concise because they enter context at the start of work.

## On-demand memory

Detailed product, marketing, technical, research, and operational notes are not all imported automatically. Claude reads them when the task requires them.

## Memory Inbox

New information that may matter later goes into [[01_MEMORY/MEMORY_INBOX]] first.

This prevents a casual idea from becoming a permanent company fact.

## Canonical facts

Confirmed facts belong in [[01_MEMORY/CANONICAL_FACTS]].

Each important fact should show:

- Status
- Date confirmed
- Source
- Notes

## Decisions

Approved decisions belong in [[01_MEMORY/ACTIVE_DECISIONS]] and the long-term [[01_MEMORY/DECISION_LOG]].

A decision is not the same as a fact. It can be reversed later, but the history should remain visible.

## Current focus

[[01_MEMORY/CURRENT_FOCUS]] is the short-term operating memory. Update it whenever the main company priority changes.

## Session handoff

At the end of substantial work, Claude should update [[09_SESSIONS/SESSION_HANDOFF]] with:

- What was completed
- What changed
- What remains
- What should happen next
- Any risks or failed tests
