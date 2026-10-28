"""warmup 이 Gradle 을 부를 JDK. 셸이 입력을 모아 주고 여기서는 고르기만 한다(단위 테스트가 이 모듈을 부른다).

산출물을 구운 JDK 와 같아야 재사용한다 — 툴체인을 고정하지 않은 저장소에서는 Gradle 의 JDK 가 compileKotlin·JavaCompile 의
입력이라, 다른 JDK 로 부르면 같은 변형이라도 전부 다시 컴파일한다(0.7.2 실측, 대형 앱 모듈). 무엇으로 구웠는지는 산출물에 남지 않으므로
**Gradle 데몬 로그**를 본다. 기준은 누가 빌드했느냐(AS·터미널·Prevue)가 아니라 **디스크에 있는 가장 최신 산출물**이다.
순서:
  1. 이 모듈의 마지막 컴파일(`last-build.bin` mtime) 직전에 이 저장소 빌드를 시작한 데몬의 javaHome — 그 산출물을 구운 JDK.
     마지막 컴파일 시각을 모르면 이 저장소를 가장 최근에 빌드한 데몬.
     — 떠 있든 내려갔든 본다. 떠 있는 데몬만 보면 idle 3시간 뒤에는 비어, 아침에 빌드하고 오후에 켜면 AS JBR 로 떨어져
       6분 재컴파일했다(이슈 #4). 아직 떠 있으면 재사용해 콜드 스타트도 없다(이슈 #3: 새 데몬 1분).
     — 데몬은 저장소가 아니라 Gradle 버전 단위로 공유돼, 버전만 보면 IDE 확장이 띄운 남의 데몬을 잡는다(실측: VS Code
       Java 확장의 JRE 21 데몬). 로그의 `Received command: Build{… currentDir=…}` 가 무엇을 언제 빌드했는지 말한다.
     — Prevue 의 warmup 도 빼지 않는다. 그것이 마지막으로 컴파일했다면 디스크의 산출물이 그 JDK 것이다. 컴파일 없이 끝난
       warmup 은 last-build.bin 을 움직이지 않아 기준 시각 뒤로 밀려 고르지 않는다.
  2. Prevue 가 이 저장소에서 지난번에 쓴 JDK — 로그가 지워졌을 때(Gradle 이 오래된 로그를 치운다)
  3. 없으면 셸의 gradle_jdk_of(프로젝트 설정 → …)
"""

import datetime
import os
import re

DAEMON_MAIN = "org.gradle.launcher.daemon.bootstrap.GradleDaemon"


def parse_daemons(ps_text, gradle_version=None):
    """`ps -axo pid=,lstart=,command=` 출력에서 Gradle 데몬들. [(pid, 시작 epoch, java home)]."""
    out = []
    for line in ps_text.splitlines():
        if DAEMON_MAIN not in line:
            continue
        # 실행 파일은 공백으로 자르지 않는다 — AS 번들 JBR 이 "/Applications/Android Studio.app/…" 라 거기서 끊긴다
        m = re.match(r"\s*(\d+)\s+(\w{3}\s+\w{3}\s+\d+\s+[\d:]+\s+\d{4})\s+(.+?/bin/java)\s+(.*)$", line)
        if not m:
            continue
        pid, lstart, exe, rest = m.groups()
        ver = rest.split(DAEMON_MAIN, 1)[1].split()[:1]
        if gradle_version and ver != [gradle_version]:
            continue
        try:
            start = datetime.datetime.strptime(" ".join(lstart.split()), "%a %b %d %H:%M:%S %Y").timestamp()
        except ValueError:
            continue
        out.append((int(pid), start, os.path.dirname(os.path.dirname(exe))))
    return out


# 빌드 줄은 고정 문구로 먼저 찾고 그 줄 머리의 시각을 읽는다 — 줄마다 정규식을 걸면 수 MB 로그 하나에 수십 ms 다(실측 8배).
BUILD_COMMAND = re.compile(r"Received command: Build\{[^\n]*?currentDir=([^,}\n]+)")
LINE_TIME = re.compile(r"(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)\S*[^\S\n]")
CONTEXT_HOME = re.compile(r"DefaultDaemonContext\[[^\]]*?javaHome=([^,\]]+)")


def _epoch(stamp):
    return datetime.datetime.strptime(stamp, "%Y-%m-%dT%H:%M:%S").timestamp()


def repo_build_times(log_text, repo):
    """데몬 로그에서 이 저장소(또는 그 아래)의 빌드를 시작한 시각들(epoch)."""
    repo = repo.rstrip("/")
    out = []
    for m in BUILD_COMMAND.finditer(log_text):
        d = m.group(1)
        if d != repo and not d.startswith(repo + "/"):
            continue
        t = LINE_TIME.match(log_text, log_text.rfind("\n", 0, m.start()) + 1)
        if t and t.end() <= m.start():
            out.append(_epoch(t.group(1)))
    return out


