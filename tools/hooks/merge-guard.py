#!/usr/bin/env python3
# 에이전트가 치는 `gh pr merge` 를 실행 전에 가로채는 PreToolUse 훅 — develop 머지는 사람이 한다(AGENTS.md "브랜치와 워크트리").
# 문장만으로는 옛 스킬을 로드한 세션이 머지를 불렀다 — 세션이 무엇을 읽었든 명령이 나가는 순간에 건다.
#
#   명령 전체가 글자 그대로 `gh pr merge <번호> --merge` 이고 그 PR 이 develop → main(릴리즈 PR, /ship 이 머지한다)  → 통과
#   그 밖에 gh … pr … merge 가 한 줄에 든 모든 명령                                                              → 사람 확인을 띄운다
#
# 잘못 띄운 확인은 클릭 한 번이고 잘못 통과시킨 것은 머지다 — 그래서 셸 문법(따옴표 · heredoc · 주석 · 치환)을 풀지 않는다.
# 풀어서 실행될 머지만 고르려던 판은 리뷰마다 놓치는 모양이 나왔다. 그 값으로 머지를 언급만 한 명령(grep · 커밋 메시지 · PR 본문)에도 확인이 뜬다.
# gh api 로 하는 머지와 스크립트 파일 안의 머지는 보지 않는다. 사람이 터미널에서 직접 치는 머지는 훅을 거치지 않는다.
# 입력은 훅 JSON(stdin)의 tool_input.command · cwd 다.
import json
import re
import subprocess
import sys

MENTION = re.compile(r"\bgh\b[^;|&\n]*\bpr\b[^;|&\n]*\bmerge\b")
RELEASE = re.compile(r"gh pr merge ([0-9]+) --merge")
HUMAN = "develop 머지는 사람이 한다(AGENTS.md). 사용자가 이 머지를 시켰을 때만 허용한다."


def release(number, cwd):
    """그 번호의 PR 이 develop → main 인가."""
    cmd = ["gh", "pr", "view", number, "--json", "baseRefName,headRefName", "-q", '.baseRefName + " " + .headRefName']
    try:
        out = subprocess.run(cmd, cwd=cwd or None, capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.SubprocessError):
        return False
    return out.returncode == 0 and out.stdout.split() == ["main", "develop"]


def verdict(command, cwd):
    """통과면 None, 아니면 사람에게 보일 이유."""
    if not MENTION.search(command.replace("\\\n", " ")):
        return None
    canonical = RELEASE.fullmatch(command.strip())
    if canonical and release(canonical.group(1), cwd):
        return None
    return "명령에 gh pr merge 가 있고, 릴리즈 PR(develop → main)을 `gh pr merge <번호> --merge` 로만 머지하는 것이 아니다 — " + HUMAN


def main():
    try:
        event = json.load(sys.stdin)
        command = event["tool_input"]["command"]
    except (ValueError, KeyError, TypeError):
        return 0
    if not isinstance(command, str):
        return 0
    try:
        reason = verdict(command, event.get("cwd"))
    except Exception as e:  # 훅이 죽으면(종료 1) 명령이 그대로 나간다 — 죽는 대신 묻는다
        reason = "머지 훅이 판정하지 못했다(%s) — %s" % (type(e).__name__, HUMAN)
    if reason is not None:
        json.dump({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "ask",
                                          "permissionDecisionReason": reason}}, sys.stdout, ensure_ascii=False)
    return 0


if __name__ == "__main__":
    sys.exit(main())
