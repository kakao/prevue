"""데몬 JDK 판정 — 진짜 bin/prevue health 가 PREVUE_JDK 의 release 를 읽어 21 미만을 jdk 없음으로 말하는가.
데몬을 띄우지 않는다. 실행: python3 -m unittest discover -s tests/cli
"""

import json
import os
from pathlib import Path
import subprocess
import unittest

from test_plan import Case, fake_jdk, fake_sdk

ROOT = Path(__file__).resolve().parents[2] / "plugin"


class JdkCase(Case):
    def setUp(self):
        super().setUp()
        self.r = self.repo(":app")
        os.chmod(os.path.join(self.r.root, "gradlew"), 0o755)
        self.file = self.r.src(":app")
        self.r.built(":app", "debug")
        self.home = os.path.join(self.tmp.name, "home")
        os.makedirs(self.home)
        self.sdk = fake_sdk(os.path.join(self.tmp.name, "sdk"))

    def jdk(self, name, version=None):
        return fake_jdk(os.path.join(self.tmp.name, name), version)


class DaemonJdk(JdkCase):
    def health(self, jdk):
        env = dict(os.environ, HOME=self.home, PREVUE_HOME=os.path.join(self.home, ".prevue"), PREVUE_JDK=jdk,
                   ANDROID_HOME=self.sdk)
        # Codex 샌드박스 안에서 돌면 sandbox 가 missing 첫 자리를 차지한다 — 이 테스트가 보는 것은 jdk 다
        for k in ("PREVUE_LANG", "CODEX_SANDBOX", "CODEX_SANDBOX_NETWORK_DISABLED"):
            env.pop(k, None)
        p = subprocess.run([str(ROOT / "bin/prevue"), "health", self.file], capture_output=True, text=True,
                           cwd=self.tmp.name, env=env)
        return json.loads(p.stdout)

    def test_21_미만은_없는_것으로_말하고_찾은_버전을_싣는다(self):
        for version, major in (("17.0.12", "17"), ("1.8.0_392", "8")):
            jdk = self.jdk("jdk" + major, version)
            out = self.health(jdk)
            self.assertEqual((out["missing"][0], out["jdk"], out["jdkVersion"]), ("jdk", jdk, major), out)

    def test_사람에게는_찾은_버전을_먼저_말한다(self):
        out = self.health(self.jdk("jdk17", "17.0.12"))
        self.assertIn("is Java 17.", out["tell"])
        self.assertIn("PREVUE_JDK", out["tell"])

    def test_JAVA_VERSION_이_둘이면_첫_줄을_본다(self):
        jdk = self.jdk("jdk-twice")
        with open(os.path.join(jdk, "release"), "w") as f:
            f.write('JAVA_VERSION="21.0.5"\nJAVA_VERSION="21.0.5"\n')
        out = self.health(jdk)
        self.assertNotIn("jdk", out["missing"], out)

    def test_21_이상은_통과한다(self):
        for version in ("21.0.5", "25"):
            out = self.health(self.jdk("jdk-" + version, version))
            self.assertNotIn("jdk", out["missing"], out)

    # 지킬 것: 버전을 모르면 막지 않는다 — release 없는 배포판을 잘못 막으면 프리뷰를 아예 못 띄운다
    def test_release_가_없으면_존재만_본다(self):
        out = self.health(self.jdk("jdk-unknown"))
        self.assertNotIn("jdk", out["missing"], out)

    def test_java_가_없으면_없다고_말한다(self):
        out = self.health(os.path.join(self.tmp.name, "nowhere"))
        self.assertEqual(out["missing"][0], "jdk")
        self.assertNotIn("jdkVersion", out)
        self.assertNotIn("jdkSearched", out)


class FoundJdk(JdkCase):
    """PREVUE_JDK 없이 — 흔한 설치 자리를 찾는다(D-130). PREVUE_JDK_SEARCH 로 자리를 이 테스트의 폴더로 바꿔
    이 머신의 진짜 설치본(AS · Homebrew)을 보지 않는다."""

    def health(self, jdk=None):
        env = dict(os.environ, HOME=self.home, PREVUE_HOME=os.path.join(self.home, ".prevue"), ANDROID_HOME=self.sdk,
                   PREVUE_JDK_SEARCH=os.path.join(self.tmp.name, "jvms", "*"))
        for k in ("PREVUE_JDK", "PREVUE_LANG", "CODEX_SANDBOX", "CODEX_SANDBOX_NETWORK_DISABLED"):
            env.pop(k, None)
        p = subprocess.run([str(ROOT / "bin/prevue"), "health", self.file], capture_output=True, text=True,
                           cwd=self.tmp.name, env=env)
        return json.loads(p.stdout)

    def test_아무것도_없으면_다_찾아봤다고_말하고_brew_명령을_준다(self):
        out = self.health()
        self.assertEqual((out["missing"][0], out.get("jdkSearched")), ("jdk", True), out)
        self.assertIn("none was found", out["tell"])
        self.assertIn("brew install openjdk@25", out["tell"])
        self.assertIn("about a second faster", out["tell"])

    def test_안내대로_깐_뒤_같은_명령이_그_JDK_를_찾는다(self):
        self.assertEqual(self.health()["missing"][0], "jdk")
        self.jdk("jvms/openjdk@25", "25.0.5")
        out = self.health()
        self.assertNotIn("jdk", out["missing"], out)

    def test_start_도_다_찾아봤다고_말한다(self):
        p = subprocess.run(["python3", str(ROOT / "bin/prevue_plan.py"), "runtime-missing", "/nowhere", "", "", "none"],
                           capture_output=True, text=True)
        out = json.loads(p.stdout)
        self.assertEqual((out["missing"], out["jdkSearched"]), (["jdk"], True), out)
        self.assertIn("brew install openjdk@25", out["tell"])

    def test_21_미만만_찾으면_그_판을_말한다(self):
        old = self.jdk("jvms/corretto-18", "18.0.2")
        out = self.health()
        self.assertEqual((out["missing"][0], out["jdk"], out["jdkVersion"]), ("jdk", old, "18"), out)
        self.assertNotIn("jdkSearched", out)


if __name__ == "__main__":
    unittest.main()
