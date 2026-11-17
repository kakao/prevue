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

HOOK = os.path.join(os.path.dirname(__file__), "..", "..", "tools", "hooks", "merge-guard.py")
# 가짜 gh: `pr view <N>` 에 N 이 9 로 끝나면 main, 0 으로 끝나면 실패, 그 밖은 develop 을 답하고 부른 인자를 남긴다
FAKE_GH = """#!/bin/sh
echo "$*" >> "$GH_LOG"
case "$3" in
  *9) echo main ;;
  *0) echo "no pull requests found" >&2; exit 1 ;;
  *) echo develop ;;
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

    def run_hook(self, command, *flags):
        env = dict(os.environ, PATH=self.dir.name + os.pathsep + os.environ["PATH"], GH_LOG=self.log)
        event = {"hook_event_name": "PreToolUse", "tool_name": "Bash", "cwd": self.dir.name, "tool_input": {"command": command}}
        return subprocess.run([sys.executable, HOOK, *flags], input=json.dumps(event), env=env,
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
        reason = self.asked("gh pr merge 257 --squash")
        self.assertIn("develop", reason)
        self.assertIn("257", reason)

    def test_릴리즈_PR_머지는_그대로_통과한다(self):
        self.assertIsNone(self.asked("gh pr merge 249 --merge"))

    def test_base를_읽지_못하면_사람_확인을_띄운다(self):
        self.assertIn("읽지 못했다", self.asked("gh pr merge 250 --squash"))

    def test_머지를_언급만_한_명령은_gh를_부르지_않고_통과한다(self):
        for command in ("grep -rn 'gh pr merge' dev-skills-src",
                        'git commit -m "gh pr merge 를 훅이 가로챈다"',
                        "gh pr create --base develop --body \"$(cat <<'EOF'\ngh pr merge 257 를 부르지 않는다\nEOF\n)\"",
                        "gh pr view 257 --json state",
                        "gh pr checks 257 --required --watch"):
            self.assertIsNone(self.asked(command), command)
        self.assertEqual(self.gh_calls(), [])

    def test_이어_붙인_명령_안의_머지도_잡는다(self):
        for command in ("gh pr checks 257 --watch && gh pr merge 257 --squash",
                        "cd /tmp; GH_PAGER= gh pr merge 257",
                        "git push\n/opt/homebrew/bin/gh pr merge 257",
                        "echo $(gh pr merge 257)"):
            self.assertIn("develop", self.asked(command), command)

    def test_한_명령의_머지_가운데_하나라도_작업_PR이면_띄운다(self):
        self.assertIn("257", self.asked("gh pr merge 249 --merge && gh pr merge 257 --squash"))

    def test_플래그의_값을_PR_지정으로_읽지_않는다(self):
        self.assertIsNone(self.asked("gh pr merge --subject 257 -R kakao/prevue 249 --merge"))
        self.assertEqual(self.gh_calls(), ["pr view 249 --repo kakao/prevue --json baseRefName -q .baseRefName"])

    def test_PR_지정이_없으면_지금_브랜치의_PR을_본다(self):
        self.assertIn("이 브랜치의 PR", self.asked("gh pr merge --squash"))

    def test_따옴표가_안_맞는_명령도_머지면_띄운다(self):
        self.assertIsNotNone(self.asked("gh pr merge 257 --body 'unterminated"))

    def test_deny_모드는_이유를_stderr에_내고_2로_막는다(self):
        out = self.run_hook("gh pr merge 257 --squash", "--deny")
        self.assertEqual(out.returncode, 2)
        self.assertIn("develop", out.stderr)
        self.assertEqual(self.run_hook("gh pr merge 249 --merge", "--deny").returncode, 0)

    def test_훅_JSON이_아니면_아무것도_막지_않는다(self):
        env = dict(os.environ, GH_LOG=self.log)
        out = subprocess.run([sys.executable, HOOK], input="not json", env=env, capture_output=True, text=True, timeout=30)
        self.assertEqual((out.returncode, out.stdout), (0, ""))


if __name__ == "__main__":
    unittest.main()
