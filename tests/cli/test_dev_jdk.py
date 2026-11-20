"""tools/dev_jdk.py — 개발 검사가 데몬 빌드를 돌릴 JDK. 실행: python3 -m unittest discover -s tests/cli"""

import os
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
sys.path.insert(0, os.path.join(ROOT, "tools"))
import dev_jdk  # noqa: E402

from test_plan import fake_jdk  # noqa: E402


class DevJdk(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        # 이 머신의 진짜 설치본을 보지 않게 찾는 자리를 임시 폴더로 바꾼다
        self.env = {"HOME": self.tmp.name, "PREVUE_JDK_SEARCH": os.path.join(self.tmp.name, "jvms", "*")}

    def jdk(self, name, version):
        return fake_jdk(os.path.join(self.tmp.name, name), version)

    def test_JAVA_HOME_이_21_이상이면_그대로_쓴다(self):
        self.jdk("jvms/openjdk-25", "25.0.5")
        mine = self.jdk("mine", "21.0.8")
        self.assertEqual(dev_jdk.choose(dict(self.env, JAVA_HOME=mine)), (mine, None))

    def test_JAVA_HOME_이_17_이면_찾은_21_이상으로_가고_그렇다고_알린다(self):
        found = self.jdk("jvms/openjdk-25", "25.0.5")
        old = self.jdk("jbr-17", "17.0.14")
        home, note = dev_jdk.choose(dict(self.env, JAVA_HOME=old))
        self.assertEqual(home, found)
        self.assertIn("17.0.14", note)

    def test_JAVA_HOME_이_없으면_없다고_알린다(self):
        found = self.jdk("jvms/openjdk-25", "25.0.5")
        home, note = dev_jdk.choose(self.env)
        self.assertEqual(home, found)
        self.assertIn("JAVA_HOME 이 없어", note)

    def test_21_이상이_없으면_무엇을_깔지_말하고_2_로_끝난다(self):
        old = self.jdk("jvms/jbr-17", "17.0.14")
        env = dict(os.environ, **self.env)
        env.pop("PREVUE_JDK", None)
        env["JAVA_HOME"] = old
        r = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "dev_jdk.py")],
                           env=env, capture_output=True, text=True)
        self.assertEqual((r.returncode, r.stdout), (2, ""))
        self.assertIn("JDK 21 이상이 필요하다", r.stderr)
        self.assertIn("17.0.14", r.stderr)


if __name__ == "__main__":
    unittest.main()
