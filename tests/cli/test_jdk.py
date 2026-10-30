"""데몬 JDK 판정 — 진짜 bin/prevue health 가 PREVUE_JDK 의 release 를 읽어 21 미만을 jdk 없음으로 말하는가.
데몬을 띄우지 않는다. 실행: python3 -m unittest discover -s tests/cli
"""

import json
import os
from pathlib import Path
import subprocess
import unittest

from test_plan import Case

ROOT = Path(__file__).resolve().parents[2] / "plugin"


class DaemonJdk(Case):
    def setUp(self):
        super().setUp()
        self.r = self.repo(":app")
        os.chmod(os.path.join(self.r.root, "gradlew"), 0o755)
        self.file = self.r.src(":app")
        self.r.built(":app", "debug")
        self.home = os.path.join(self.tmp.name, "home")
        os.makedirs(self.home)

    def jdk(self, name, version=None):
        d = os.path.join(self.tmp.name, name)
        os.makedirs(os.path.join(d, "bin"))
        java = os.path.join(d, "bin", "java")
        open(java, "w").close()
        os.chmod(java, 0o755)
        if version is not None:
            with open(os.path.join(d, "release"), "w") as f:
                f.write('IMPLEMENTOR="test"\nJAVA_VERSION="%s"\n' % version)
        return d

    def health(self, jdk):
        env = dict(os.environ, HOME=self.home, PREVUE_HOME=os.path.join(self.home, ".prevue"), PREVUE_JDK=jdk)
        env.pop("PREVUE_LANG", None)
        p = subprocess.run([str(ROOT / "bin/prevue"), "health", self.file], capture_output=True, text=True,
                           cwd=self.tmp.name, env=env)
        return json.loads(p.stdout)

    def test_21_미만은_없는_것으로_말하고_찾은_버전을_싣는다(self):
        for version, major in (("17.0.12", "17"), ("1.8.0_392", "8")):
            jdk = self.jdk("jdk" + major, version)
            out = self.health(jdk)
            self.assertEqual((out["missing"][0], out["jdk"], out["jdkVersion"]), ("jdk", jdk, major), out)

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


if __name__ == "__main__":
    unittest.main()
