"""도구 자신의 Gradle(plugin/daemon)을 띄울 JDK — Metro 의 Gradle 플러그인은 Gradle 이 JVM 21+ 에서 돌아야 풀린다.

AGP 세계의 기본 JAVA_HOME 은 흔히 17 이라 tools/unit-test.sh · tools/lint.sh 가 그대로 부르면 설정 단계에서 실패한다.
셸의 JDK 가 21 이상이면 건드리지 않고, 21 미만이거나 판을 모르면 데몬과 같은 길(PREVUE_JDK → plugin/cli/jdk_find.py)로 찾는다.
못 찾으면 셸 그대로 둔다 — Gradle 이 JDK 판을 짚는 실패를 내고, lint 는 그 실패를 안내(hint)로 읽는다.

  python3 tools/lint/gradle_jdk.py   → JAVA_HOME 으로 줄 경로, 바꿀 필요가 없거나 못 찾으면 빈 줄
"""

import os
import shutil
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "plugin", "cli"))
import jdk_find  # noqa: E402

GRADLE_MIN = 21


def shell_jdk(env, which=shutil.which):
    """래퍼가 고를 JDK 홈 — JAVA_HOME, 없으면 PATH 의 java. macOS 의 /usr/bin/java 같은 스텁은 release 가 없어 판을 모른다."""
    if env.get("JAVA_HOME"):
        return env["JAVA_HOME"]
    java = which("java", path=env.get("PATH"))
    return os.path.dirname(os.path.dirname(os.path.realpath(java))) if java else None


def gradle_java_home(env, which=shutil.which):
    home = shell_jdk(env, which)
    v = jdk_find.version(home) if home else None
    if v is not None and v[0] >= GRADLE_MIN:
        return None
    if env.get("PREVUE_JDK"):
        return env["PREVUE_JDK"]
    found, state = jdk_find.find(*jdk_find.search_places(env))
    return found if state == "ok" else None


def gradle_env(env):
    """Gradle 을 부를 환경 — 바꿀 것이 있으면 JAVA_HOME 만 바꾼 사본."""
    home = gradle_java_home(env)
    return dict(env, JAVA_HOME=home) if home else dict(env)


if __name__ == "__main__":
    print(gradle_java_home(os.environ) or "")
