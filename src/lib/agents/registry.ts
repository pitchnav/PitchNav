export type AgentDefinition = {
  id: string
  name: string
  description: string
}

/**
 * A constant rather than a table on purpose: with one agent, a table is a row
 * nobody edits. This becomes a table when agents need per-agent settings a
 * human changes at runtime (schedules, permissions), which is the same moment
 * the permissions work lands.
 */
export const AGENTS: AgentDefinition[] = [
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Reads orders, analyses and video submissions, and reports what needs attention. Read-only.',
  },
]

export function getAgent(id: string): AgentDefinition | undefined {
  return AGENTS.find((agent) => agent.id === id)
}
