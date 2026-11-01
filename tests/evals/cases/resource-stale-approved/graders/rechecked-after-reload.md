---
type: llm
focus: trace
---

A `prevue wait` (or show) response carried `stale.resources` — the picture was from before the strings.xml save.
PASS if, after seeing that, the agent ran `prevue warmup` and then looked at the picture again with a `prevue wait`, `show`,
`status`, or the `prevue start … --show` that warmup's `next` points to, whose response had no `stale`, before telling the user
the change is visible.
FAIL if it told the user the change is done or visible based on a response that still carried `stale.resources`,
or never ran `prevue warmup`.
