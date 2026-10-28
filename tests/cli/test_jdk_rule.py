"""bin/jdk_rule.py — warmup 이 Gradle 을 부를 JDK. 실행: python3 -m unittest discover -s tests/cli"""

import os
import shutil
import sys
import tempfile
import time
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "plugin", "bin"))
import jdk_rule  # noqa: E402


PS = """\
  101 Mon Sep 28 15:08:12 2026     /opt/homebrew/Cellar/openjdk@17/17.0.17/libexec/openjdk.jdk/Contents/Home/bin/java -Xmx4g -cp /x/gradle-daemon-main-9.7.0.jar org.gradle.launcher.daemon.bootstrap.GradleDaemon 9.7.0
  202 Mon Sep 28 15:23:27 2026     /Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/java -Xmx4g -cp /x/gradle-daemon-main-9.7.0.jar org.gradle.launcher.daemon.bootstrap.GradleDaemon 9.7.0
  303 Mon Sep 28 16:00:00 2026     /usr/lib/jvm/other/bin/java -cp /x/gradle-daemon-main-8.14.jar org.gradle.launcher.daemon.bootstrap.GradleDaemon 8.14
  404 Mon Sep 28 16:10:00 2026     /usr/bin/python3 something
"""
HOMEBREW = "/opt/homebrew/Cellar/openjdk@17/17.0.17/libexec/openjdk.jdk/Contents/Home"
JBR = "/Applications/Android Studio.app/Contents/jbr/Contents/Home"


class GradleJdk(unittest.TestCase):
    def test_데몬을_읽는다(self):
        ds = jdk_rule.parse_daemons(PS, "9.7.0")
        self.assertEqual([(d[0], d[2]) for d in ds], [(101, HOMEBREW), (202, JBR)])

    def test_다른_Gradle_버전의_데몬은_안_본다(self):
        self.assertEqual([d[0] for d in jdk_rule.parse_daemons(PS, "8.14")], [303])

    def test_한국어_로캘의_lstart_는_버린다(self):
        # 셸이 LC_ALL=C 로 부르지만, 새어 들어와도 틀린 시각으로 고르지 않는다
        ko = "  101 2026년  9월 28일 월요일 15시 08분 12초 %s/bin/java org.gradle.launcher.daemon.bootstrap.GradleDaemon 9.7.0" % HOMEBREW
        self.assertEqual(jdk_rule.parse_daemons(ko, "9.7.0"), [])

    def test_로그에서_이_저장소를_마지막으로_빌드한_시각(self):
        log = (LOG_LINE % ("2026-09-28T15:08:30", "/w/repo")
               + LOG_LINE % ("2026-09-28T15:20:00", "/w/other")
               + LOG_LINE % ("2026-09-28T15:30:00", "/w/repo/app"))   # 저장소 아래 디렉터리도 그 저장소다
        when = jdk_rule.last_repo_build(log, "/w/repo")
        self.assertEqual(time.strftime("%H:%M:%S", time.localtime(when)), "15:30:00")

    def test_줄머리에_시각이_없는_빌드는_세지_않는다(self):
        log = "  " + LOG_LINE % ("2026-09-28T15:08:30", "/w/repo") + "Received command: Build{id=1, currentDir=/w/repo}.\n"
        self.assertIsNone(jdk_rule.last_repo_build(log, "/w/repo"))

    def test_이_저장소를_빌드하지_않은_데몬은_없다(self):
        # VS Code Java 확장의 데몬은 버전만 같다 — 이 저장소를 빌드한 적이 없다(실측)
        self.assertIsNone(jdk_rule.last_repo_build(LOG_LINE % ("2026-09-28T16:05:17", "/x/vscode-gradle/lib"), "/w/repo"))

    def test_기준_시각_이전의_마지막_빌드(self):
        log = LOG_LINE % ("2026-09-28T09:35:00", "/w/repo") + LOG_LINE % ("2026-09-28T14:49:00", "/w/repo")
        ref = time.mktime(time.strptime("2026-09-28 09:50:12", "%Y-%m-%d %H:%M:%S"))
        when = jdk_rule.last_repo_build(log, "/w/repo", ref)
        self.assertEqual(time.strftime("%H:%M:%S", time.localtime(when)), "09:35:00")

    def test_로그_머리의_javaHome(self):
        self.assertEqual(jdk_rule.daemon_java_home(context_line(JBR)), JBR)
        self.assertIsNone(jdk_rule.daemon_java_home(LOG_LINE % ("2026-09-28T09:35:00", "/w/repo")))

    def test_이_저장소를_가장_최근에_빌드한_데몬(self):
        home, src = jdk_rule.choose([(101, 2000.0, HOMEBREW), (202, 1000.0, JBR)], None, alive=[101])
        self.assertEqual(home, HOMEBREW)
        self.assertIn("101", src)
        self.assertNotIn("stopped", src)

    def test_내려간_데몬도_고른다(self):
        # 이슈 #4: 개발자 데몬이 idle 3시간으로 내려간 뒤에도 그 JDK 로 구운 산출물은 남아 있다
        home, src = jdk_rule.choose([(101, 2000.0, HOMEBREW)], JBR, alive=[])
        self.assertEqual(home, HOMEBREW)
        self.assertIn("stopped", src)

    def test_로그가_없으면_지난번_JDK(self):
        self.assertEqual(jdk_rule.choose([], JBR), (JBR, "the JDK Prevue used last time"))

    def test_아무것도_없으면_비운다(self):
        self.assertEqual(jdk_rule.choose([], None), (None, None))


