"""bin/daemon_records.py — 데몬 기록이 살아 있는 데몬을 가리키는가. 실행: python3 -m unittest discover -s tests/cli

판정(state)은 kill -0 · 명령줄을 주입해 본다. 끝의 CLI 묶음은 PREVUE_HOME 을 임시 디렉터리로 돌려 진짜 bin/prevue 를 친다 —
재부팅 뒤 남은 기록이 남의 pid 를 산 데몬으로 읽어 networkBlocked 를 내던 회귀(2026-10-05)를 그대로 재현한다.
"""

import itertools
import json
import os
import re
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "plugin", "bin"))
import daemon_records as R  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "plugin"))
BOOT = 1791192312.0   # 실측 머신의 부팅 시각(2026-10-05 18:25:12 KST)
DAY = 86400
JAVA = "/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/java"
DAEMON = JAVA + " -Xmx3g -cp /p/prevue.jar prevue.daemon.MainKt --layoutlib /a b/layoutlib --port %s --root /w"
SPARE = itertools.count(20000 + os.getpid() % 5000)


def free_port():
    """아무도 듣지 않는 포트. 샌드박스가 소켓을 막으면 번호만 고른다 — 거기서는 curl 도 막혀 어차피 닿지 않는다."""
    try:
        with socket.socket() as s:
            s.bind(("127.0.0.1", 0))
            return s.getsockname()[1]
    except OSError:
        return next(SPARE)


def prevue_env(home, **extra):
    env = {k: v for k, v in os.environ.items() if k != "PREVUE_PORT"}
    env.update(PREVUE_HOME=home, NO_OPEN="1", **extra)
    return env


def kill_says(answer):
    return lambda pid: answer


def command_is(text):
    return lambda pid: text


class State(unittest.TestCase):
    def state(self, kill, command, mtime=BOOT + 3600, text="419\n", port=49319):
        return R.state(text, port, mtime, BOOT, kill, command)

    # 실측: daemon-49319.pid = 419 가 재부팅 뒤 root 의 systemsoundserverd 다 — kill -0 은 EPERM 이라 여태 산 데몬이었다
    def test_재부팅_뒤_root_가_물려받은_pid_는_데몬이_아니다(self):
        self.assertEqual(self.state(kill_says("eperm"), command_is("/usr/sbin/systemsoundserverd"), BOOT - DAY), "gone")

    def test_명령줄을_못_읽는_샌드박스에서는_부팅_전_기록이라_죽은_것이다(self):
        self.assertEqual(self.state(kill_says("eperm"), command_is(None), BOOT - DAY), "stale")

    # 실측: daemon-58588.pid = 18961 은 status 23초 전에 끝난 같은 사용자의 codesign 이었는데(통합 로그) kill -0 이 성공했다 — 거두기 전의 좀비로 본다
    def test_같은_사용자가_물려받은_pid_도_데몬이_아니다(self):
        self.assertEqual(self.state(kill_says("ok"), command_is("<defunct>"), text="18961\n", port=58588), "gone")

    def test_그_포트의_데몬이면_산다(self):
        self.assertEqual(self.state(kill_says("ok"), command_is(DAEMON % 49319)), "daemon")

    def test_다른_자리의_데몬이_물려받은_pid_는_이_자리의_것이_아니다(self):
        self.assertEqual(self.state(kill_says("ok"), command_is(DAEMON % 8792)), "gone")

    # 지킬 것: Codex seatbelt 는 샌드박스 밖에서 띄운 데몬에 kill -0 을 EPERM 으로 거부하고 ps 를 막는다.
    # 이번 부팅의 기록이면 무엇인지 몰라도 산 것으로 둔다 — 죽은 것으로 보면 같은 자리에 둘째 데몬을 띄운다.
    def test_샌드박스_밖에서_띄운_데몬은_못_봐도_산_것이다(self):
        self.assertEqual(self.state(kill_says("eperm"), command_is(None)), "unknown")

    def test_명령줄이_데몬이면_쓴_시각이_어긋나도_산다(self):
        self.assertEqual(self.state(kill_says("ok"), command_is(DAEMON % 49319), BOOT - DAY), "daemon")

    def test_부팅_직후의_시계_조정은_부팅_전으로_읽지_않는다(self):
        self.assertEqual(self.state(kill_says("eperm"), command_is(None), BOOT - R.BOOT_SLACK + 1), "unknown")

    def test_부팅_시각을_모르면_시각으로_가르지_않는다(self):
        self.assertEqual(R.state("419", 49319, BOOT - DAY, None, kill_says("eperm"), command_is(None)), "unknown")

    def test_없는_pid(self):
        self.assertEqual(self.state(kill_says("esrch"), command_is(DAEMON % 49319)), "gone")

    def test_명령줄을_읽는_사이에_끝났다(self):
        answers = iter(["ok", "esrch"])
        self.assertEqual(self.state(lambda pid: next(answers), command_is(None)), "gone")

    def test_pid_가_아니면_죽은_것(self):
        for text in ("", "\n", "abc", "0", "-1"):
            with self.subTest(text=text):
                self.assertEqual(self.state(kill_says("ok"), command_is(DAEMON % 49319), text=text), "gone")

    def test_pid_로_쓸_수_없는_큰_수는_없는_것(self):
        self.assertEqual(R.signal0(99999999999), "esrch")

    def test_명령줄의_낱말로_가른다(self):
        self.assertTrue(R.ours(DAEMON % 8792, 8792))
        self.assertFalse(R.ours(DAEMON % 8792, 879))
        self.assertFalse(R.ours("vim /w/src/prevue/daemon/MainKt.kt --port 8792", 8792))
        self.assertFalse(R.ours(JAVA + " prevue.daemon.MainKt --root /w", 8792))

    # --port 08792 도 8792 자리다 — 데몬은 toInt, curl 도 10진으로 읽는다. 글자로 견주면 닿지 못하는 그 산 데몬을 죽은 것으로 읽는다
    def test_포트는_수로_견준다(self):
        self.assertTrue(R.ours(DAEMON % "08792", 8792))
        self.assertFalse(R.ours(DAEMON % "8792x", 8792))


