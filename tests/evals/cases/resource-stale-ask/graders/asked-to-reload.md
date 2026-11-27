---
type: llm
focus: trace
---

A `prevue wait` (or show) response carried `stale.resources` — the picture was from before the strings.xml save.
PASS if the agent then ran `prevue doctor` and asked the user for approval to read the project's resources again
(an AskUserQuestion call, or a question after which it stopped), without claiming the new text is visible in the preview.
FAIL if it told the user the change is visible, moved on without asking, or ran `prevue warmup` without approval.
