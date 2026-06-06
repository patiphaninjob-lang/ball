# Project Memory Policy

## Overview

This project uses a simple memory system to keep work focused, fast, and accurate during long sessions.

## File Purposes

| File | Purpose |
|------|---------|
| `PROJECT_CONTEXT.md` | **Latest truth only** — current status, architecture, commands, constraints |
| `HANDOFF.md` | Short session summary before clearing/compacting context |
| `PROJECT_MEMORY_POLICY.md` | This file — rules for memory management |
| `CLAUDE.md` | AI instructions for working on this project |
| `archive/` | Old snapshots, long histories, previous context (if needed) |

## Rules

### For Latest Truth (`PROJECT_CONTEXT.md`)

- Contains only current operational status
- NOT a timeline, diary, debug log, or transcript
- Updated when significant changes occur (not after every commit)
- Kept concise and practical

### For Session Handoff (`HANDOFF.md`)

- Updated before clearing/compacting a long session
- Contains: date, objective, files changed, current result, open risks, next step
- Short and actionable

### For History & Archives

- Full build logs, debug transcripts, old decisions → `archive/`
- Detailed changes not in CONTEXT → git log / git blame
- Old context snapshots → `archive/session-YYYY-MM-DD.md`

## Workflow

### When Starting Work

1. Read `PROJECT_MEMORY_POLICY.md` (this file)
2. Read `PROJECT_CONTEXT.md` as current truth
3. Read `HANDOFF.md` if context was recently cleared
4. Use logs/archive only if history is needed

### During Work

- Keep responses focused on the current task
- Don't duplicate effort from git history

### Before Ending a Long Session

- Update `HANDOFF.md` with latest truth, files changed, tests run, risks, next step
- Use `/compact` to summarize context if session is very long

### When Clearing Context

- Use `/clear` to remove old chat history
- Latest truth stays in `PROJECT_CONTEXT.md` and `HANDOFF.md`

## Key Principles

✅ **Do:**
- Keep `PROJECT_CONTEXT.md` updated with current state
- Use git history for past changes
- Update `HANDOFF.md` before clearing
- Archive old snapshots if context grows

❌ **Don't:**
- Turn `PROJECT_CONTEXT.md` into a timeline
- Duplicate git history in memory files
- Keep long debug logs in main context
- Forget to update memory before clearing
