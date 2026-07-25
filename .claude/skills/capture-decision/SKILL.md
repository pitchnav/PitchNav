---
name: capture-decision
description: Record a Pitch Nav business, product, brand, safety, or technical decision with context, evidence, risk, and rollback.
allowed-tools: Read Grep Glob Write Edit
---

# Capture Decision

Decision input:

$ARGUMENTS

Use `10_TEMPLATES/DECISION_TEMPLATE.md`.

1. Check for an existing decision.
2. Assign the next decision ID.
3. Record context, decision, evidence, alternatives, risks, approval, and rollback.
4. Add the decision to `01_MEMORY/DECISION_LOG.md`.
5. If active, update `01_MEMORY/ACTIVE_DECISIONS.md`.
6. Update related topic notes.
7. Do not mark the decision approved unless Luke clearly approved it.