class Scan(unittest.TestCase):
    """기록 디렉터리를 훑는다. 산 데몬일 수 있는 것만 싣고, clean 이면 부팅 전의 죽은 기록만 지운다."""

    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.dir)

    def record(self, port, pid, mtime):
        path = os.path.join(self.dir, "daemon-%s.pid" % port)
        with open(path, "w") as f:
            f.write("%s\n" % pid)
        os.utime(path, (mtime, mtime))
        with open(os.path.join(self.dir, "daemon-%s.log" % port), "w") as f:
            f.write("log\n")
        return path

    # pid 마다 관찰을 정해 둔다: (kill -0, 명령줄)
    WORLD = {
        419: ("eperm", "/usr/sbin/systemsoundserverd"),   # 부팅 전 기록 · root 가 물려받았다
        420: ("eperm", None),                             # 부팅 전 기록 · 무엇인지 못 본다
        98785: ("esrch", None),                           # 부팅 전 기록 · 없는 pid
        16616: ("esrch", None),                           # 이번 부팅 · 끝난 데몬
        501: ("ok", DAEMON % 8792),                       # 이번 부팅 · 산 데몬
        502: ("eperm", None),                             # 이번 부팅 · 샌드박스 밖의 데몬
        503: ("ok", DAEMON % "08794"),                    # 이번 부팅 · 0 으로 시작하는 포트로 띄운 산 데몬
    }

    def scan(self, **kw):
        return R.scan(self.dir, boot=BOOT, kill=lambda pid: self.WORLD[pid][0], command=lambda pid: self.WORLD[pid][1], **kw)

    def fill(self):
        return {
            "root": self.record(49319, 419, BOOT - DAY), "blind": self.record(49320, 420, BOOT - DAY),
            "old": self.record(49986, 98785, BOOT - DAY), "ended": self.record(49871, 16616, BOOT + 60),
            "live": self.record(8792, 501, BOOT + 60), "outside": self.record(8793, 502, BOOT + 60),
        }

    def test_산_데몬일_수_있는_것만_싣고_지우지_않는다(self):
        paths = self.fill()
        self.assertEqual(self.scan(), [("8792", "daemon"), ("8793", "unknown")])
        self.assertTrue(all(os.path.exists(p) for p in paths.values()))

    def test_clean_은_부팅_전에_쓴_죽은_기록만_지운다(self):
        paths = self.fill()
        self.assertEqual(self.scan(clean=True), [("8792", "daemon"), ("8793", "unknown")])
        gone = sorted(k for k, p in paths.items() if not os.path.exists(p))
        # 시각으로만 죽었다고 본 것(blind)은 남긴다 — 이번 부팅의 기록(ended)은 데몬이 다시 뜨며 고쳐 쓰는 중일 수 있다
        self.assertEqual(gone, ["old", "root"])
        self.assertEqual(len([n for n in os.listdir(self.dir) if n.endswith(".log")]), 6, "로그는 prevue log 가 읽는다 — 지우지 않는다")
        self.assertFalse([n for n in os.listdir(self.dir) if n.endswith(".gone")])

    def test_포트를_주면_그_포트만(self):
        self.fill()
        self.assertEqual(self.scan(ports={"8793", "49319"}), [("8793", "unknown")])
        self.assertEqual(self.scan(ports={""}), [])

    # bin/prevue 는 daemon-$PORT.pid 로 쓰고 받은 줄을 grep -x "$PORT" 로 찾는다 — 08794 를 8794 로 돌려주면 그 자리를 못 찾는다
    def test_포트는_기록_이름의_글자_그대로_돌려준다(self):
        self.record("08794", 503, BOOT + 60)
        self.assertEqual(self.scan(ports={"08794"}), [("08794", "daemon")])

    def test_기록이_아닌_파일은_보지_않는다(self):
        for name in ("recent-Users_x_repo", "daemon-8792.log", "daemon-8792.pid.77.gone", "daemon-x.pid"):
            open(os.path.join(self.dir, name), "w").close()
        self.assertEqual(self.scan(), [])

    def test_판정이_깨져도_죽었다고_단정하지_않는다(self):
        self.record(8792, 501, BOOT + 60)

        def broken(pid):
            raise RuntimeError("관찰 실패")
        self.assertEqual(R.scan(self.dir, boot=BOOT, kill=broken, command=broken), [("8792", "unknown")])

    def test_디렉터리가_없으면_기록도_없다(self):
        self.assertEqual(R.scan(os.path.join(self.dir, "nope"), boot=BOOT), [])


