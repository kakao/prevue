"""공유 툴체인의 서드파티 jar 사본(~/.prevue/toolchain/lib-<해시>)을 다 보이고, 어느 것을 지워도 되는지 가린다. bin/prevue paths 가 부른다.

사본 이름은 의존 묶음의 해시라 의존이 바뀌는 판올림마다 새 사본(약 118MB)이 생기고 옛 것은 남는다. 다른 워크트리 · 옛 판이 아직
쓸 수 있어 자동으로 지우지 않는다. 대신 쓰는 곳이 보이는 것만 남기라고 알린다 — 지금 체크아웃의 prevue-env 가 가리키는 것,
Claude Code · Codex 의 플러그인 캐시에 깔린 판마다의 prevue-env 가 가리키는 것, 떠 있는 프로세스(데몬)의 명령줄 클래스패스에 든 것이다.
0.22.1 이하 판은 prevue-env 가 가리키는 사본이 없어도 있다고 보고 없는 jar 로 JVM 을 띄워 죽으므로, 깔린 판의 것은 꺼져 있어도 남긴다.
Claude Code 가 .orphaned_at 을 남긴 옛 판 폴더는 깔린 판이 아니라 세지 않는다 — 세면 그 사본이 영영 남는다.
prevue-env 자리는 판마다 다르다(build/ · plugin/build/ · daemon/daemon/build/). ps 를 못 치면(Codex 샌드박스) 떠 있는 것을
모르므로 지워도 된다고 하지 않는다. macOS 기본 python3(3.9)에서 돈다.
"""

import glob
import os
import re
import subprocess

LIB = re.compile(r"^lib-[0-9a-f]+$")
ENV_SPOTS = ("daemon/daemon/build/prevue-env", "plugin/build/prevue-env", "build/prevue-env")
# 외부: Claude Code 는 판올림하면 옛 판 폴더에 이 파일을 남기고 나중에 지운다 — 깔린 판이 아니다.
ORPHANED = ".orphaned_at"
ENV_LIB = re.compile(r'^PREVUE_LIB="(.*)"\s*$', re.M)


def size_mb(path):
    out = subprocess.run(["du", "-sk", path], capture_output=True, text=True).stdout.split()
    return round(int(out[0]) / 1024) if out else None


def running_cmdlines():
    """떠 있는 프로세스의 명령줄. 못 읽으면 None."""
    try:
        p = subprocess.run(["ps", "-A", "-ww", "-o", "command="], capture_output=True, timeout=10)
    except (OSError, subprocess.SubprocessError):
        return None
    return p.stdout.decode("utf-8", "replace").splitlines() if p.returncode == 0 else None


def plugin_caches(home, env=os.environ):
    claude = env.get("CLAUDE_CONFIG_DIR") or os.path.join(home, ".claude")
    codex = env.get("CODEX_HOME") or os.path.join(home, ".codex")
    return [os.path.join(claude, "plugins", "cache"), os.path.join(codex, "plugins", "cache")]


def installed_libs(home, caches):
    """플러그인 캐시에 깔린 Prevue 판마다 그 prevue-env 가 가리키는 lib 경로."""
    out = set()
    for cache in caches:
        for install in glob.glob(os.path.join(cache, "*", "prevue", "*")):
            if os.path.exists(os.path.join(install, ORPHANED)):
                continue
            for spot in ENV_SPOTS:
                try:
                    with open(os.path.join(install, spot), encoding="utf-8", errors="replace") as f:
                        m = ENV_LIB.search(f.read())
                except OSError:
                    continue
                if m:
                    out.add(os.path.realpath(m.group(1).replace("$HOME", home)))
                break
    return out


def copies(toolchain, own, installed, cmdlines):
    """toolchain 아래 lib-* 마다 {path, mb, usedBy, deletable}. usedBy 는 'this plugin' · 'installed plugin' · 'running daemon' 중 해당하는 것."""
    try:
        names = sorted(n for n in os.listdir(toolchain) if LIB.match(n) and os.path.isdir(os.path.join(toolchain, n)))
    except OSError:
        return []
    own = os.path.realpath(own) if own else None
    out = []
    for n in names:
        path = os.path.join(toolchain, n)
        real = os.path.realpath(path)
        used = []
        if own and real == own:
            used.append("this plugin")
        if real in installed:
            used.append("installed plugin")
        marks = {path + "/", real + "/"}
        if cmdlines is not None and any(m in c for c in cmdlines for m in marks):
            used.append("running daemon")
        out.append({"path": path, "mb": size_mb(path), "usedBy": used, "deletable": cmdlines is not None and not used})
    return out
