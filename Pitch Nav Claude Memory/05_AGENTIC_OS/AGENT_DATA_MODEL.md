---
type: architecture
status: draft
---

# Agent Data Model

## Core tables

- agents
- agent_runs
- agent_tool_calls
- agent_findings
- agent_approvals
- agent_permissions

## Later tables

- agent_schedules
- agent_prompt_versions
- agent_errors
- agent_cost_limits
- agent_memories

## Every run should record

- Agent identity
- Trigger
- Status
- Input summary
- Structured output
- Tool calls
- Model
- Tokens or estimated usage
- Cost
- Duration
- Error
- Approval relationship
