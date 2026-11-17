#!/usr/bin/env python3
# 에이전트가 치는 `gh pr merge` 를 실행 전에 가로채는 PreToolUse 훅 — develop 머지는 사람이 한다(AGENTS.md "브랜치와 워크트리").
# 문장만으로는 옛 스킬을 로드한 세션이 머지를 불렀다 — 세션이 무엇을 읽었든 명령이 나가는 순간에 건다.
#
#   글자 그대로 `gh pr merge <번호> --merge` 이고 그 PR 이 develop → main(릴리즈 PR, /ship 이 머지한다)  → 통과
#   그 밖의 모든 gh pr merge                                                                          → 사람 확인을 띄운다
#
# 잘못 띄운 확인은 클릭 한 번이고 잘못 통과시킨 것은 머지다 — 그래서 통과만 좁게 정하고, 명령에서 PR 을 짐작해 읽지 않는다.
# 따옴표 밖에 gh pr merge 가 이어져 있으면 어디에 있든 잡는다(heredoc 본문의 언급도 확인이 뜬다).
# `bash -c '…'` 처럼 따옴표 안에 든 머지와 gh api 는 보지 않는다. 사람이 터미널에서 직접 치는 머지는 훅을 거치지 않는다.
# 입력은 훅 JSON(stdin)의 tool_input.command · cwd 다.
import json
import re
import shlex
import subprocess
import sys

SEPARATORS = {";", "&&", "||", "|", "&", "(", ")", "|&"}
MERGE = ["gh", "pr", "merge"]
RAW_MERGE = re.compile(r"\bgh\s+pr\s+merge\b")
HUMAN = "develop 머지는 사람이 한다(AGENTS.md). 사용자가 이 머지를 시켰을 때만 허용한다."


def segments(command):
    """따옴표 밖의 gh pr merge 가 든 명령 조각들. 읽지 못한 명령은 None."""
    try:
        lexer = shlex.shlex(command.replace("\n", " ; "), posix=True, punctuation_chars=";&|()")
        lexer.whitespace_split = True
        tokens = list(lexer)
    except ValueError:
        return None
    found, segment = [], []
    for token in tokens + [";"]:
        if token not in SEPARATORS:
            segment.append(token)
            continue
        names = [t.rsplit("/", 1)[-1] for t in segment]
        if any(names[i:i + 3] == MERGE for i in range(len(names))):
            found.append(segment)
        segment = []
    return found


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
    found = segments(command)
    if found is None:
        return "명령을 읽지 못했는데 gh pr merge 가 들어 있다 — " + HUMAN if RAW_MERGE.search(command) else None
    for segment in found:
        canonical = len(segment) == 5 and segment[:3] == MERGE and segment[3].isdigit() and segment[4] == "--merge"
        if not (canonical and release(segment[3], cwd)):
            return "릴리즈 PR(develop → main)을 `gh pr merge <번호> --merge` 로 머지하는 것이 아니다 — " + HUMAN
    return None


def main():
    try:
        event = json.load(sys.stdin)
        command = event["tool_input"]["command"]
    except (ValueError, KeyError, TypeError):
        return 0
    if not isinstance(command, str) or "merge" not in command:
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
