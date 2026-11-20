#!/bin/sh
# 리뷰 · PR 전에 내 자리에서 도는 검사 여섯 — 생성물(스킬 두 벌 · CLAUDE.md) · 고지 사본 · 뷰어 생성물 · CLI 판정 · 데몬 단위 테스트 · 린트.
# CI(Verify)가 같은 여섯을 다시 돌지만 10~15분이 걸려, 리뷰어와 CI에 넘기기 전에 여기서 먼저 잡는다.
# 통합 테스트 전체와 빌드 · CLI 계약은 CI 몫이라 여기 없다.
#
#   sh tools/check-local.sh
#
# 종료 코드: 0 전부 통과 · 1 하나라도 실패했거나 검사를 못 했다
# 실패해도 끝까지 돌아 한 번에 다 보인다. 마지막 줄들이 요약이다 — 본 커밋과 작업 트리 상태를 함께 찍는다.
# 여기를 통과해도 CI 는 Ubuntu · sh · python 3.9 에서 돈다 — CI 에서만 실패하면 macOS 에서만 통과하는 것부터 의심한다.
set -u
cd "$(dirname "$0")/.."

OUT="$(mktemp)"
trap 'rm -f "$OUT"' EXIT
FAIL=0
SUMMARY=""

note() { SUMMARY="$SUMMARY
  $1"; }

# run <이름> <명령…> — 통과하면 마지막 줄만, 실패하면 출력 전부를 보인다
run() {
  NAME="$1"; shift
  if "$@" > "$OUT" 2>&1; then
    note "통과  $NAME — $(grep -v '^[[:space:]]*$' "$OUT" | tail -1)"
  else
    cat "$OUT"
    note "실패  $NAME"
    FAIL=1
  fi
}

run "생성물(gen-agents)" sh tools/gen-agents.sh --check
run "고지 사본(plugin-copies)" sh tools/plugin-copies.sh --check

# 뷰어 생성물 · viewer.state 계약 타입(contract-state.ts)이 원본과 맞는지 — 키만 더하고 생성을 빠뜨리면 CI 에서야 걸린다.
# viewer-src/node_modules 가 없으면(새 워크트리) 실패한다 — 린트와 같이 통과로 치지 않는다
run "뷰어 생성물(gen-viewer)" sh tools/gen-viewer.sh --check

# CI 는 python 3.9 로 돈다 — 있으면 그것으로 돌려 3.9 에서만 깨지는 문법을 밀기 전에 잡는다
PY="$(command -v python3.9 || command -v python3)"
run "CLI 판정(tests/cli, $("$PY" --version 2>&1))" "$PY" -m unittest discover -s tests/cli

# 데몬 단위 테스트는 Gradle 이라 느리다 — 그 테스트가 읽는 입력이 develop 과 같으면(문서만 고쳤다) 건너뛴다.
# 입력은 데몬 소스 · 빌드 파일 · 기기 스펙만이 아니다 — 화면 문구(viewer 문자열 · viewer-src · CLI)와 스킬 예산(plugin/skills)도 읽는다.
# 커밋하지 않은 변경과 새 파일도 본다.
BASE="$(git merge-base origin/develop HEAD 2>/dev/null || echo origin/develop)"
INPUTS="plugin/daemon plugin/devices plugin/viewer plugin/cli plugin/skills viewer-src"
# shellcheck disable=SC2086
if git diff --quiet "$BASE" -- $INPUTS && [ -z "$(git status --porcelain -- $INPUTS)" ]; then
  note "건너뜀  데몬 단위 테스트 — 그 입력($INPUTS)이 develop 과 같다"
else
  # 데몬 빌드는 JDK 21+ 여야 한다 — 셸 JAVA_HOME 이 17 이면 tools/dev_jdk.py 가 21+ 를 골라 준다
  if (JAVA_HOME="$(python3 tools/dev_jdk.py)" && export JAVA_HOME && cd plugin/daemon && ./gradlew --offline test) > "$OUT" 2>&1; then
    TESTS="$(cat plugin/daemon/*/build/test-results/test/*.xml 2>/dev/null \
      | sed -n 's/.*<testsuite [^>]* tests="\([0-9]*\)".*/\1/p' | awk '{ n += $1 } END { print n + 0 }')"
    note "통과  데몬 단위 테스트 — tests=$TESTS"
  else
    tail -60 "$OUT"
    note "실패  데몬 단위 테스트"
    FAIL=1
  fi
fi

# 린트는 판단하지 않고 결과대로 고친다(D-70 · D-96). 종료 2(검사를 못 했다)도 통과가 아니다 —
# 흔한 원인은 viewer-src/node_modules 가 없는 것(새 워크트리)이고 lint.sh 가 고치는 명령을 알려 준다.
sh tools/lint.sh > "$OUT" 2>&1
LINT=$?
if [ "$LINT" = 0 ]; then
  note "통과  린트 — $(grep -v '^[[:space:]]*$' "$OUT" | tail -1)"
else
  cat "$OUT"
  note "실패  린트(종료 $LINT) — $(grep -v '^[[:space:]]*$' "$OUT" | tail -1)"
  FAIL=1
fi

# 검사는 커밋이 아니라 작업 트리를 읽는다 — 트리가 깨끗할 때만 이 결과가 그 커밋의 것이다
if [ -z "$(git status --porcelain)" ]; then
  TREE="작업 트리 깨끗 — 이 결과는 이 커밋의 것이다"
else
  TREE="커밋하지 않은 변경이 있다 — 커밋한 뒤 다시 돌려야 그 커밋의 결과다"
fi

echo "check-local$SUMMARY"
echo "  커밋  $(git rev-parse --short HEAD) · $TREE"
[ "$FAIL" = 0 ] && echo "check-local: 통과" || echo "check-local: 실패"
exit "$FAIL"
