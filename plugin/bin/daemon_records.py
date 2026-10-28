"""데몬 기록(<PREVUE_HOME>/daemons/daemon-<포트>.pid)이 살아 있는 데몬을 가리키는가. bin/prevue 가 부르고, 단위 테스트는 관찰을 주입해 state 를 부른다.

기록은 데몬이 끝나도 남는다. pid 는 재부팅하면 처음부터 다시 나눠 주고 같은 부팅에서도 돌아오므로, 기록의 pid 가 지금은 남의 프로세스일 수 있다 —
kill -0 만 보면 그것을 산 데몬으로 읽는다(실측 2026-10-05: 재부팅 뒤 기록의 pid 419 가 root 의 systemsoundserverd 라 EPERM,
다른 기록의 pid 68030 은 같은 사용자의 Chrome 헬퍼라 성공. 끝나고 거두기 전의 좀비에도 성공한다). 그래서 그 pid 의 명령줄이 그 포트의 데몬인지 본다.
Codex 샌드박스는 ps 실행을 막고 밖의 프로세스에 kill -0 을 EPERM 으로 거부해 무엇인지 알 수 없다(실측) — 그때만 기록을 쓴 시각이
이번 부팅 전인지 본다. 그래도 모르면 죽었다고 단정하지 않는다 — 산 데몬을 죽은 것으로 보면 같은 자리에 둘째 데몬을 띄워
힙 두 벌이 겹치고 로그를 덮어쓴다. macOS 기본 python3(3.9)에서 돈다.
"""

import os
import re
import subprocess
import sys
import time

# bin/prevue start 의 RUN 과 Respawn.start 가 띄우는 메인 클래스. 이름을 바꾸면 여기도 바꾼다.
DAEMON_MAIN = "prevue.daemon.MainKt"
# 부팅 뒤 시계가 조금 고쳐져도(NTP) 이번 부팅의 기록을 부팅 전으로 읽지 않게 둔다
BOOT_SLACK = 60
RECORD = re.compile(r"^daemon-(\d+)\.pid$")


def boot_time():
    """이번 부팅 시각(epoch 초). 모르면 None.

    sysctl kern.boottime 은 Codex 샌드박스가 막는다. macOS 의 CLOCK_MONOTONIC 은 (지금 - kern.boottime)이라 잠잔 시간이 들고
    샌드박스에서도 읽힌다(실측: 둘이 µs 까지 같다). 리눅스의 CLOCK_MONOTONIC 은 잠잔 시간을 빼므로 /proc/stat 의 btime 을 본다.
    """
    if sys.platform.startswith("linux"):
        try:
            with open("/proc/stat") as f:
                for line in f:
                    if line.startswith("btime "):
                        return float(line.split()[1])
        except (OSError, ValueError, IndexError):
            pass
        clock = getattr(time, "CLOCK_BOOTTIME", None)
    elif sys.platform == "darwin":
        clock = getattr(time, "CLOCK_MONOTONIC", None)
    else:
        return None
    try:
        return time.time() - time.clock_gettime(clock) if clock is not None else None
    except (AttributeError, OSError):
        return None


def before_boot(mtime, boot):
    return boot is not None and mtime is not None and mtime < boot - BOOT_SLACK


def signal0(pid):
    """kill -0 의 답 — "ok" · "eperm"(있다. 남의 프로세스이거나, 샌드박스가 밖의 프로세스로 가는 신호를 막는다) · "esrch"(없다).
    종료 코드만 보면 eperm 과 esrch 가 같아(셸의 kill 은 둘 다 1) 샌드박스 밖에서 띄운 산 데몬이 죽은 것으로 읽힌다."""
    try:
        os.kill(pid, 0)
        return "ok"
    except PermissionError:
        return "eperm"
    except (ProcessLookupError, OverflowError):   # pid 로 쓸 수 없는 큰 수도 없는 것이다
        return "esrch"


def command_of(pid):
    """그 pid 의 명령줄. 읽을 수 없으면 None — Codex 샌드박스는 ps 실행을 막는다(실측). 리눅스는 ps 가 없는 이미지가 있어 /proc 을 읽는다."""
    if os.path.isdir("/proc/self"):
        try:
            with open("/proc/%d/cmdline" % pid, "rb") as f:
                return f.read().replace(b"\0", b" ").decode("utf-8", "replace")
        except OSError:
            return None
    try:
        r = subprocess.run(["ps", "-ww", "-o", "command=", "-p", str(pid)],
                           stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=5)
    except (OSError, subprocess.SubprocessError):
        return None
    out = r.stdout.decode("utf-8", "replace").strip()
    return out if r.returncode == 0 and out else None


