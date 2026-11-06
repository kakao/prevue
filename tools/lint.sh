#!/bin/sh
# Kotlin 슬롭 · 층 규칙 · 뷰어 날값 린트 — 에이전트는 판단하지 않고 이것을 돌려 결과만 받는다.
#   sh tools/lint.sh                       작업 PR 전(기준 origin/develop)
#   sh tools/lint.sh --base origin/main    릴리즈 PR(CI)
# 종료 코드: 0 통과 · 1 위반 · 2 검사를 못 했다
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 규칙이 심은 위반을 잡는지부터 본다. 못 잡으면 통과가 아무것도 말하지 않는다.
if ! OUT="$(cd "$ROOT" && python3 -m unittest discover -s tests/lint 2>&1)"; then
  echo "$OUT" | tail -20 >&2
  echo "검사를 못 했다: 린트 규칙의 자기 검사(tests/lint)가 실패했다" >&2
  exit 2
fi

exec python3 "$ROOT/tools/lint/lint.py" "$@"