def started_after(path, when):
    """이 로그의 데몬이 when 뒤에 떴는가 — 첫 줄 시각. 읽지 못하면 False(읽어 보게 둔다)."""
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            t = LINE_TIME.match(f.read(64))
    except OSError:
        return False
    return bool(t) and _epoch(t.group(1)) > when


def last_repo_build(log_text, repo, before=None):
    """이 저장소를 마지막으로 빌드한 시각(epoch). before 가 있으면 그 시각 이전 것만. 없으면 None."""
    ts = [t for t in repo_build_times(log_text, repo) if before is None or t <= before]
    return max(ts) if ts else None


def daemon_java_home(log_text):
    """데몬 로그 머리의 DefaultDaemonContext 에 적힌 javaHome. 없으면 None."""
    m = CONTEXT_HOME.search(log_text)
    return m.group(1) if m else None


def repo_builds(log_dir, repo, before=None):
    """[(pid, 이 저장소 빌드 시작 시각, java home)] — log_dir 의 daemon-<pid>.out.log 중 이 저장소를 빌드한 것.

    로그는 수십 개·수십 MB 라 health 마다 다 읽지 않는다. 로그의 mtime 은 그 안의 마지막 빌드보다 늦으므로 새 것부터 읽다가
    이미 찾은 가장 늦은 빌드보다 오래된 로그가 나오면 멈춘다 — 1순위만 쓰니 그 뒤는 답을 바꾸지 못한다.
    before 뒤에 뜬 데몬의 로그는 열지 않는다 — before 전의 빌드가 있을 수 없다. 모듈을 오래 안 컴파일했으면 그 사이 로그가
    전부 mtime 으로는 걸러지지 않아 다 읽었다(nowinandroid 124MB, 0.25초).
    """
    try:
        names = os.listdir(log_dir)
    except OSError:
        return []
    logs = []
    for n in names:
        m = re.match(r"daemon-(\d+)\.out\.log$", n)
        if m:
            p = os.path.join(log_dir, n)
            try:
                logs.append((os.path.getmtime(p), int(m.group(1)), p))
            except OSError:
                pass
    out, best = [], None
    for mtime, pid, p in sorted(logs, reverse=True):
        if best is not None and mtime < best:
            break
        if before is not None and started_after(p, before):
            continue
        try:
            text = open(p, encoding="utf-8", errors="replace").read()
        except OSError:
            continue
        if repo.rstrip("/") not in text:
            continue
        when, home = last_repo_build(text, repo, before), daemon_java_home(text)
        if when is not None and home:
            out.append((pid, when, home))
            best = when if best is None else max(best, when)
    return out


def choose(daemons, last_used, alive=()):
    """(java home, 출처) 또는 (None, None) — 셸이 gradle_jdk_of 로 넘어간다.

    daemons 는 [(pid, 이 저장소 빌드 시작 시각, java home)] — 이 저장소를 빌드한 적 없는 데몬은 넣지 않는다.
    alive 는 떠 있는 데몬 pid 로, 출처 문구에만 쓴다 — 내려간 데몬이라도 그 JDK 로 구운 산출물은 그대로 있다.
    """
    if daemons:
        pid, _, home = max(daemons, key=lambda d: d[1])
        return home, "the Gradle daemon that last built this repository (pid %d%s)" % (pid, "" if pid in set(alive) else ", stopped")
    if last_used:
        return last_used, "the JDK Prevue used last time"
    return None, None


if __name__ == "__main__":
    import sys
    import glob
    # jdk_rule.py <gradle 버전> <지난번 JDK 파일> <저장소> <Gradle 사용자 홈> [<모듈 디렉터리>]  (stdin: ps 출력)
    # → "<home>\t<출처>"
    ver, last_file, repo, gradle_home, moddir = (sys.argv[1:6] + [""] * 5)[:5]
    try:
        last = open(last_file, encoding="utf-8").read().strip() or None
    except OSError:
        last = None
    # 모듈의 마지막 컴파일 — 코틀린 플러그인이 실제로 컴파일할 때만 갱신한다(prevue_plan.last_built 와 같은 파일)
    stamps = [os.path.getmtime(p) for p in glob.glob(os.path.join(moddir, "build", "kotlin", "*", "cacheable", "last-build.bin"))] if moddir else []
    before = max(stamps) if stamps else None
    alive = [d[0] for d in parse_daemons(sys.stdin.read(), ver or None)]
    daemons = [d for d in (repo_builds(os.path.join(gradle_home, "daemon", ver), repo, before) if repo and ver else [])
               if os.access(os.path.join(d[2], "bin", "java"), os.X_OK)]
    if last and not os.access(os.path.join(last, "bin", "java"), os.X_OK):
        last = None
    home, src = choose(daemons, last, alive)
    if home:
        print("%s\t%s" % (home, src))
