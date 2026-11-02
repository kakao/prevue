"""데몬을 띄울 JDK 찾기 — PREVUE_JDK 가 없을 때. 셸이 부르고 단위 테스트가 이 모듈을 부른다(D-130).

Prevue 는 JDK 를 받지 않는다. 없으면 설치 안내로 멈추고 에이전트가 깐다 — 그 뒤 다시 부르면 여기서 찾아야 하므로
에이전트가 흔히 까는 자리를 본다. 에이전트 셸은 JAVA_HOME 을 다음 호출까지 못 들고 가 환경 변수만으로는 못 찾는다.
  1. Android Studio 의 JBR — 실측 기준 JDK 다. 21 이상이면(판을 몰라도) 다른 것을 보지 않는다
  2. 발견한 JDK — JAVA_HOME · ~/Library · /Library 의 JavaVirtualMachines · Homebrew openjdk* · SDKMAN
     /usr/libexec/java_home 은 쓰지 않는다 — `-v 21+` 가 맞는 것이 없으면 조용히 18 을 돌려주고(실측), Homebrew 의
     keg-only openjdk 는 목록에 없다. 같은 폴더를 직접 읽는다.
발견한 것끼리는 그림이 같다고 확인한 판(21 · 25, 2026-10-30 PNG 38장 바이트 비교)을 먼저 — 25 → 21~24 → 26+.
25 가 21~24 보다 앞인 것은 AOT 캐시(D-129)로 콜드가 ~1초 빠르기 때문이다. 26+ 는 미검증이라 25 에 가까운 판부터.
"""

import glob
import os
import re

AS_JBR = "Applications/Android Studio.app/Contents/jbr/Contents/Home"


def version(home):
    """release 의 JAVA_VERSION 을 숫자 튜플로. 1.8 은 (8, …). 없으면 None. 다시 묶은 JDK 는 줄이 둘일 수 있어 첫 줄만 본다."""
    try:
        with open(os.path.join(home, "release"), encoding="utf-8", errors="replace") as f:
            m = re.search(r'^JAVA_VERSION="([^"]*)"', f.read(), re.M)
    except OSError:
        return None
    nums = [int(n) for n in re.findall(r"\d+", m.group(1))] if m else []
    if not nums:
        return None
    return tuple(nums[1:]) if nums[0] == 1 and len(nums) > 1 else tuple(nums)


def has_java(home):
    return os.access(os.path.join(home, "bin", "java"), os.X_OK)


def usable(v):
    """판을 알고 21 이상. 판을 모르면 막지 않는 것은 사람이 고른 PREVUE_JDK 뿐이다(셸의 have_java) — 찾은 것 중에는
    release 없는 옛 번들(Apple 1.6.0.jdk 등)이 있어, 받아들이면 setup · warmup 을 다 치른 뒤 데몬이 죽는다."""
    return v is not None and v[0] >= 21


def rank(v):
    """작을수록 먼저. 주 버전은 25 에 가까운 것부터(21~24 는 높은 것, 26+ 는 낮은 것), 같은 주 버전은 높은 판부터.
    "25" 와 "25.0.5" 를 견주려고 꼬리를 채운다 — 안 채우면 짧은 쪽(GA)이 늘 앞선다."""
    group = 0 if v[0] == 25 else 1 if v[0] < 25 else 2
    return (group, abs(v[0] - 25)) + tuple(-n for n in (v[1:] + (0,) * 4)[:4])


def search_places(env):
    """(먼저 볼 자리, 발견할 자리 glob). PREVUE_JDK_SEARCH(콜론으로 나눈 glob)가 있으면 둘 다 그것으로 바꾼다 —
    테스트가 이 머신의 진짜 설치본을 보지 않게 한다."""
    if env.get("PREVUE_JDK_SEARCH"):
        return [], [p for p in env["PREVUE_JDK_SEARCH"].split(":") if p]
    home = env.get("HOME", os.path.expanduser("~"))
    prefer = ["/" + AS_JBR, os.path.join(home, AS_JBR)]    # 둘째는 JetBrains Toolbox 가 까는 자리
    brews = [env["HOMEBREW_PREFIX"]] if env.get("HOMEBREW_PREFIX") else ["/opt/homebrew", "/usr/local"]
    found = ([env["JAVA_HOME"]] if env.get("JAVA_HOME") else []) + [
        os.path.join(home, "Library/Java/JavaVirtualMachines/*/Contents/Home"),
        "/Library/Java/JavaVirtualMachines/*/Contents/Home",
    ] + [os.path.join(b, "opt/openjdk*/libexec/openjdk.jdk/Contents/Home") for b in brews] + [
        os.path.join(env.get("SDKMAN_DIR") or os.path.join(home, ".sdkman"), "candidates/java/*"),
    ]
    return prefer, found


def find(prefer, patterns):
    """(home, 상태) — ok 쓸 수 있다 · old 21 미만만 있다(그중 가장 높은 판) · none 아무것도 없다(home 은 처음 본 자리)."""
    for home in prefer:
        v = version(home)
        if has_java(home) and (v is None or usable(v)):
            return home, "ok"
    seen, homes = set(), []
    for home in list(prefer) + [h for p in patterns for h in sorted(glob.glob(p))]:
        real = os.path.realpath(home)
        if real not in seen and has_java(home):
            seen.add(real)
            homes.append((home, version(home)))
    ok = [h for h in homes if usable(h[1])]
    if ok:
        return min(ok, key=lambda h: rank(h[1]))[0], "ok"
    known = [h for h in homes if h[1] is not None]
    if known:
        return max(known, key=lambda h: h[1])[0], "old"
    return (list(prefer) + list(patterns) + [""])[0], "none"


if __name__ == "__main__":
    # → "<home>\t<ok|old|none>"
    print("%s\t%s" % find(*search_places(os.environ)))
