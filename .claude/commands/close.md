---
description: Close the active task after verifying the definition of done
---
For the item in Now:

1. Verify DoD — actually run the checks, don't assert them:
   - tests pass (run the test command from CLAUDE.md)
   - lint clean
   - each AC met — state how, one line per AC
   - CHANGELOG.md updated if the change is user-visible
   - no new TODOs without an ID
2. If any check fails: stop, report, do not close.
3. On pass: tick the checkbox, move the entry to Done with date + short commit hash, move any decision worth keeping from docs/plans/<ID>.md into docs/DECISIONS.md, then delete the plan file.
4. Show me the final backlog diff.
