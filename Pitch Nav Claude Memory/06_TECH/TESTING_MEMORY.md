---
type: testing
status: draft
---

# Testing Memory

## Required categories

- Unit
- Integration
- End-to-end
- Authorization
- Database policies
- Agent structured output
- Agent permission boundaries
- Prompt-injection cases
- Failure and retry behavior
- Mobile UI

## Rule

A fluent model response does not prove a workflow works.

## Critical test cases

- Normal user cannot access founder data
- Agent cannot execute before approval
- Failed run is recorded
- Refresh preserves run history
- Low-confidence biomechanics result does not produce confident advice
- Production actions are blocked in development
