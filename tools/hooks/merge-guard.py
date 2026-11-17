#!/usr/bin/env python3
# 에이전트가 치는 `gh pr merge` 를 실행 전에 가로채는 PreToolUse 훅 — develop 머지는 사람이 한다(AGENTS.md "브랜치와 워크트리").
# 문장만으로는 옛 스킬을 로드한 세션이 머지를 불렀다 — 세션이 무엇을 읽었든 명령이 나가는 순간에 건다.
#
#   develop → main(릴리즈 PR, /ship 이 머지한다)  → 통과
#   그 밖(작업 PR · PR 을 읽지 못함)               → 사람 확인을 띄운다
#
# 보는 것은 명령 자리에 놓인 gh 다 — env · command · time 접두(와 그 `-` 옵션)는 벗기고, `bash -c '…'` · 백틱 · gh api 는 보지 않는다.
#
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
# 리다이렉션 토큰(2> · >파일 · <<EOF) — fd 숫자나 대상이 PR 번호로 읽히지 않게 토큰 단계에서 뺀다
REDIRECT = re.compile(r"^\d*(?:>>?|<<?<?)(.*)$")
PREFIXES = {"env", "command", "time"}
FALLBACK = re.compile(r"(^|[;&|(\n])\s*(\S*/)?gh\s+pr\s+merge\b")


def merges(command):
    """명령 안에서 실제로 호출되는 gh pr merge 마다 그 인자 목록을 돌려준다. 따옴표 안 언급은 토큰 하나라 잡히지 않는다."""
    try:
        lexer = shlex.shlex(command.replace("\n", " ; "), posix=True, punctuation_chars=";&|()")
        lexer.whitespace_split = True
        tokens = list(lexer)
    except ValueError:
        # 따옴표가 안 맞아 못 읽었다 — 놓치느니 넓게 잡는다
        return [[]] if FALLBACK.search(command) else []
    found, segment, i = [], [], 0
    tokens.append(";")
    while i < len(tokens):
        token = tokens[i]
        i += 1
        redirect = REDIRECT.match(token)
        if redirect:
            if not redirect.group(1):
                # 대상이 떨어져 있다(`> 파일` · `2>&1` 의 `&` `1`) — 그것까지 넘긴다
                i += 2 if tokens[i] == "&" else 1
            continue
        if token not in SEPARATORS:
            segment.append(token)
            continue
        while segment and (ASSIGNMENT.match(segment[0]) or segment[0] in PREFIXES):
            prefixed = segment.pop(0) in PREFIXES
            while prefixed and segment and segment[0].startswith("-"):
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


def ends_of(pr, repo, cwd):
    """PR 의 [base, head]. 읽지 못하면 None."""
    cmd = ["gh", "pr", "view"] + ([pr] if pr else []) + (["--repo", repo] if repo else [])
    cmd += ["--json", "baseRefName,headRefName", "-q", ".baseRefName + \" \" + .headRefName"]
    try:
        out = subprocess.run(cmd, cwd=cwd or None, capture_output=True, text=True, timeout=20)
    except (OSError, subprocess.SubprocessError):
        return None
    ends = out.stdout.split()
    return ends if out.returncode == 0 and len(ends) == 2 else None


def verdict(command, cwd):
    """통과면 None, 아니면 사람에게 보일 이유."""
    for args in merges(command):
        pr, repo = target(args)
        ends = ends_of(pr, repo, cwd)
        if ends == ["main", "develop"]:
            continue
        name = "PR %s" % pr if pr else "이 브랜치의 PR"
        if ends is None:
            return "%s을 읽지 못했다 — develop 머지는 사람이 한다(AGENTS.md). 릴리즈 PR(develop → main)만 그대로 통과한다." % name
        return "%s은 %s → %s 다 — 릴리즈 PR(develop → main)이 아닌 머지는 사람이 한다(AGENTS.md). 사용자가 이 머지를 시켰을 때만 허용한다." % (name, ends[1], ends[0])
    return None


def main():
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
    json.dump({"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "ask",
                                      "permissionDecisionReason": reason}}, sys.stdout, ensure_ascii=False)
    return 0


if __name__ == "__main__":
    sys.exit(main())
