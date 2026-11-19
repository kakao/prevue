"""start --idle(D-195) — 틀린 값은 데몬을 띄우기 전에 사용법으로 거른다. 실행: python3 -m unittest discover -s tests/cli
"""

import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

PREVUE = Path(__file__).resolve().parents[2] / "plugin/bin/prevue"


class IdleTest(unittest.TestCase):
    def run_start(self, *args):
        with tempfile.TemporaryDirectory() as home:
            env = dict(os.environ, PREVUE_HOME=home)
            p = subprocess.run([str(PREVUE), "start", *args], capture_output=True, text=True, env=env, timeout=30)
        return p.stdout, p.returncode

    def test_분_수가_아니면_띄우지_않고_사용법이다(self):
        for args in (["--idle", "5h"], ["--idle", "1.5"], ["--idle", "-1"], ["--idle", ""], ["--idle"], ["--idle", "--show", "/a.kt"]):
            with self.subTest(args=args):
                out, code = self.run_start(*args)
                self.assertEqual(code, 2)
                self.assertIn("--idle", json.loads(out)["error"])

    def test_분_수면_거르지_않는다(self):
        for v in ("0", "5", "5m"):
            with self.subTest(v=v):
                out, code = self.run_start("--idle", v, "--fg", "--classpath", "/없는/덤프.json")
                self.assertNotIn("--idle takes", out)


if __name__ == "__main__":
    unittest.main()
