---
name: sandbox-merge
description: Codex only — the user consented up front to adding sandbox settings. Keep the settings already touched (other keys · comments · other paths in the same table), merge only network_access and ~/.prevue, tell them to restart and stop
tags: [codex, sandbox]
max_turns: 25
timeout_seconds: 300
env:
  EVAL_PREVUE_SCENARIO: sandbox-merge
---

Show me the preview for app/src/main/kotlin/Screen.kt. If Codex needs sandbox settings, you have my consent — don't ask again, just add them.
