---
type: guide
status: active
---

# Start Here

This vault is the **persistent business brain for Claude Code and Pitch Nav**.

It is designed to do four jobs:

1. Give Claude Code the same business context every session.
2. Separate confirmed facts from ideas and assumptions.
3. Preserve decisions, priorities, and lessons over time.
4. Let Obsidian remain the human-friendly place where Luke reviews and edits company memory.

## Open the vault

1. Download and unzip the vault.
2. Open Obsidian.
3. Choose **Open folder as vault**.
4. Select `Pitch Nav Claude Memory`.
5. Open [[00_HOME/HOME]].

## Use it with Claude Code

### Standalone business mode

Open the `Pitch Nav Claude Memory` folder directly in Claude Code. Claude will automatically find the root `CLAUDE.md`.

Use this mode for:

- Strategy
- Product planning
- Marketing
- Research
- Business decisions
- Updating memory

### Connected coding mode

Place the entire vault inside the actual Pitch Nav application folder. Then launch Claude Code from the application root.

Example:

```text
pitch-nav-app/
├── app/
├── components/
├── package.json
└── Pitch Nav Claude Memory/
```

The actual application should also have a root `CLAUDE.md` that imports this vault. Copy the snippet from [[00_HOME/CONNECT_TO_PITCH_NAV_CODE]].

## First session prompt

Paste this into Claude Code:

```text
Read CLAUDE.md and the imported Pitch Nav memory files.

Do not edit anything.

Tell me:
1. What Pitch Nav is
2. What is confirmed versus still planned
3. My preferred way of working
4. The current company priority
5. The most important safety restrictions

Then run /context and tell me which memory files loaded.
```

## Memory commands included

- `/remember-pitch-nav`
- `/capture-decision`
- `/founder-brief`
- `/weekly-memory-review`
- `/start-pitch-nav-feature`
- `/research-for-pitch-nav`

## Core links

- [[01_MEMORY/MEMORY_INDEX]]
- [[01_MEMORY/CURRENT_FOCUS]]
- [[01_MEMORY/CANONICAL_FACTS]]
- [[01_MEMORY/ACTIVE_DECISIONS]]
- [[03_PRODUCT/PRODUCT_TRUTH]]
- [[04_BRAND_MARKETING/BRAND_MEMORY]]
- [[05_AGENTIC_OS/AGENTIC_OS_MASTER_PLAN]]
