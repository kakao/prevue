"""tools/ci_wait.py — 작업 PR 의 CI 를 한 번에 기다려 판정한다. 실행: python3 -m unittest discover -s tests/cli

PATH 앞에 가짜 gh 를 끼워 응답을 차례로 돌려준다. 응답은 "<첫 두 인자>"마다 목록이고, 다 쓰면 마지막 것을 되풀이한다.
"""

import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools"))
import ci_wait  # noqa: E402

FAKE_GH = """#!/usr/bin/env python3
import json, os, sys
d = os.environ["FAKE_GH_DIR"]
key = " ".join(sys.argv[1:3])
with open(os.path.join(d, "calls"), "a") as f:
    f.write(" ".join(sys.argv[1:]) + "\\n")
with open(os.path.join(d, "script.json")) as f:
    script = json.load(f)
seen_path = os.path.join(d, "seen.json")
seen = {}
if os.path.exists(seen_path):
    with open(seen_path) as f:
        seen = json.load(f)
replies = script.get(key) or [{"code": 1, "err": "no reply for " + key}]
n = seen.get(key, 0)
seen[key] = n + 1
with open(seen_path, "w") as f:
    json.dump(seen, f)
r = replies[min(n, len(replies) - 1)]
out = r.get("out", "")
sys.stdout.write(out if isinstance(out, str) else json.dumps(out))
sys.stderr.write(r.get("err", ""))
sys.exit(r.get("code", 0))
"""

SHA = "a" * 40
OPEN = {"state": "OPEN", "mergeable": "MERGEABLE", "headRefOid": SHA}
RUN = [{"databaseId": 77}]
PASS = [{"name": "ci-success", "bucket": "pass", "link": "https://ci/77"}]
FAIL = [{"name": "ci-success", "bucket": "fail", "link": "https://ci/77"}]
JOBS = {"attempt": 1, "url": "https://run/77", "jobs": [
    {"name": "lint / lint", "databaseId": 5, "conclusion": "failure",
     "steps": [{"name": "Kotlin lint", "conclusion": "failure"}]},
    {"name": "compile / compile", "databaseId": 6, "conclusion": "cancelled", "steps": []},
    {"name": "ci-success", "databaseId": 7, "conclusion": "failure", "steps": []},
]}
LOG = ("2026-11-18T03:45:36.1Z \x1b[31mReceived status code 429 from server: Too Many Requests\x1b[0m\n"
       "2026-11-18T03:45:36.2Z ##[error]Process completed with exit code 2.\n"
       "2026-11-18T03:45:36.5Z Cleaning up orphan processes\n")


