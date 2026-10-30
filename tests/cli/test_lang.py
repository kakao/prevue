"""뷰어 언어 --lang(D-110) — 에이전트가 show · open 에 준 언어가 다음 명령과 뷰어 주소에 실리는가. 실행: python3 -m unittest discover -s tests/cli
"""

import io
import json
import os
from pathlib import Path
import subprocess
import unittest
from unittest import mock
from urllib.parse import parse_qs, urlsplit

from test_plan import Case, P
import prevue_prepare as preparation

ROOT = Path(__file__).resolve().parents[2] / "plugin"


class Helpers(unittest.TestCase):
    def test_다음_명령에_언어를_한_번만_싣는다(self):
        with mock.patch.dict(os.environ, {"PREVUE_LANG": "ko"}):
            out = P.with_lang({"next": "prevue setup", "then": "prevue warmup /a/B.kt --show"})
            self.assertEqual(out, {"next": "prevue setup --lang ko", "then": "prevue warmup /a/B.kt --show --lang ko"})
            self.assertEqual(P.with_lang(dict(out)), out)

    def test_셸_주석과_prevue_밖_명령은_그대로다(self):
        with mock.patch.dict(os.environ, {"PREVUE_LANG": "ko"}):
            self.assertEqual(P.with_lang({"next": "prevue show /a.kt   # in a shell with network access"})["next"],
                             "prevue show /a.kt --lang ko   # in a shell with network access")
            self.assertEqual(P.with_lang({"next": "xcode-select --install"})["next"], "xcode-select --install")

    def test_언어가_없으면_건드리지_않는다(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertEqual(P.with_lang({"next": "prevue setup"}), {"next": "prevue setup"})
            self.assertEqual(P.viewer_at(8801), "http://127.0.0.1:8801/")
        with mock.patch.dict(os.environ, {"PREVUE_LANG": "en"}):
            self.assertEqual(P.viewer_at(8801), "http://127.0.0.1:8801/?lang=en")

    def test_준비_화면이_넘기는_뷰어_주소에_언어가_실린다(self):
        state = {"phase": "environment", "daemon": "http://127.0.0.1:12345/", "id": "a" * 32, "file": "/F.kt", "started": 1}
        with mock.patch.dict(os.environ, {"PREVUE_LANG": "ko"}), \
                mock.patch.object(preparation, "urlopen", return_value=io.StringIO(json.dumps({"root": str(preparation.ROOT)}))):
            self.assertEqual(parse_qs(urlsplit(preparation.handoff(state)).query)["lang"], ["ko"])

    def test_이어받기는_언어가_붙은_뷰어_주소도_읽는다(self):
        with mock.patch.object(preparation, "urlopen", return_value=io.StringIO(json.dumps({"viewers": 1}))) as opened:
            self.assertTrue(preparation.reattached("http://127.0.0.1:12345/?lang=ko", wait=1))
        self.assertEqual(opened.call_args[0][0], "http://127.0.0.1:12345/status")


class Cli(Case):
    """진짜 bin/prevue — 덤프가 없는 모듈이라 승인이 드는 warmup 이 next 다. 데몬을 띄우지 않는다."""

    def setUp(self):
        super().setUp()
        self.r = self.repo(":app")
        os.chmod(os.path.join(self.r.root, "gradlew"), 0o755)
        self.file = self.r.src(":app")
        self.r.built(":app", "debug")
        self.home = os.path.join(self.tmp.name, "home")
        os.makedirs(self.home)
        self.jdk = os.path.join(self.tmp.name, "jdk")      # 이 테스트는 데몬을 띄우지 않는다 — java 가 있다는 것만 보이면 된다
        os.makedirs(os.path.join(self.jdk, "bin"))
        java = os.path.join(self.jdk, "bin", "java")
        open(java, "w").close()
        os.chmod(java, 0o755)

    def run_cli(self, *args):
        env = dict(os.environ, HOME=self.home, PREVUE_HOME=os.path.join(self.home, ".prevue"), PREVUE_JDK=self.jdk)
        env.pop("PREVUE_LANG", None)
        p = subprocess.run([str(ROOT / "bin/prevue"), *args], capture_output=True, text=True, cwd=self.tmp.name, env=env)
        return json.loads(p.stdout), p.returncode

    def test_health_의_next_에_언어가_실린다(self):
        out, code = self.run_cli("health", self.file, "--lang", "ko")
        self.assertEqual(code, 1, out)
        self.assertTrue(out["next"].startswith("prevue "), out)
        self.assertTrue(out["next"].endswith(" --lang ko"), out["next"])

    def test_show_로_시작하면_승인_뒤_칠_명령에도_언어가_실린다(self):
        out, code = self.run_cli("show", "--lang", "ko", self.file)
        self.assertEqual(code, 3, out)
        self.assertIn("ask", out)
        for key in ("next", "then"):
            if out.get(key, "").startswith("prevue warmup "):
                self.assertEqual(out[key].split()[-3:].count("--show") + out[key].split()[-3:].count("--lang"), 2, out[key])
                self.assertIn(" --lang ko", out[key])
                break
        else:
            self.fail("warmup 명령이 없다: %s" % out)

    def test_언어가_없으면_명령은_그대로다(self):
        out, _ = self.run_cli("health", self.file)
        self.assertNotIn("--lang", out["next"])

    def test_언어_태그가_아니면_이유를_말한다(self):
        out, code = self.run_cli("health", self.file, "--lang", 'k"o')
        self.assertEqual(code, 2)
        self.assertIn("--lang", out["error"])

    def test_명령_앞의_언어도_받는다(self):
        out, _ = self.run_cli("--lang", "ko", "health", self.file)
        self.assertTrue(out["next"].endswith(" --lang ko"), out["next"])

    def test_셸의_로캘은_명령을_막지_않는다(self):
        env = dict(os.environ, HOME=self.home, PREVUE_LANG="ko_KR.UTF-8")
        p = subprocess.run([str(ROOT / "bin/prevue"), "health", self.file], capture_output=True, text=True, env=env)
        self.assertNotIn("--lang", json.loads(p.stdout)["next"])

    def test_셸이_지은_next_에도_언어가_실린다(self):
        out, code = self.run_cli("setup", self.file, "--lang", "ko")
        self.assertEqual((code, out["next"]), (2, "prevue warmup %s --lang ko" % self.file))

if __name__ == "__main__":
    unittest.main()
