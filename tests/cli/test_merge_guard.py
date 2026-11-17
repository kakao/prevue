"""머지 확인 훅(tools/hooks/merge-guard.py)의 판정. 실행: python3 -m unittest discover -s tests/cli

훅을 프로세스로 띄워 훅 JSON 을 stdin 으로 넣고, PATH 앞에 둔 가짜 gh 가 base 를 답한다 — 실제 gh 와 실제 PR 은 부르지 않는다.
"""

import json
import os
import stat
import subprocess
import sys
import tempfile
import unittest

VIEW = 'pr view %s --json baseRefName,headRefName -q .baseRefName + " " + .headRefName'
HOOK = os.path.join(os.path.dirname(__file__), "..", "..", "tools", "hooks", "merge-guard.py")
# 가짜 gh: `pr view <N>` 에 "base head" 를 답하고 부른 인자를 남긴다 — N 이 9 로 끝나거나 1 · 2 면 릴리즈 PR, 8 로 끝나면 main 으로 잘못 연 작업 PR,
# 0 으로 끝나면 실패, 그 밖은 작업 PR 이다. 1 · 2 는 리다이렉션의 fd 숫자가 PR 번호로 읽히면 통과해 버리게 둔 것이다
FAKE_GH = """#!/bin/sh
echo "$*" >> "$GH_LOG"
case "$3" in
  *9|1|2) echo "main develop" ;;
  *8) echo "main worktree-x" ;;
  *0) echo "no pull requests found" >&2; exit 1 ;;
  *) echo "develop worktree-x" ;;
esac
"""


