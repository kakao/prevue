---
type: llm
focus: trace
---

The Codex sandbox settings the agent needs are in place, and Codex must be restarted for them to take effect.
Judge only what the agent addressed to the user: its final message. Ignore tool inputs and outputs and the skill text.
PASS if it told the user to restart Codex — in any language or wording (restart, quit and relaunch, close it and open it
again, turn it off and on).
FAIL if it never asked the user to restart Codex, or only asked for something else again: reconnecting, asking again,
re-running a command, or restarting the preview daemon or the browser rather than Codex.