class RepoBuilds(unittest.TestCase):
    """이슈 #4 의 타임라인을 로그 파일로 재현한다."""

    def setUp(self):
        self.dir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.dir)

    def log(self, pid, home, builds, mtime, started="2026-09-28T09:35:00"):
        p = os.path.join(self.dir, "daemon-%d.out.log" % pid)
        with open(p, "w") as f:
            f.write(context_line(home, started) + "".join(LOG_LINE % b for b in builds))
        os.utime(p, (mtime, mtime))

    def at(self, hms):
        return time.mktime(time.strptime("2026-09-28 " + hms, "%Y-%m-%d %H:%M:%S"))

    def test_마지막_컴파일을_구운_데몬(self):
        self.log(76560, HOMEBREW, [("2026-09-28T09:35:00", "/w/repo")], self.at("12:54:00"))   # 개발자, 내려감
        self.log(51004, JBR, [("2026-09-28T14:49:00", "/w/repo")], self.at("14:55:00"))       # 컴파일 없이 끝난 warmup
        ds = jdk_rule.repo_builds(self.dir, "/w/repo", before=self.at("09:50:12"))
        self.assertEqual(jdk_rule.choose(ds, JBR)[0], HOMEBREW)

    def test_Prevue_가_마지막으로_구웠으면_그_JDK(self):
        # warmup 이 JBR 로 다시 컴파일했다면 디스크의 산출물은 JBR 것이다 — 그것을 재사용해야 2초로 끝난다(이슈 #4 실측)
        self.log(76560, HOMEBREW, [("2026-09-28T09:35:00", "/w/repo")], self.at("12:54:00"))
        self.log(51004, JBR, [("2026-09-28T14:49:00", "/w/repo")], self.at("14:55:00"))
        ds = jdk_rule.repo_builds(self.dir, "/w/repo", before=self.at("14:55:00"))
        self.assertEqual(jdk_rule.choose(ds, None)[0], JBR)

    def test_기준_시각_뒤에_뜬_데몬의_로그는_열지_않는다(self):
        # 실제 로그라면 첫 줄 뒤의 빌드가 첫 줄보다 이를 수 없다 — 어긋나게 심어 열지 않았음을 본다
        self.log(76560, HOMEBREW, [("2026-09-28T09:35:00", "/w/repo")], self.at("12:54:00"))
        self.log(51004, JBR, [("2026-09-28T09:40:00", "/w/repo")], self.at("14:55:00"), started="2026-09-28T14:00:00")
        ds = jdk_rule.repo_builds(self.dir, "/w/repo", before=self.at("09:50:12"))
        self.assertEqual([d[0] for d in ds], [76560])

    def test_기준_시각이_없으면_가장_최근_빌드(self):
        self.log(76560, HOMEBREW, [("2026-09-28T09:35:00", "/w/repo")], self.at("12:54:00"))
        self.log(303, JBR, [("2026-09-28T16:05:00", "/x/vscode-gradle/lib")], self.at("16:06:00"))   # 남의 저장소
        self.assertEqual(jdk_rule.choose(jdk_rule.repo_builds(self.dir, "/w/repo"), None)[0], HOMEBREW)


def context_line(home, at="2026-09-28T09:35:00"):
    return ("%s.787+0900 [INFO] [org.gradle.launcher.daemon.server.Daemon] start() called on daemon - "
            "DefaultDaemonContext[uid=45d8dc00,javaHome=%s,javaVersion=25,pid=1,idleTimeout=10800000]\n" % (at, home))


LOG_LINE = ("%s.788+0900 [INFO] [org.gradle.launcher.daemon.server.DefaultIncomingConnectionHandler] "
            "Received command: Build{id=83dcdfb5, currentDir=%s}.\n")


if __name__ == "__main__":
    unittest.main()
