---
type: setup
status: active
---

# Connect This Vault to the Pitch Nav Code

## Easiest method

Place the entire `Pitch Nav Claude Memory` folder inside the Pitch Nav application folder.

Then create or edit the application’s root `CLAUDE.md` and add:

```text
@Pitch Nav Claude Memory/CLAUDE.md
```

Add any codebase-specific instructions below the import.

## Example application CLAUDE.md

```text
@Pitch Nav Claude Memory/CLAUDE.md

# Pitch Nav Application

Before changing code:
- Inspect the current implementation.
- Confirm the package manager and commands.
- Use development, not production.
- Run the relevant tests.
```

## Find the application folder on a Mac

In the Claude Code session that already has Pitch Nav open, ask:

```text
Do not change files. Run pwd, show me the full project path, and then run open .
```

Finder should open the correct folder.

## Confirm the connection

Start a fresh Claude Code session from the application root and run:

```text
/context
```

Confirm that the application `CLAUDE.md` and the imported Pitch Nav memory appear.

## Keep the vault separate

A separate vault can also be added as an additional directory, but placing it inside the application is simpler for a first setup.
