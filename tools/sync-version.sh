#!/bin/sh
# plugin/VERSION 의 값을 배포 매니페스트 둘과 CHANGELOG 제목에 옮기고, 설치본의 고지 사본(tools/plugin-copies.sh)을 맞춘다. README 의 버전 배지는 GitHub Release 를 읽는 동적 배지라 옮기지 않는다.
# 버전의 원천은 VERSION 하나다 — plugin.json 은 손으로 고치지 않고 develop 에 직접 미는 버전 커밋(/release)에서 이 스크립트로만 옮긴다.
# 마켓플레이스 둘의 플러그인 소스는 main 브랜치다 — main 은 릴리즈 PR 로만 움직이는 배포본이라 머지가 곧 배포다.
# 그래서 검증은 main 으로 가는 PR 에서 끝난다(/release 가 --check 로, Release 워크플로가 태그 전에 한 번 더).
#
#   tools/sync-version.sh           옮긴다
#   tools/sync-version.sh --check   옮길 것이 있으면 무엇인지 말하고 1로 끝난다
#
# 로컬은 BSD 도구라 POSIX sh·awk 만 쓴다(sed -i · 0,/re/ 는 GNU 전용).
set -eu
cd "$(dirname "$0")/.."

NEXT="$(tr -d ' \t\r\n' < plugin/VERSION)"
echo "$NEXT" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' || { echo "VERSION 이 X.Y.Z 가 아니다: $NEXT" >&2; exit 2; }

ver() { sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$1" | head -1; }

STALE=""
for P in plugin/.claude-plugin/plugin.json plugin/.codex-plugin/plugin.json; do
  [ "$(ver "$P")" = "$NEXT" ] || STALE="$STALE $P"
done
# ref 는 버전마다 옮기지 않는다 — main 이 아니면 누가 태그 고정으로 되돌린 것이다.
for M in .claude-plugin/marketplace.json .agents/plugins/marketplace.json; do
  grep -q '"ref": "main"' "$M" || { echo "$M 의 플러그인 소스가 main 이 아니다" >&2; exit 1; }
done
grep -qF "## [$NEXT]" CHANGELOG.md || STALE="$STALE CHANGELOG.md"
sh tools/plugin-copies.sh --check > /dev/null || STALE="$STALE plugin/LICENSE·NOTICE.md"

if [ "${1:-}" = "--check" ]; then
  [ -z "$STALE" ] && { echo "$NEXT 로 맞다"; exit 0; }
  echo "$NEXT 로 옮길 것:$STALE"; exit 1
fi

# 고치기 전에 본다 — 도중에 멈추면 파일이 반쯤 옮겨진 채 남는다.
if ! grep -qF "## [$NEXT]" CHANGELOG.md; then
  N="$(awk '/^## \[Unreleased\]/ {f=1; next} /^## \[/ {f=0} f && /^- /' CHANGELOG.md | wc -l)"
  [ "$N" -gt 0 ] || { echo "CHANGELOG.md 의 '## [Unreleased]' 아래에 적힌 변화가 없다" >&2; exit 1; }
fi

for P in plugin/.claude-plugin/plugin.json plugin/.codex-plugin/plugin.json; do
  # 최상위 version 은 한 번만 나온다 — 첫 것만 바꾼다. nv 는 awk 예약어 next 를 피한 이름이다.
  awk -v nv="$NEXT" '!done && /"version"[[:space:]]*:/ { sub(/"version"[[:space:]]*:[[:space:]]*"[^"]*"/, "\"version\": \"" nv "\""); done = 1 } 1' "$P" > "$P.tmp" && mv "$P.tmp" "$P"
done

# [Unreleased] 가 이 버전의 제목이 되고 그 위에 빈 [Unreleased] 를 새로 연다. 이미 제목이 있으면 두지 않는다.
if ! grep -qF "## [$NEXT]" CHANGELOG.md; then
  DATE="$(TZ=Asia/Seoul date +%F)"
  awk -v h="## [$NEXT] — $DATE" '!done && /^## \[Unreleased\]/ { print; print ""; print h; done = 1; next } 1' CHANGELOG.md > CHANGELOG.md.tmp && mv CHANGELOG.md.tmp CHANGELOG.md
fi

sh tools/plugin-copies.sh > /dev/null
echo "$NEXT 로 옮겼다"
