---
name: find-by-composable
description: ⑦ given only a composable name, finds the preview that calls it with prevue previews --of and shows that FQN — without asking the person which file
tags: [d165, find]
plugins: ["../.."]
max_turns: 25
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, AskUserQuestion, TodoWrite]
env:
  EVAL_PREVUE_SCENARIO: ready
---

Badge 컴포저블이 지금 어떻게 보이는지 띄워 줘.
