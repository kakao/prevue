---
name: resource-stale-approved
description: after adding an entry to resources (values), see wait's stale.resources, find the reread through doctor, warmup with the approval given up front, then confirm with an image that isn't stale
tags: [nfr15, loop]
plugins: ["../.."]
max_turns: 30
timeout_seconds: 400
allowed_tools: [Read, Glob, Grep, Skill, AskUserQuestion, TodoWrite]
env:
  EVAL_PREVUE_SCENARIO: resource-stale
---

app/src/main/kotlin/Screen.kt 의 Greeting 맨 아래에 "Tap a card" 안내 문구를 더해 줘. 문구는 strings.xml 에 tap_hint 라는 새 문자열 리소스로 넣고 stringResource 로 쓴 뒤, 바뀐 화면을 프리뷰로 확인해 줘. 빌드 설정을 다시 읽어야 하면 묻지 말고 해도 돼.
