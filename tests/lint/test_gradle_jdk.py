"""도구 자신의 Gradle 을 띄울 JDK 고르기와 detekt 실패 안내 — tools/lint.sh 가 판정 전에 먼저 돌린다."""

import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "tools", "lint"))
import gradle_jdk  # noqa: E402
import lint  # noqa: E402


class GradleJavaHome(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)

    def jdk(self, name, version=None):
        home = os.path.join(self.tmp.name, "jvms", name)
        os.makedirs(os.path.join(home, "bin"))
        java = os.path.join(home, "bin", "java")
        with open(java, "w") as f:
            f.write("#!/bin/sh\n")
        os.chmod(java, 0o755)
        if version:
            with open(os.path.join(home, "release"), "w") as f:
                f.write('JAVA_VERSION="%s"\n' % version)
        return home

    def env(self, **kw):
        # 이 머신의 진짜 설치본을 보지 않게 찾는 자리를 임시 폴더로 바꾼다
        return dict({"PREVUE_JDK_SEARCH": os.path.join(self.tmp.name, "jvms", "*"), "PATH": ""}, **kw)

    def test_shell_jdk_21_or_newer_is_kept(self):
        self.jdk("jdk-25", "25.0.2")
        self.assertIsNone(gradle_jdk.gradle_java_home(self.env(JAVA_HOME=self.jdk("jdk-21", "21.0.8"))))

    def test_shell_jdk_17_is_replaced_by_found_21(self):
        jdk17 = self.jdk("jdk-17", "17.0.2")
        jdk21 = self.jdk("jdk-21", "21.0.8")
        self.assertEqual(gradle_jdk.gradle_java_home(self.env(JAVA_HOME=jdk17)), jdk21)

    def test_unknown_shell_jdk_is_replaced(self):
        # macOS 의 /usr/bin/java 스텁처럼 release 가 없으면 판을 모른다 — 고른다
        stub = self.jdk("stub")
        jdk21 = self.jdk("jdk-21", "21.0.8")
        found = gradle_jdk.gradle_java_home(self.env(), which=lambda *_a, **_k: os.path.join(stub, "bin", "java"))
        self.assertEqual(found, jdk21)

    def test_prevue_jdk_wins_over_search(self):
        jdk17 = self.jdk("jdk-17", "17.0.2")
        self.jdk("jdk-21", "21.0.8")
        self.assertEqual(gradle_jdk.gradle_java_home(self.env(JAVA_HOME=jdk17, PREVUE_JDK="/chosen")), "/chosen")

    def test_nothing_usable_leaves_shell_alone(self):
        jdk17 = self.jdk("jdk-17", "17.0.2")
        self.assertIsNone(gradle_jdk.gradle_java_home(self.env(JAVA_HOME=jdk17)))
        self.assertEqual(gradle_jdk.gradle_env(self.env(JAVA_HOME=jdk17))["JAVA_HOME"], jdk17)


class DetektHint(unittest.TestCase):
    METRO = "> Dependency requires at least JVM runtime version 21. This build uses a Java 17 JVM."

    def test_jvm_version_failure_points_at_jdk_not_download(self):
        hint = lint.detekt_hint(self.METRO, offline=True)
        self.assertIn("JDK 21", hint)
        self.assertNotIn("--online", hint)


if __name__ == "__main__":
    unittest.main()
