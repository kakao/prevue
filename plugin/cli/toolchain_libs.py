"""공유 툴체인의 서드파티 jar 사본(~/.prevue/toolchain/lib-<해시>)을 다 보이고, 어느 것을 지워도 되는지 가린다. bin/prevue paths 가 부른다.

사본 이름은 의존 묶음의 해시라 의존이 바뀌는 판올림마다 새 사본(약 118MB)이 생기고 옛 것은 남는다. 다른 워크트리 · 옛 판이 아직
쓸 수 있어 자동으로 지우지 않는다. 대신 쓰는 곳이 보이는 것만 남기라고 알린다 — 지금 체크아웃의 prevue-env 가 가리키는 것과,
떠 있는 프로세스(데몬)의 명령줄 클래스패스에 든 것이다. 꺼진 체크아웃이 쓰던 사본을 지워도 그 체크아웃의 다음 start 가
받아 둔 Gradle 캐시로 오프라인으로 다시 굽는다(bin/prevue start 의 baked · shared_toolchain). 판 경로는 prevue-env 자리가 판마다
달라(옛 판은 build/prevue-env) 명령줄을 본다. ps 를 못 치면(Codex 샌드박스) 떠 있는 것을 모르므로 지워도 된다고 하지 않는다.
macOS 기본 python3(3.9)에서 돈다.
"""

import os
import re
import subprocess

LIB = re.compile(r"^lib-[0-9a-f]+$")


def size_mb(path):
    out = subprocess.run(["du", "-sk", path], capture_output=True, text=True).stdout.split()
    return round(int(out[0]) / 1024) if out else None


def running_cmdlines():
    """떠 있는 프로세스의 명령줄. 못 읽으면 None."""
    try:
        p = subprocess.run(["ps", "-axww", "-o", "command="], capture_output=True, text=True, timeout=10)
    except (OSError, subprocess.SubprocessError):
        return None
    return p.stdout.splitlines() if p.returncode == 0 else None


def copies(toolchain, own, cmdlines, size=size_mb):
    """toolchain 아래 lib-* 마다 {path, mb, usedBy, deletable}. usedBy 는 'this plugin' · 'running daemon' 중 해당하는 것."""
    try:
        names = sorted(n for n in os.listdir(toolchain) if LIB.match(n) and os.path.isdir(os.path.join(toolchain, n)))
    except OSError:
        return []
    own = os.path.realpath(own) if own else None
    out = []
    for n in names:
        path = os.path.join(toolchain, n)
        used = []
        if own and os.path.realpath(path) == own:
            used.append("this plugin")
        marks = {path + "/", os.path.realpath(path) + "/"}
        if cmdlines is not None and any(m in c for c in cmdlines for m in marks):
            used.append("running daemon")
        out.append({"path": path, "mb": size(path), "usedBy": used, "deletable": cmdlines is not None and not used})
    return out
