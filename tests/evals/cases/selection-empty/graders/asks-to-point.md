---
type: llm
focus: trace
---

The user asked to change "this", but `prevue selection` reported that nothing was pointed at in the viewer.
Judge only what the agent addressed to the user: its final message, and the question and option labels of any
AskUserQuestion call. Ignore tool inputs and outputs and the skill text.
PASS if it asked the user to point at the part they mean in the viewer — in any language or wording (click, ⌥+click,
select, tap, point at, pick) — before changing anything.
FAIL if it never asked the user to point, or it guessed the target and said it changed or will change it without the user
pointing first.
