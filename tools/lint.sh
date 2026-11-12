#!/bin/sh
# Kotlin 슬롭 · 층 규칙 · 뷰어 날값 린트 — 에이전트는 판단하지 않고 이것을 돌려 결과만 받는다.
#   sh tools/lint.sh                       작업 PR 전(기준 origin/develop)
#   sh tools/lint.sh --base origin/main    릴리즈 PR(CI)
# 종료 코드: 0 통과 · 1 위반 · 2 검사를 못 했다
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 자기 검사도 JSX 날값 검사를 돌린다 — node 의존이 없으면 unittest 꼬리 대신 원인 한 줄로 먼저 멈춘다(판정은 viewer.py 한 곳)
python3 "$ROOT/tools/lint/viewer.py" --deps || exit 2

# CI 는 python 3.9 로 도므로 자기 검사도 3.9 가 있으면 그것으로 돈다 — 새 python 으로만 보면 3.10+ 문법이 로컬을 지나 CI 에서 깨진다
if PY="$(command -v python3.9)"; then :; else
  PY=python3
  echo "경고: python3.9 가 없어 $(python3 --version 2>&1) 로 자기 검사를 돈다 — CI(3.9)에서만 깨지는 문법은 못 잡는다" >&2
fi

# 규칙이 심은 위반을 잡는지부터 본다. 못 잡으면 통과가 아무것도 말하지 않는다.
if ! OUT="$(cd "$ROOT" && "$PY" -m unittest discover -s tests/lint 2>&1)"; then
  echo "$OUT" | tail -20 >&2
  echo "검사를 못 했다: 린트 규칙의 자기 검사(tests/lint)가 실패했다" >&2
  exit 2
fi

exec python3 "$ROOT/tools/lint/lint.py" "$@"
