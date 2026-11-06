#!/bin/sh
# Kotlin 슬롭 · 층 규칙 · 뷰어 날값 린트 — 에이전트는 판단하지 않고 이것을 돌려 결과만 받는다.
#   sh tools/lint.sh                       작업 PR 전(기준 origin/develop)
#   sh tools/lint.sh --base origin/main    릴리즈 PR(CI)
# 종료 코드: 0 통과 · 1 위반 · 2 검사를 못 했다
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# 자기 검사 · JSX 날값 검사가 viewer-src 의 typescript 를 쓴다. node_modules 는 git 밖이라 새 워크트리에 없고, 받다 멈추면 폴더만 남는다 —
# 모듈을 못 찾았다는 꼬리 대신 원인을 말한다. 받는 것은 부르는 쪽 몫이다(린트는 기본 오프라인)
if [ ! -f "$ROOT/viewer-src/node_modules/typescript/package.json" ]; then
  echo "검사를 못 했다: viewer-src/node_modules 에 typescript 가 없다 — npm ci --prefix viewer-src 를 먼저 돌린다" >&2
  exit 2
fi

# 규칙이 심은 위반을 잡는지부터 본다. 못 잡으면 통과가 아무것도 말하지 않는다.
if ! OUT="$(cd "$ROOT" && python3 -m unittest discover -s tests/lint 2>&1)"; then
  echo "$OUT" | tail -20 >&2
  echo "검사를 못 했다: 린트 규칙의 자기 검사(tests/lint)가 실패했다" >&2
  exit 2
fi

exec python3 "$ROOT/tools/lint/lint.py" "$@"
