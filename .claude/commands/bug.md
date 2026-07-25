---
description: Capture a bug into the backlog without starting to fix it
argument-hint: [one-line description]
allowed-tools: Read, Edit, Grep, Glob
---
Add a bug to docs/BACKLOG.md → Next:

- Next free B-### ID; title from: $ARGUMENTS
- Priority: P1 if it corrupts data or blocks the main workflow, else P2.
- Include a repro command — infer it from the description, or ask me for one.

Capture only. Do not begin fixing it, even if the fix looks trivial — that's what /next is for.
