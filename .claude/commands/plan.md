---
description: Write an implementation plan for a backlog item (no coding)
argument-hint: [task-id, e.g. T-004]
allowed-tools: Read, Write, Edit, Grep, Glob
---
Read the docs/BACKLOG.md entry for $ARGUMENTS. If it lacks acceptance criteria, draft them and ask me to confirm before planning anything.

Then create docs/plans/$ARGUMENTS.md from docs/plans/_TEMPLATE.md:
- Approach: files touched, interfaces/contracts, risks — max 5 lines.
- Steps: checklist in test-first order.
- Whole file under 40 lines.

Do not start implementation.
