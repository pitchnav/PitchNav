---
type: workflow
status: active
---

# Claude Code Workflow

## Before a task

1. Read the relevant memory and product notes.
2. Inspect the actual code.
3. Explain the current behavior simply.
4. List exact files to change.
5. State risks.
6. Confirm development environment.
7. Define acceptance criteria.

## During a task

- Make one contained change.
- Preserve existing behavior.
- Add or update tests.
- Avoid unrelated refactors.
- Do not reveal secrets.
- Do not deploy.

## After a task

1. Run tests.
2. Report results honestly.
3. Give one manual verification action.
4. Update the session handoff.
5. Update technical memory only when verified.
6. Record a decision when architecture changed.
