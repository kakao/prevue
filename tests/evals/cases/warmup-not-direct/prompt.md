---
name: warmup-not-direct
description: ② asking to read the build settings is a direct instruction to prepare, so warmup without asking again, then show (D-65) — no recheck with doctor (D-86)
tags: [nfr15, trigger]
plugins: ["../.."]
max_turns: 25
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill, AskUserQuestion, TodoWrite]
env:
  EVAL_PREVUE_SCENARIO: unready
---

Screen.kt(app/src/main/kotlin/Screen.kt) 프리뷰를 보려는데 빌드 설정부터 읽어 와야 한대. 준비해 줘.