class Sweep(unittest.TestCase):
    """지우는 사이에 같은 자리에 데몬을 띄워 새로 쓴 기록은 살린다."""

    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.dir)
        self.path = os.path.join(self.dir, "daemon-8792.pid")
        self.boot = time.time() - 3600

    def write(self, text, mtime=None):
        with open(self.path, "w") as f:
            f.write(text)
        if mtime is not None:
            os.utime(self.path, (mtime, mtime))

    def read(self):
        with open(self.path) as f:
            return f.read()

    def test_부팅_전_기록은_지운다(self):
        self.write("419\n", self.boot - DAY)
        R.sweep(self.path, self.boot)
        self.assertEqual(os.listdir(self.dir), [])

    def test_판정_뒤에_새로_쓴_기록은_되돌린다(self):
        self.write("777\n")   # 훑을 때는 부팅 전이었는데 그 사이 start 가 고쳐 썼다
        R.sweep(self.path, self.boot)
        self.assertEqual((self.read(), os.listdir(self.dir)), ("777\n", ["daemon-8792.pid"]))

    def test_옮기는_사이에_또_쓴_기록은_그대로_둔다(self):
        self.write("419\n", self.boot - DAY)
        rename = os.rename

        def racing(src, dst):
            rename(src, dst)
            if dst.endswith(".gone"):
                with open(src, "w") as f:
                    f.write("778\n")
        with mock.patch.object(R.os, "rename", racing):
            R.sweep(self.path, self.boot)
        self.assertEqual((self.read(), os.listdir(self.dir)), ("778\n", ["daemon-8792.pid"]))

    def test_되돌릴_때_더_새_기록이_있으면_그쪽이다(self):
        self.write("777\n")
        rename = os.rename

        def racing(src, dst):
            rename(src, dst)
            if dst.endswith(".gone"):
                with open(src, "w") as f:
                    f.write("778\n")
        with mock.patch.object(R.os, "rename", racing):
            R.sweep(self.path, self.boot)
        self.assertEqual((self.read(), os.listdir(self.dir)), ("778\n", ["daemon-8792.pid"]))