class MergeGuard(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.dir.cleanup)
        gh = os.path.join(self.dir.name, "gh")
        with open(gh, "w", encoding="utf-8") as f:
            f.write(FAKE_GH)
        os.chmod(gh, os.stat(gh).st_mode | stat.S_IEXEC)
        self.log = os.path.join(self.dir.name, "log")

    def run_hook(self, command):
        env = dict(os.environ, PATH=self.dir.name + os.pathsep + os.environ["PATH"], GH_LOG=self.log)
        event = {"hook_event_name": "PreToolUse", "tool_name": "Bash", "cwd": self.dir.name, "tool_input": {"command": command}}
        return subprocess.run([sys.executable, HOOK], input=json.dumps(event), env=env,
                              capture_output=True, text=True, timeout=30)

    def asked(self, command):
        out = self.run_hook(command)
        self.assertEqual(out.returncode, 0, out.stderr)
        if not out.stdout:
            return None
        decision = json.loads(out.stdout)["hookSpecificOutput"]
        self.assertEqual(decision["permissionDecision"], "ask")
        return decision["permissionDecisionReason"]

    def gh_calls(self):
        if not os.path.exists(self.log):
            return []
        with open(self.log, encoding="utf-8") as f:
            return f.read().splitlines()

    def test_작업_PR_머지는_사람_확인을_띄운다(self):
        self.assertIn("사람이 한다", self.asked("gh pr merge 257 --merge"))
        self.assertEqual(self.gh_calls(), [VIEW % "257"])

    def test_릴리즈_PR을_ship의_모양_그대로_머지하면_통과한다(self):
        self.assertIsNone(self.asked("gh pr merge 249 --merge"))
        self.assertIsNone(self.asked("  gh pr merge 249 --merge\n"))

    def test_PR을_읽지_못하면_사람_확인을_띄운다(self):
        self.assertIsNotNone(self.asked("gh pr merge 250 --merge"))

    def test_main으로_잘못_연_작업_PR은_띄운다(self):
        self.assertIsNotNone(self.asked("gh pr merge 248 --merge"))

    def test_머지가_없는_명령은_gh를_부르지_않고_통과한다(self):
        for command in ("gh pr view 257 --json state,mergeable,mergeStateStatus",
                        "gh pr checks 257 --required --watch",
                        "git merge origin/develop",
                        "gh pr list --state merged; git log --merges",
                        "gh pr create --base develop --title x\ngit merge origin/develop",
                        "ls tools/hooks/merge-guard.py",
                        "gh pr create --base develop --head worktree-retro-merge-guard-review --body-file /tmp/x-merge-guard/body.md",
                        "gh pr view worktree-pr-merge-fix --json state"):
            self.assertIsNone(self.asked(command), command)
        self.assertEqual(self.gh_calls(), [])

    def test_ship의_모양이_아닌_머지는_PR을_조회하지_않고_띄운다(self):
        # 가짜 gh 는 1 · 2 · 249 에 릴리즈 PR 을 답한다 — 명령에서 PR 을 짐작해 조회하면 통과해 버린다
        for command in ("gh pr merge 257 --squash",
                        "gh pr merge --squash",
                        "gh pr merge 249",
                        "gh pr merge 249 --merge --delete-branch",
                        "gh pr merge --merge 249",
                        "gh pr merge 249  --merge",
                        "gh pr merge 249 --merge 2>&1",
                        "gh pr merge --squash 2>&1",
                        "gh pr merge 249 --merge > /tmp/o",
                        "gh pr merge &>/dev/null 257",
                        'gh pr merge --body "> note" 257',
                        "gh pr merge --subject 257 -R kakao/prevue 249 --merge",
                        "gh pr list -q '.a > .b' ; gh pr merge 257",
                        "cd ../other && gh pr merge 249 --merge",
                        "export GH_REPO=kakao/other; gh pr merge 249 --merge",
                        "gh pr checks 249 --watch && gh pr merge 249 --merge",
                        "gh pr merge 249 --merge; gh pr merge 249 --merge",
                        "git push\n/opt/homebrew/bin/gh pr merge 249 --merge",
                        "gh pr merge 249\n--merge",
                        "gh pr \\\n merge 257",
                        "gh --repo kakao/prevue pr merge 249 --merge",
                        "gh pr -R kakao/prevue merge 249 --merge",
                        "echo $(gh pr merge 257)",
                        'out="$(gh pr merge 257 --squash 2>&1)"',
                        'echo "`gh pr merge 257`"',
                        "bash -c 'gh pr merge 257 --squash'",
                        "env -u X gh pr merge 249 --merge",
                        "time -p gh pr merge 249 --merge",
                        "# 주석\ngh pr merge 257 --squash",
                        "open https://github.com/kakao/prevue#readme && gh pr merge 257 --squash",
                        "cat <<'EOF' > n.md\nDon't\nEOF\ngh pr merge 257 --squash\ncat <<'EOF' >> n.md\nwon't\nEOF",
                        "gh pr merge 257 --body 'unterminated",
                        "gh pr merge ２４９ --merge",
                        "gh pr \\merge 257", "gh 'pr' \"merge\" 257", "GH pr merge 249 --merge",
                        "gh pr merge 249 --merge             # merge commit"):
            self.assertIsNotNone(self.asked(command), command)
        self.assertEqual(self.gh_calls(), [])

    def test_머지를_언급만_한_명령에도_띄운다(self):
        # 셸 문법을 풀지 않는 값이다 — 풀어서 언급만 통과시키려던 판은 실행되는 머지를 놓쳤다
        for command in ("grep -rn 'gh pr merge' dev-skills-src", 'git commit -m "gh pr merge 를 훅이 가로챈다"'):
            self.assertIsNotNone(self.asked(command), command)
        self.assertEqual(self.gh_calls(), [])

    def test_훅_JSON이_아니면_아무것도_막지_않는다(self):
        env = dict(os.environ, GH_LOG=self.log)
        out = subprocess.run([sys.executable, HOOK], input="not json", env=env, capture_output=True, text=True, timeout=30)
        self.assertEqual((out.returncode, out.stdout), (0, ""))


if __name__ == "__main__":
    unittest.main()
