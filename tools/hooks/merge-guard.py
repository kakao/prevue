#!/usr/bin/env python3
# 에이전트가 치는 `gh pr merge` 를 실행 전에 가로채는 PreToolUse 훅 — develop 머지는 사람이 한다(AGENTS.md "브랜치와 워크트리").
# 문장만으로는 옛 스킬을 로드한 세션이 머지를 불렀다 — 세션이 무엇을 읽었든 명령이 나가는 순간에 건다.
#
#   base 가 main(릴리즈 PR, /ship 이 머지한다)  → 통과
#   그 밖(작업 PR · base 를 읽지 못함)            → 사람 확인을 띄운다. --deny 면 막는다
#
# --deny 는 확인 창이 없는 에이전트용이다(Codex 의 PreToolUse 는 ask 를 받지 않는다).
# 입력은 훅 JSON(stdin)의 tool_input.command · cwd 다. 사람이 터미널에서 직접 치는 머지는 훅을 거치지 않는다.
import json
import os
import re
import shlex
import subprocess
import sys

SEPARATORS = {";", "&&", "||", "|", "&", "(", ")", "|&"}
# 값을 받는 gh pr merge 플래그 — 그 값을 PR 지정으로 읽지 않으려고 둔다
VALUE_FLAGS = {"-b", "--body", "-F", "--body-file", "-t", "--subject", "-A", "--author-email",
               "--match-head-commit", "-R", "--repo"}
ASSIGNMENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")
FALLBACK = re.compile(r"(^|[;&|(\n])\s*(\S*/)?gh\s+pr\s+merge\b")


def merges(command):
    """명령 안에서 실제로 호출되는 gh pr merge 마다 그 인자 목록을 돌려준다. 따옴표 안 언급은 토큰 하나라 잡히지 않는다."""
    try:
        lexer = shlex.shlex(command.replace("\n", " ; "), posix=True, punctuation_chars=True)
        lexer.whitespace_split = True
        tokens = list(lexer)
    except ValueError:
        # 따옴표가 안 맞아 못 읽었다 — 놓치느니 넓게 잡는다
        return [[]] if FALLBACK.search(command) else []
    found, segment = [], []
    for token in tokens + [";"]:
        if token not in SEPARATORS:
            segment.append(token)
            continue
        while segment and ASSIGNMENT.match(segment[0]):
            segment.pop(0)
        if len(segment) >= 3 and os.path.basename(segment[0]) == "gh" and segment[1:3] == ["pr", "merge"]:
            found.append(segment[3:])
        segment = []
    return found


def target(args):
    """인자에서 PR 지정(번호 · URL · 브랜치)과 --repo 를 고른다."""
    pr, repo, i = None, None, 0
    while i < len(args):
        arg = args[i]
        if arg in ("-R", "--repo") and i + 1 < len(args):
            repo = args[i + 1]
        if arg.startswith("--repo="):
            repo = arg.split("=", 1)[1]
        if arg in VALUE_FLAGS:
            i += 2
            continue
        if not arg.startswith("-") and pr is None:
            pr = arg
        i += 1
    return pr, repo


def base_of(pr, repo, cwd):
    cmd = ["gh", "pr", "view"] + ([pr] if pr else []) + (["--repo", repo] if repo else [])
    cmd += ["--json", "baseRefName", "-q", ".baseRefName"]
    try:
        out = subprocess.run(cmd, cwd=cwd or None, capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.SubprocessError):
        return None
    return out.stdout.strip() if out.returncode == 0 and out.stdout.strip() else None


def verdict(command, cwd):
    """통과면 None, 아니면 사람에게 보일 이유."""
    for args in merges(command):
        pr, repo = target(args)
        base = base_of(pr, repo, cwd)
        if base == "main":
            continue
        name = "PR %s" % pr if pr else "이 브랜치의 PR"
        if base is None:
            return "%s의 base 를 읽지 못했다 — develop 머지는 사람이 한다(AGENTS.md). 릴리즈 PR(base main)만 그대로 통과한다." % name
        return "%s의 base 는 %s 다 — develop 머지는 사람이 한다(AGENTS.md). 사용자가 이 머지를 시켰을 때만 허용한다." % (name, base)
    return None


def main():
    deny = "--deny" in sys.argv[1:]
    try:
        event = json.load(sys.stdin)
        command = event["tool_input"]["command"]
    except (ValueError, KeyError, TypeError):
        return 0
    if not isinstance(command, str):
        return 0
    reason = verdict(command, event.get("cwd"))
    if reason is None:
        return 0
    if deny:
        sys.stderr.write(reason + " 사람이 직접 머지한다.\n")
        return 2
    json.dump({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "ask",
                                      "permissionDecisionReason": reason}}, sys.stdout, ensure_ascii=False)
    return 0


if __name__ == "__main__":
    sys.exit(main())