class CiWait(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        gh = os.path.join(self.tmp.name, "gh")
        with open(gh, "w") as f:
            f.write(FAKE_GH)
        os.chmod(gh, 0o755)
        env = {"PATH": self.tmp.name + os.pathsep + os.environ["PATH"], "FAKE_GH_DIR": self.tmp.name}
        self.old = {k: os.environ.get(k) for k in env}
        os.environ.update(env)
        self.addCleanup(self.restore)

    def restore(self):
        for k, v in self.old.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v

    def run_with(self, script, *args):
        with open(os.path.join(self.tmp.name, "script.json"), "w") as f:
            json.dump(script, f)
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            code = ci_wait.main(["42", "--poll", "0", *args])
        return code, out.getvalue() + err.getvalue()

    def calls(self):
        path = os.path.join(self.tmp.name, "calls")
        if not os.path.exists(path):
            return []
        with open(path) as f:
            return f.read().splitlines()

    def test_초록이면_0_이고_판정_링크를_찍는다(self):
        code, out = self.run_with({"pr view": [{"out": OPEN}], "run list": [{"out": RUN}],
                                   "run watch": [{}], "pr checks": [{"out": PASS}]})
        self.assertEqual(code, 0)
        self.assertIn("https://ci/77", out)

    # 지킬 것: ci-success 가 생기기 전 "no required checks reported"로 끝나던 대기 — run 이 끝날 때까지 watch 한 뒤에 판정한다
    def test_run_이_끝날_때까지_watch_한_뒤에_필수_체크를_본다(self):
        self.run_with({"pr view": [{"out": OPEN}], "run list": [{"out": RUN}],
                       "run watch": [{}], "pr checks": [{"out": PASS}]})
        calls = self.calls()
        watch = next(i for i, c in enumerate(calls) if c.startswith("run watch 77"))
        checks = next(i for i, c in enumerate(calls) if c.startswith("pr checks 42 --required"))
        self.assertLess(watch, checks)
        self.assertIn("--exit-status", calls[watch])

    def test_충돌이면_run_을_찾지_않고_2(self):
        code, out = self.run_with({"pr view": [{"out": dict(OPEN, mergeable="CONFLICTING")}]})
        self.assertEqual(code, 2)
        self.assertIn("CONFLICTING", out)
        self.assertFalse([c for c in self.calls() if c.startswith("run ")])

    def test_mergeable_이_UNKNOWN_이면_다시_묻고_정해진_값으로_간다(self):
        code, _ = self.run_with({"pr view": [{"out": dict(OPEN, mergeable="UNKNOWN")},
                                             {"out": dict(OPEN, mergeable="CONFLICTING")}]})
        self.assertEqual(code, 2)

    # 지킬 것: run 을 기다리는 사이 충돌로 바뀌면 run 이 영영 안 뜬다 — 상한까지 헛돌지 않는다
    def test_run_을_기다리는_사이_충돌로_바뀌면_2(self):
        code, _ = self.run_with({"pr view": [{"out": OPEN}, {"out": dict(OPEN, mergeable="CONFLICTING")}],
                                 "run list": [{"out": []}]}, "--appear-timeout", "60")
        self.assertEqual(code, 2)

    def test_상한_안에_run_이_없으면_3(self):
        code, out = self.run_with({"pr view": [{"out": OPEN}], "run list": [{"out": []}]},
                                  "--appear-timeout", "0")
        self.assertEqual(code, 3)
        self.assertIn("run 없음", out)

    def test_run_이_늦게_생기면_그_run_을_기다린다(self):
        code, _ = self.run_with({"pr view": [{"out": OPEN}], "run list": [{"out": []}, {"out": RUN}],
                                 "run watch": [{}], "pr checks": [{"out": PASS}]}, "--appear-timeout", "60")
        self.assertEqual(code, 0)

    def test_실패면_1_이고_원인_job_의_스텝과_오류_앞_로그를_ANSI_없이_찍는다(self):
        code, out = self.run_with({"pr view": [{"out": OPEN}], "run list": [{"out": RUN}],
                                   "run watch": [{"code": 1}], "pr checks": [{"out": FAIL, "code": 1}],
                                   "run view": [{"out": JOBS}], "api --allow-escape-sequences": [{"out": LOG}]})
        self.assertEqual(code, 1)
        self.assertIn("attempt 1", out)
        self.assertIn("lint / lint — 실패 스텝: Kotlin lint", out)
        self.assertIn("Received status code 429", out)
        self.assertNotIn("\x1b", out)
        self.assertNotIn("Cleaning up", out)
        # ci-success 는 다른 job 의 실패를 옮길 뿐이라 로그를 읽지 않는다
        self.assertEqual([c for c in self.calls() if c.startswith("api ")],
                         ["api --allow-escape-sequences repos/{owner}/{repo}/actions/jobs/5/logs"])

    def test_필수_체크가_아직_없으면_초록으로_치지_않는다(self):
        code, _ = self.run_with({"pr view": [{"out": OPEN}], "run list": [{"out": RUN}],
                                 "run watch": [{"code": 1}],
                                 "pr checks": [{"code": 1, "err": "no required checks reported"}],
                                 "run view": [{"out": dict(JOBS, jobs=[])}]})
        self.assertEqual(code, 1)

    def test_기다리는_사이_head_가_바뀌면_새_head_를_다시_기다린다(self):
        new = dict(OPEN, headRefOid="b" * 40)
        code, _ = self.run_with({"pr view": [{"out": OPEN}, {"out": {"headRefOid": "b" * 40}}, {"out": new}],
                                 "run list": [{"out": RUN}], "run watch": [{}], "pr checks": [{"out": PASS}]})
        self.assertEqual(code, 0)
        self.assertEqual(len([c for c in self.calls() if c.startswith("run watch")]), 2)

    def test_gh_가_실패하면_4(self):
        code, out = self.run_with({"pr view": [{"code": 1, "err": "HTTP 502"}]})
        self.assertEqual(code, 4)
        self.assertIn("HTTP 502", out)

    def test_닫힌_PR_이면_4(self):
        code, _ = self.run_with({"pr view": [{"out": dict(OPEN, state="MERGED")}]})
        self.assertEqual(code, 4)


if __name__ == "__main__":
    unittest.main()
