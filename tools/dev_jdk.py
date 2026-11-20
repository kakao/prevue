"""개발 검사가 데몬 빌드(Gradle)를 돌릴 JDK 를 고른다 — 쓸 JAVA_HOME 을 stdout 에 한 줄로 낸다.

데몬 빌드는 Gradle 자체가 JVM 21+ 여야 한다 — Metro 의 Gradle 플러그인(plugin/daemon/gradle/libs.versions.toml)이
21 바이트코드다. 셸 JAVA_HOME 이 17 인 것이 AGP 세계의 기본이라 그대로 두면 설정 단계에서 멈춘다.
고르는 순서: PREVUE_JDK(사람이 고른 것) → 21+ 인 JAVA_HOME → 제품 굽기(bin/prevue)와 같은 찾기(cli/jdk_find.py).
못 찾으면 무엇을 깔지 stderr 에 내고 2 로 끝난다.

  JAVA_HOME="$(python3 tools/dev_jdk.py)" || exit 2; export JAVA_HOME
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "plugin", "cli"))
import jdk_find  # noqa: E402

NEED = """데몬 빌드(Gradle)는 JDK 21 이상이 필요하다 — Metro 의 Gradle 플러그인이 JVM 21+ 에서만 풀린다.
  지금: %s
  다음 중 하나:
  - Android Studio Ladybug(2024.2) 이상을 깔면 그 JBR 을 알아서 쓴다
  - brew install openjdk@25 (sudo 없이 깔리고 알아서 찾는다)
  - 이미 깔린 21+ 를 PREVUE_JDK 나 JAVA_HOME 으로 가리킨다"""


class NoJdk(Exception):
    """21+ 를 어디서도 못 찾았다 — 메시지가 무엇을 깔지 안내다."""


def describe(home):
    if not home:
        return "JAVA_HOME 이 없어"
    if not jdk_find.has_java(home):
        return "JAVA_HOME %s 에 bin/java 가 없어" % home
    v = jdk_find.version(home)
    return "JAVA_HOME %s 이 %s" % (home, "21 미만(%s)이라" % ".".join(map(str, v)) if v else "판을 몰라")


def choose(env):
    """(home, 알릴 말 또는 None). 21+ 를 못 찾으면 NoJdk."""
    if env.get("PREVUE_JDK"):
        return env["PREVUE_JDK"], None
    current = env.get("JAVA_HOME", "")
    if current and jdk_find.has_java(current) and jdk_find.usable(jdk_find.version(current)):
        return current, None
    home, state = jdk_find.find(*jdk_find.search_places(env))
    if state != "ok":
        raise NoJdk(NEED % describe(current))
    return home, "%s 데몬 빌드는 %s 로 돈다" % (describe(current), home)


if __name__ == "__main__":
    try:
        home, note = choose(os.environ)
    except NoJdk as e:
        print(e, file=sys.stderr)
        sys.exit(2)
    if note:
        print(note, file=sys.stderr)
    print(home)
