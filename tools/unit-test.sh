#!/bin/sh
# 구현 검증의 단위 테스트 — CLI 판정(tests/cli)과 데몬 단위 테스트(Gradle test).
# 데몬 단위 테스트는 느려서, 그 테스트가 읽는 입력(INPUTS)이 develop 과 같으면(문서만 고쳤다) 건너뛴다.
# 입력은 데몬 소스 · 빌드 파일 · 기기 스펙만이 아니다 — 화면 문구(viewer 문자열 · viewer-src · CLI)와 스킬 예산(plugin/skills)도 읽는다.
# 커밋하지 않은 변경과 새 파일도 본다.
#
#   sh tools/unit-test.sh            둘 다 돈다
#   sh tools/unit-test.sh --inputs   INPUTS 만 찍는다 — implement 의 화면 확인 판정이 읽는다
#
# 종료 코드: 0 통과 · 1 실패
set -u
cd "$(dirname "$0")/.."

INPUTS="plugin/daemon plugin/devices plugin/viewer plugin/cli plugin/skills viewer-src"
[ "${1:-}" = "--inputs" ] && { echo "$INPUTS"; exit 0; }

FAIL=0

# CI 는 python 3.9 로 돈다 — 있으면 그것으로 돌려 3.9 에서만 깨지는 문법을 밀기 전에 잡는다
PY="$(command -v python3.9 || command -v python3)"
if "$PY" -m unittest discover -s tests/cli; then
  echo "통과  CLI 판정($("$PY" --version 2>&1))"
else
  echo "실패  CLI 판정"
  FAIL=1
fi

BASE="$(git merge-base origin/develop HEAD 2>/dev/null || echo origin/develop)"
# shellcheck disable=SC2086
if git diff --quiet "$BASE" -- $INPUTS && [ -z "$(git status --porcelain -- $INPUTS)" ]; then
  echo "건너뜀  데몬 단위 테스트 — 그 입력($INPUTS)이 develop 과 같다"
else
  # Gradle 은 JDK 21+ 에서만 뜬다(Metro) — 셸의 JAVA_HOME 이 17 이어도 그대로 돌게 데몬과 같은 길로 고른다(못 찾으면 셸 그대로)
  GRADLE_JDK="$(python3 tools/lint/gradle_jdk.py)"
  if (cd plugin/daemon && JAVA_HOME="${GRADLE_JDK:-${JAVA_HOME:-}}" ./gradlew --offline test); then
    TESTS="$(cat plugin/daemon/*/build/test-results/test/*.xml 2>/dev/null \
      | sed -n 's/.*<testsuite [^>]* tests="\([0-9]*\)".*/\1/p' | awk '{ n += $1 } END { print n + 0 }')"
    echo "통과  데몬 단위 테스트 — tests=$TESTS"
  else
    echo "실패  데몬 단위 테스트"
    FAIL=1
  fi
fi

exit "$FAIL"
