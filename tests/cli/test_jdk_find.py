"""bin/jdk_find.py — PREVUE_JDK 가 없을 때 데몬 JDK 를 고른다. 실행: python3 -m unittest discover -s tests/cli"""

import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "plugin", "bin"))
import jdk_find  # noqa: E402

from test_plan import fake_jdk  # noqa: E402


class JdkFind(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)

    def jdk(self, name, version=None):
        return fake_jdk(os.path.join(self.tmp.name, name), version)

    def pattern(self, *parts):
        return os.path.join(self.tmp.name, *parts)

    def test_AS_의_JBR_이_21_이상이면_더_새_판이_있어도_그것을_쓴다(self):
        jbr = self.jdk("as/jbr", "21.0.8")
        self.jdk("jvms/openjdk-25", "25.0.5")
        self.assertEqual(jdk_find.find([jbr], [self.pattern("jvms/*")]), (jbr, "ok"))

    def test_AS_의_JBR_이_17_이면_발견한_JDK_로_간다(self):
        jbr = self.jdk("as/jbr", "17.0.11")
        brew = self.jdk("jvms/openjdk-25", "25.0.5")
        self.assertEqual(jdk_find.find([jbr], [self.pattern("jvms/*")]), (brew, "ok"))

    def test_25_를_먼저_그다음_21_부터_24_마지막에_26_이상(self):
        for versions, want in (
            (("21.0.13", "25.0.2", "27.0.1"), "25.0.2"),
            (("21.0.13", "24.0.1", "27.0.1"), "24.0.1"),
            (("27.0.1", "26"), "26"),
            (("25.0.2", "25.0.5"), "25.0.5"),
        ):
            with self.subTest(versions=versions):
                base = "set-" + "-".join(versions)
                for v in versions:
                    self.jdk(os.path.join(base, v), v)
                home, state = jdk_find.find([], [self.pattern(base, "*")])
                self.assertEqual((os.path.basename(home), state), (want, "ok"))

    def test_판을_모르는_JDK_는_판을_아는_것보다_뒤다(self):
        self.jdk("jvms/a-unknown")
        known = self.jdk("jvms/b-21", "21.0.13")
        self.assertEqual(jdk_find.find([], [self.pattern("jvms/*")]), (known, "ok"))

    def test_판을_모르는_JDK_만_있으면_막지_않는다(self):
        unknown = self.jdk("jvms/unknown")
        self.assertEqual(jdk_find.find([], [self.pattern("jvms/*")]), (unknown, "ok"))

    # 지킬 것: java_home -v 21+ 는 맞는 것이 없으면 18 을 돌려줬다 — 21 미만은 고르지 않고 낮은 판으로 말한다
    def test_21_미만만_있으면_그중_가장_높은_판을_낮다고_말한다(self):
        self.jdk("jvms/corretto-11", "11.0.18")
        high = self.jdk("jvms/corretto-18", "18.0.2")
        self.jdk("jvms/adopt-8", "1.8.0_292")
        self.assertEqual(jdk_find.find([], [self.pattern("jvms/*")]), (high, "old"))

    def test_아무것도_없으면_처음_본_자리를_none_으로(self):
        self.assertEqual(jdk_find.find(["/nowhere/jbr"], [self.pattern("jvms/*")]), ("/nowhere/jbr", "none"))

    def test_java_가_없는_폴더는_JDK_가_아니다(self):
        os.makedirs(self.pattern("jvms/empty"))
        self.assertEqual(jdk_find.find([], [self.pattern("jvms/*")])[1], "none")

    def test_같은_JDK_를_가리키는_링크는_한_번만_본다(self):
        real = self.jdk("cellar/openjdk-25", "25.0.5")
        os.makedirs(self.pattern("opt"))
        os.symlink(real, self.pattern("opt", "openjdk@25"))
        os.symlink(real, self.pattern("opt", "openjdk"))
        home, state = jdk_find.find([], [self.pattern("opt", "*")])
        self.assertEqual((os.path.realpath(home), state), (os.path.realpath(real), "ok"))

    def test_brew_install_openjdk_at_25_가_까는_자리를_본다(self):
        prefix = self.pattern("homebrew")
        home = self.jdk("homebrew/opt/openjdk@25/libexec/openjdk.jdk/Contents/Home", "25.0.5")
        prefer, found = jdk_find.search_places({"HOME": self.pattern("home"), "HOMEBREW_PREFIX": prefix})
        self.assertEqual(jdk_find.find([], found), (home, "ok"))

    def test_사용자_폴더의_JavaVirtualMachines_와_SDKMAN_을_본다(self):
        user = self.jdk("home/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home", "21.0.13")
        sdkman = self.jdk("home/.sdkman/candidates/java/25.0.5-tem", "25.0.5")
        prefer, found = jdk_find.search_places({"HOME": self.pattern("home"), "HOMEBREW_PREFIX": self.pattern("nobrew")})
        self.assertIn(self.pattern("home", jdk_find.AS_JBR), prefer)
        homes = [jdk_find.find([], [p])[0] for p in found]
        self.assertIn(user, homes)
        self.assertIn(sdkman, homes)

    def test_JAVA_HOME_도_후보다(self):
        home = self.jdk("java-home", "21.0.13")
        prefer, found = jdk_find.search_places({"HOME": self.pattern("home"), "JAVA_HOME": home,
                                                "HOMEBREW_PREFIX": self.pattern("nobrew")})
        self.assertEqual(found[0], home)

    def test_PREVUE_JDK_SEARCH_가_자리를_모두_바꾼다(self):
        self.assertEqual(jdk_find.search_places({"HOME": "/h", "PREVUE_JDK_SEARCH": "/a/*:/b"}), ([], ["/a/*", "/b"]))

    def test_release_의_판을_읽는다(self):
        for written, want in (("25.0.5", (25, 0, 5)), ("1.8.0_292", (8, 0, 292)), ("21", (21,))):
            self.assertEqual(jdk_find.version(self.jdk("v-" + written, written)), want)
        self.assertIsNone(jdk_find.version(self.jdk("v-none")))


if __name__ == "__main__":
    unittest.main()