class BootTime(unittest.TestCase):
    def setUp(self):
        self.boot = R.boot_time()
        if self.boot is None:
            self.skipTest("이 플랫폼에서는 부팅 시각을 읽지 않는다")

    def test_지나간_시각이다(self):
        self.assertLess(self.boot, time.time())
        self.assertGreater(self.boot, time.time() - 3650 * DAY)

    @unittest.skipUnless(sys.platform == "darwin", "macOS")
    def test_macOS_는_kern_boottime_과_같다(self):
        try:
            out = subprocess.run(["sysctl", "-n", "kern.boottime"], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL).stdout.decode()
            sec = float(out.split("sec = ")[1].split(",")[0]) + float(out.split("usec = ")[1].split()[0]) / 1e6
        except (OSError, IndexError, ValueError):
            self.skipTest("sysctl kern.boottime 을 못 읽는다(샌드박스)")
        self.assertAlmostEqual(self.boot, sec, delta=1)

    @unittest.skipUnless(sys.platform.startswith("linux") and hasattr(time, "CLOCK_BOOTTIME"), "리눅스")
    def test_리눅스는_잠잔_시간을_포함한다(self):
        self.assertAlmostEqual(self.boot, time.time() - time.clock_gettime(time.CLOCK_BOOTTIME), delta=2)


class LinuxProc(unittest.TestCase):
    """CI 이미지(리눅스)에는 ps 가 없을 수 있어 /proc 을 읽는다 — macOS 에서도 그 길을 본다."""

    def command(self, data=None, error=None):
        m = mock.mock_open(read_data=data)
        if error:
            m.side_effect = error
        with mock.patch.object(R.os.path, "isdir", lambda p: p == "/proc/self"), mock.patch("builtins.open", m):
            return R.command_of(4242)

    def test_명령줄은_NUL_로_갈린_인자다(self):
        cmd = self.command(b"/usr/lib/jvm/bin/java\x00-cp\x00/p/prevue.jar\x00prevue.daemon.MainKt\x00--port\x008792\x00")
        self.assertTrue(R.ours(cmd, 8792))

    def test_좀비의_명령줄은_비어_데몬이_아니다(self):
        self.assertFalse(R.ours(self.command(b""), 8792))

    def test_못_읽으면_모른다(self):
        self.assertIsNone(self.command(error=PermissionError("hidepid")))

    def test_부팅_시각은_proc_stat_의_btime(self):
        with mock.patch.object(R.sys, "platform", "linux"), \
                mock.patch("builtins.open", mock.mock_open(read_data="cpu  1 2 3\nbtime 1791192312\nprocesses 9\n")):
            self.assertEqual(R.boot_time(), BOOT)


