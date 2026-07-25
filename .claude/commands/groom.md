---
description: Groom the backlog — dedupe, enforce ready-rules, split, reprioritize, prune
allowed-tools: Read, Write, Edit, Grep, Glob
---
Read docs/BACKLOG.md and apply its embedded rules:

1. Flag duplicates and contradictions; propose merges.
2. Any L-sized item in Next: propose a split into independent ≤ M items with new IDs.
3. Any Next item missing acceptance criteria: draft terse, testable AC and mark them `(AC: draft)` for my review.
4. Reorder Next by priority; one-line justification only where the order changed.
5. If Done has more than 10 entries, move the oldest to CHANGELOG.md (create it if absent).
6. Report the file's line count; warn if over 100.

Show the intended diff and wait for my confirmation before writing. Do not touch source code.
