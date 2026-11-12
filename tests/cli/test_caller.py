"""next · then 을 응답을 낸 체크아웃의 prevue 로 — 그대로 쳐도 그 체크아웃이 데몬을 띄우는가. 실행: python3 -m unittest discover -s tests/cli
PATH 의 prevue 가 이 bin/prevue 면 지금처럼 "prevue …", 아니면(워크트리 · 다른 판 · PATH 에 없음) 이 bin/prevue 의 경로다.
"""

import os
from pathlib import Path
import shlex
import unittest
from unittest import mock

from test_plan import P, installed_path, search_path
import test_lang

ROOT = Path(__file__).resolve().parents[2] / "plugin"
SELF = os.path.realpath(ROOT / "bin" / "prevue")


class Runnable(unittest.TestCase):
    def runnable(self, found, resp):
        with mock.patch.object(P.shutil, "which", return_value=found), mock.patch.dict(os.environ, {}, clear=True):
            return P.runnable(resp)

    def test_PATH_의_prevue_가_이_바이너리면_그대로다(self):
        self.assertEqual(self.runnable(SELF, {"next": "prevue setup"}), {"next": "prevue setup"})

    def test_PATH_의_prevue_가_남이면_이_바이너리_경로다(self):
        out = self.runnable("/elsewhere/bin/prevue", {"next": "prevue start --classpath /a.json", "then": "prevue show /B.kt"})
        self.assertEqual(out, {"next": shlex.quote(SELF) + " start --classpath /a.json", "then": shlex.quote(SELF) + " show /B.kt"})

    def test_PATH_에_prevue_가_없어도_경로다(self):
        self.assertEqual(shlex.split(self.runnable(None, {"next": "prevue setup"})["next"]), [SELF, "setup"])

    def test_두_번_거쳐도_한_번만_바뀐다(self):
        once = self.runnable(None, {"next": "prevue warmup /a/B.kt   # note"})
        self.assertEqual(self.runnable(None, dict(once)), once)
        self.assertEqual(P.bare_commands(dict(once)), {"next": "prevue warmup /a/B.kt   # note"})

    def test_언어와_셸_주석이_함께_실린다(self):
        with mock.patch.object(P.shutil, "which", return_value=None), mock.patch.dict(os.environ, {"PREVUE_LANG": "ko"}):
            out = P.runnable({"next": "prevue show /a.kt   # in a shell with network access"})
        self.assertEqual(out["next"], shlex.quote(SELF) + " show /a.kt --lang ko   # in a shell with network access")

    def test_prevue_밖_명령은_그대로다(self):
        self.assertEqual(self.runnable(None, {"next": "xcode-select --install"}), {"next": "xcode-select --install"})

    def test_되읽은_warmup_에도_show_를_한_번만_붙인다(self):
        emitted = self.runnable(None, {"next": "prevue warmup /a/B.kt"})
        self.assertEqual(P.prepare_request(P.bare_commands(emitted)), {"next": "prevue warmup /a/B.kt --show"})


class CallerCli(test_lang.CliCase):
    """진짜 bin/prevue 를 PATH 를 고정해 부른다 — 데몬은 띄우지 않고 next 의 실행 파일만 본다."""

    def run_on(self, path, *args):
        self.path = path
        return self.run_cli(*args)

    def decoy(self):
        d = os.path.join(self.tmp.name, "installed", "bin")
        os.makedirs(d)
        p = os.path.join(d, "prevue")
        with open(p, "w") as f:
            f.write("#!/bin/sh\nexit 9\n")
        os.chmod(p, 0o755)
        return d

    def program(self, command):
        return shlex.split(command.partition("   #")[0])[0]

    def test_다른_prevue_가_PATH_에_있으면_next_는_이_체크아웃의_것이다(self):
        out, _ = self.run_on(search_path(self.decoy()), "health", self.file)
        self.assertEqual(self.program(out["next"]), SELF, out)

    def test_PATH_에_prevue_가_없어도_이_체크아웃의_것이다(self):
        out, _ = self.run_on(search_path(), "health", self.file)
        self.assertEqual(self.program(out["next"]), SELF, out)

    def test_PATH_의_prevue_로_부르면_지금과_같다(self):
        out, _ = self.run_on(installed_path(), "health", self.file)
        self.assertTrue(out["next"].startswith("prevue warmup "), out)

    def test_show_가_되읽은_warmup_도_이_체크아웃의_것이고_show_는_한_번이다(self):
        out, code = self.run_on(search_path(self.decoy()), "show", self.file)
        self.assertEqual(code, 3, out)
        warmups = [out[k] for k in ("next", "then") if " warmup " in out.get(k, "")]
        self.assertTrue(warmups, out)
        for command in warmups:
            self.assertEqual(self.program(command), SELF, command)
            self.assertEqual(shlex.split(command).count("--show"), 1, command)

    def test_셸이_지은_next_도_이_체크아웃의_것이다(self):
        out, _ = self.run_on(search_path(self.decoy()), "setup", self.file)
        self.assertEqual(shlex.split(out["next"]), [SELF, "warmup", self.file])


if __name__ == "__main__":
    unittest.main()