def ours(command, port):
    """그 명령줄이 그 포트의 데몬인가. 포트까지 본다 — 끝난 데몬의 pid 를 다른 자리의 데몬이 물려받을 수 있다.
    bin/prevue 가 --port 를 늘 넘기고 Respawn 도 인자를 그대로 잇는다. 좀비는 <defunct> 라 여기서 걸러진다.
    포트는 수로 견준다 — --port 08792 도 8792 자리다(데몬은 toInt, curl 도 10진으로 읽는다). 글자로 견주면 그 산 데몬이 죽은 것이 된다."""
    words = command.split()
    return DAEMON_MAIN in words and any(a == "--port" and b.isdecimal() and int(b) == port for a, b in zip(words, words[1:]))


def state(pid_text, port, mtime, boot, kill=signal0, command=command_of):
    """기록 하나 — "daemon"(그 포트의 데몬임을 명령줄로 봤다) · "unknown"(프로세스는 있는데 무엇인지 못 봤다) ·
    "gone"(죽었다 — pid 가 없거나 남의 것) · "stale"(무엇인지 못 봤지만 이번 부팅 전에 쓴 기록이다).
    명령줄을 읽을 수 있으면 그것이 답이다. 쓴 시각은 시계를 고치거나 NFS 처럼 다른 시계로 찍히면 어긋나 마지막에만 본다."""
    try:
        pid = int(pid_text.strip())
    except ValueError:
        return "gone"
    if pid <= 0:               # kill -0 은 0 · 음수를 프로세스 그룹으로 읽어 늘 성공한다
        return "gone"
    if kill(pid) == "esrch":
        return "gone"
    cmd = command(pid)
    if cmd is not None:
        return "daemon" if ours(cmd, port) else "gone"
    if kill(pid) == "esrch":   # 명령줄을 읽는 사이에 끝났다
        return "gone"
    return "stale" if before_boot(mtime, boot) else "unknown"


def sweep(path, boot):
    """부팅 전에 쓴 죽은 기록을 지운다. 옆으로 옮긴 뒤 다시 본다 — 그 사이 같은 자리에 데몬을 띄워 새로 썼으면
    (start 의 echo · 데몬의 Respawn.writePid) 되돌린다. 산 데몬의 기록은 지우지 않는다."""
    aside = "%s.%d.gone" % (path, os.getpid())   # daemon-*.pid 로 끝나지 않아 아무도 기록으로 읽지 않는다
    try:
        os.rename(path, aside)
    except OSError:
        return
    try:
        fresh = not before_boot(os.stat(aside).st_mtime, boot)
    except OSError:
        fresh = True
    if fresh:
        try:
            os.link(aside, path)
        except FileExistsError:
            pass                   # 옮긴 뒤에 또 쓴 기록이 있다 — 그쪽이 더 새롭다
        except OSError:
            if not os.path.exists(path):
                try:
                    os.rename(aside, path)
                except OSError:
                    pass
                return
    try:
        os.unlink(aside)
    except OSError:
        pass


def scan(daemon_dir, ports=None, boot=None, kill=signal0, command=command_of, clean=False):
    """[(포트, 상태)] — 살아 있는 데몬을 가리킬 수 있는 기록(daemon · unknown)만. ports(문자열 집합)를 주면 그 포트만 본다.
    포트는 기록 이름의 글자 그대로다 — bin/prevue 는 daemon-$PORT.pid 로 쓰고 받은 줄을 grep -x "$PORT" 로 찾는다(08792 를 8792 로 주면 못 찾는다).
    clean 이면 부팅 전에 쓴 기록 중 죽은 것이 확실한 것(gone)을 지운다 — 쌓인 기록마다 CLI 가 curl 을 친다(실측 57개에 2초).
    pid 를 못 봐 시각으로만 죽었다고 본 것(stale)은 남긴다 — 그 판정은 시계에 기댄다."""
    out = []
    try:
        names = sorted(os.listdir(daemon_dir))
    except OSError:
        return out
    for name in names:
        m = RECORD.match(name)
        if not m or (ports is not None and m.group(1) not in ports):
            continue
        port, path = int(m.group(1)), os.path.join(daemon_dir, name)
        try:
            mtime = os.stat(path).st_mtime
            with open(path, encoding="utf-8", errors="replace") as f:
                text = f.read()
        except OSError:
            continue
        try:
            s = state(text, port, mtime, boot, kill, command)
        except Exception:          # 판정이 깨져도 죽었다고 단정하지 않는다
            s = "unknown"
        if s in ("daemon", "unknown"):
            out.append((m.group(1), s))
        elif clean and s == "gone" and before_boot(mtime, boot):
            sweep(path, boot)
    return out


def main(argv):
    """bin/prevue 만 부른다. [--clean] <daemons 디렉터리> [포트…] — 한 줄에 포트\\t상태."""
    clean = bool(argv) and argv[0] == "--clean"
    if clean:
        argv = argv[1:]
    daemon_dir, ports = argv[0], (set(argv[1:]) or None)
    for port, s in scan(daemon_dir, ports, boot_time(), clean=clean):
        print("%s\t%s" % (port, s))


if __name__ == "__main__":
    main(sys.argv[1:])