class Cli(unittest.TestCase):
    """진짜 bin/prevue 를 친다. PREVUE_HOME 을 임시 디렉터리로 돌려 사용자의 ~/.prevue 는 건드리지 않는다.
    pid 1(launchd · init)은 늘 살아 있고 데몬이 아니다 — 재부팅 뒤 기록의 pid 를 물려받은 남의 프로세스 자리다."""

    def setUp(self):
        self.home = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.home)
        self.daemons = os.path.join(self.home, "daemons")
        os.makedirs(self.daemons)

    def prevue(self, *args):
        # 저장소 밖(gradlew 없음)에서 친다 — 이 저장소의 자리를 계산하지 않게
        p = subprocess.run([os.path.join(ROOT, "bin", "prevue")] + list(args), cwd=self.home, env=prevue_env(self.home),
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
        return p.returncode, json.loads(p.stdout.decode().strip().splitlines()[-1])

    def record(self, pid, mtime=None):
        port = free_port()
        path = os.path.join(self.daemons, "daemon-%d.pid" % port)
        with open(path, "w") as f:
            f.write("%d\n" % pid)
        if mtime is not None:
            os.utime(path, (mtime, mtime))
        return port, path

    def need_command(self, pid):
        if R.command_of(pid) is None:
            self.skipTest("pid %d 의 명령줄을 못 읽는다(ps · /proc 없음 또는 샌드박스)" % pid)

    def boot(self):
        b = R.boot_time()
        if b is None:
            self.skipTest("이 플랫폼에서는 부팅 시각을 읽지 않는다")
        return b

    # 회귀(2026-10-05): 재부팅 뒤 기록의 pid 를 root 의 systemsoundserverd 가 물려받아 status 가 networkBlocked 로 멈췄다
    def test_재부팅_전_기록은_산_pid_라도_데몬이_아니다(self):
        _, path = self.record(1, self.boot() - DAY)
        rc, out = self.prevue("status")
        self.assertEqual(rc, 3)
        self.assertNotIn("networkBlocked", out)
        self.assertIn("No running daemon", out["error"])
        self.assertTrue(os.path.exists(path), "status 는 기록을 읽기만 한다")

    def test_자리를_준_status_도_데몬이_없다고_답한다(self):
        port, _ = self.record(1, self.boot() - DAY)
        rc, out = self.prevue("status", "--port", str(port))
        self.assertEqual((rc, out.get("daemon"), "networkBlocked" in out), (3, False, False))

    def test_이번_부팅의_기록이라도_남의_pid_면_데몬이_아니다(self):
        self.need_command(1)
        self.record(1)
        rc, out = self.prevue("status")
        self.assertEqual((rc, "networkBlocked" in out), (3, False))

    # 실측의 58588 — 끝났지만 아직 거두지 않은 같은 사용자의 프로세스(좀비)에도 kill -0 이 성공한다
    def test_좀비가_된_같은_사용자_프로세스도_데몬이_아니다(self):
        child = os.fork()
        if child == 0:
            os._exit(0)
        self.addCleanup(os.waitpid, child, 0)
        time.sleep(0.3)
        self.need_command(child)
        self.record(child)
        rc, out = self.prevue("status")
        self.assertEqual((rc, "networkBlocked" in out), (3, False))

    # 지킬 것: 살아 있는 데몬이 HTTP 에 안 닿으면 여전히 "닿지 못한다"다 — 기록도 프로세스도 그대로 둔다
    def test_닿지_못하는_산_데몬은_그대로_networkBlocked(self):
        port = free_port()
        fake = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(120)", "prevue.daemon.MainKt", "--port", str(port)])
        self.addCleanup(fake.wait)
        self.addCleanup(fake.kill)
        path = os.path.join(self.daemons, "daemon-%d.pid" % port)
        with open(path, "w") as f:
            f.write("%d\n" % fake.pid)
        rc, out = self.prevue("status")
        self.assertEqual((rc, out.get("networkBlocked"), out.get("unreachable")), (3, True, [port]))
        self.assertTrue(os.path.exists(path))
        self.assertIsNone(fake.poll(), "데몬에 신호를 보내지 않는다")

    # await_exit 이 남의 pid 를 데몬으로 읽으면 /shutdown 뒤 35초를 기다렸다
    def test_남이_물려받은_pid_의_stop_은_기다리지_않는다(self):
        other = subprocess.Popen(["sleep", "120"])
        self.addCleanup(other.wait)
        self.addCleanup(other.kill)
        self.need_command(other.pid)
        port = free_port()
        with open(os.path.join(self.daemons, "daemon-%d.pid" % port), "w") as f:
            f.write("%d\n" % other.pid)
        t0 = time.time()
        rc, out = self.prevue("stop", "--port", str(port))
        self.assertEqual((rc, out.get("ok")), (0, True))
        self.assertLess(time.time() - t0, 10)
        self.assertIsNone(other.poll())

    # 지킬 것: 진짜 데몬이면 /shutdown 뒤 끝날 때까지 기다린다 — 안 기다리면 같은 자리에 새 데몬이 떠 힙 두 벌이 겹친다
    def test_데몬의_stop_은_끝날_때까지_기다린다(self):
        port = free_port()
        fake = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(120)", "prevue.daemon.MainKt", "--port", str(port)])
        self.addCleanup(fake.wait)
        self.addCleanup(fake.kill)
        with open(os.path.join(self.daemons, "daemon-%d.pid" % port), "w") as f:
            f.write("%d\n" % fake.pid)
        stop = subprocess.Popen([os.path.join(ROOT, "bin", "prevue"), "stop", "--port", str(port)], cwd=self.home,
                                env=prevue_env(self.home), stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.addCleanup(stop.wait)
        self.addCleanup(stop.kill)
        time.sleep(2)              # 기다리지 않는 stop 은 0.1초 안에 끝난다(실측)
        waiting = stop.poll() is None
        fake.kill()
        fake.wait()                # 진짜 데몬은 launchd · init 이 바로 거둔다 — 여기서는 이 프로세스가 거둔다(좀비에는 kill -0 이 성공한다)
        t0 = time.time()
        out, _ = stop.communicate(timeout=60)
        self.assertTrue(waiting, "데몬이 사는 동안 stop 이 끝났다")
        self.assertLess(time.time() - t0, 10, "데몬이 끝나면 stop 도 곧 끝난다")
        self.assertEqual((stop.returncode, json.loads(out.decode().strip().splitlines()[-1]).get("ok")), (0, True))

    def test_clean_은_부팅_전의_죽은_기록을_지우고_로그는_둔다(self):
        boot = self.boot()
        _, old = self.record(99999999, boot - DAY)       # 없는 pid
        _, ended = self.record(99999998)                 # 이번 부팅에 끝났다
        log = old[:-len(".pid")] + ".log"
        open(log, "w").close()
        out = subprocess.run([sys.executable, os.path.join(ROOT, "bin", "daemon_records.py"), "--clean", self.daemons],
                             stdout=subprocess.PIPE, timeout=60).stdout.decode()
        self.assertEqual(out, "")
        self.assertEqual((os.path.exists(old), os.path.exists(ended), os.path.exists(log)), (False, True, True))


class MainClass(unittest.TestCase):
    """ours() 가 찾는 메인 클래스는 데몬을 띄우는 두 곳이 넘긴다 — bin/prevue start 의 RUN, 렌더 스레드를 잃은 데몬이 자기를
    다시 띄우는 Respawn.start(Main.kt). 한 곳만 바꾸면 산 데몬이 모두 gone 이 되어, 닿지 못하는 산 데몬 자리에 둘째 데몬을 띄우고
    stop 이 끝나기를 기다리지 않는다. 명령줄이 실제로 그렇게 짜이는지는 Launch 가 본다(명령줄을 읽을 수 있을 때)."""

    def source(self, *path):
        with open(os.path.join(ROOT, *path), encoding="utf-8") as f:
            return f.read()

    def test_데몬을_띄우는_두_곳이_같은_메인_클래스를_넘긴다(self):
        self.assertRegex(self.source("bin", "prevue"), r'-cp "\$PREVUE_CP" %s\s' % re.escape(R.DAEMON_MAIN))
        self.assertIn('Respawn.start("%s", ' % R.DAEMON_MAIN, self.source("src", "main", "kotlin", "prevue", "daemon", "Main.kt"))


class Launch(unittest.TestCase):
    """진짜 bin/prevue start 를 친다. 플러그인 디렉터리를 임시로 꾸며 build/prevue-env 를 둔다 — CI 는 툴체인을 굽기 전에
    이 테스트를 돌린다. PREVUE_JDK 의 java 는 HTTP 를 열지 않고 받은 인자를 문 채 잔다 — start 가 그것을 띄우면 뜨기를 30초
    기다리므로 기록을 보고 끊는다."""

    def setUp(self):
        self.home = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.home)
        plugin = os.path.join(self.home, "plugin")
        shutil.copytree(os.path.join(ROOT, "bin"), os.path.join(plugin, "bin"), ignore=shutil.ignore_patterns("__pycache__"))
        os.makedirs(os.path.join(plugin, "build"))
        with open(os.path.join(plugin, "build", "prevue-env"), "w") as f:
            for k in ("PREVUE_CP", "PREVUE_LAYOUTLIB", "PREVUE_COMPILER", "PREVUE_BRIDGE", "PREVUE_VIEWER"):
                f.write('%s="$ROOT/build/%s"\n' % (k, k.lower()))
        self.java = os.path.join(self.home, "jdk", "bin", "java")
        os.makedirs(os.path.dirname(self.java))
        with open(self.java, "w") as f:
            f.write("#!/bin/sh\nexec '%s' -c 'import time; time.sleep(30)' \"$0\" \"$@\"\n" % sys.executable)
        os.chmod(self.java, 0o755)
        self.cli = os.path.join(plugin, "bin", "prevue")
        self.daemons = os.path.join(self.home, "daemons")
        os.makedirs(self.daemons)
        self.env = prevue_env(self.home, PREVUE_JDK=os.path.dirname(os.path.dirname(self.java)))
        self.addCleanup(self.put_down)

    def put_down(self):
        """start 가 띄운 가짜 데몬을 내린다. 이 테스트의 java 인 것만 — 남의 pid 에 신호를 보내지 않는다."""
        for name in os.listdir(self.daemons):
            if not R.RECORD.match(name):
                continue
            try:
                with open(os.path.join(self.daemons, name)) as f:
                    pid = int(f.read())
            except (OSError, ValueError):
                continue
            if self.java in (R.command_of(pid) or ""):
                os.kill(pid, signal.SIGKILL)

    def launched(self, port):
        """start 가 띄운 가짜 데몬의 pid. 기록은 fork 직후에 써진다 — exec 전에는 아직 셸의 명령줄이라 이 테스트의 java 가 보일 때까지 기다린다."""
        path = os.path.join(self.daemons, "daemon-%s.pid" % port)
        for _ in range(200):
            try:
                with open(path) as f:
                    pid = int(f.read())
                if self.java in (R.command_of(pid) or ""):
                    return pid
            except (OSError, ValueError):
                pass
            time.sleep(0.1)
        self.fail("start 가 이 테스트의 java 를 띄우지 않았다")

    # 지킬 것: ours() 가 찾는 메인 클래스와 --port <포트>가 start 가 실제로 짜는 명령줄에 있다 — 없으면 산 데몬이 모두 gone 이다
    def test_start_가_띄운_데몬을_그_자리의_데몬으로_읽는다(self):
        if R.command_of(os.getpid()) is None:
            self.skipTest("명령줄을 못 읽는다(ps · /proc 없음 또는 샌드박스)")
        port = str(free_port())
        start = subprocess.Popen([self.cli, "start", "--port", port], cwd=self.home, env=self.env,
                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.addCleanup(start.wait)
        self.addCleanup(start.kill)
        self.launched(port)
        self.assertEqual(R.scan(self.daemons, {port}, R.boot_time()), [(port, "daemon")])

    # 지킬 것: 0 으로 시작하는 포트(--port 08792)도 그 자리다 — 포트를 글자로 견주면 닿지 못하는 산 데몬을 죽은 것으로 읽어
    # start 가 같은 자리에 둘째 데몬을 띄우고 기록을 덮어쓴다
    def test_0_으로_시작하는_포트의_산_데몬_자리에_둘째_데몬을_띄우지_않는다(self):
        port = "0%d" % free_port()
        first = subprocess.Popen([self.java, "-cp", "x", R.DAEMON_MAIN, "--port", port])
        self.addCleanup(first.wait)
        self.addCleanup(first.kill)
        path = os.path.join(self.daemons, "daemon-%s.pid" % port)
        with open(path, "w") as f:
            f.write("%d\n" % first.pid)
        p = subprocess.run([self.cli, "start", "--port", port], cwd=self.home, env=self.env,
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
        # 응답의 port 가 0 으로 시작해 JSON 수가 아니다(옛 판도 같다) — 글자로 본다
        self.assertEqual((p.returncode, '"networkBlocked":true' in p.stdout.decode()), (3, True))
        with open(path) as f:
            self.assertEqual(int(f.read()), first.pid, "기록은 그대로다")
        self.assertIsNone(first.poll(), "데몬에 신호를 보내지 않는다")


if __name__ == "__main__":
    unittest.main()
