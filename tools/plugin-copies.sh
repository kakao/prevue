#!/bin/sh
# 루트의 LICENSE · NOTICE.md 를 plugin/ 에 옮긴다(D-123). 설치본은 plugin/ 만 받으니 재배포 고지가 거기 있어야 하고,
# GitHub 는 루트의 LICENSE 로만 라이선스를 알아본다. 원본은 루트 한 벌이고 plugin/ 의 것은 생성물이다.
# 심볼릭 링크로 두지 않는다 — sparse checkout 으로 받은 설치본에서 plugin/ 밖을 가리키는 링크가 깨진다.
#
#   tools/plugin-copies.sh           옮긴다
#   tools/plugin-copies.sh --check   어긋나면 무엇인지 말하고 1로 끝난다
set -eu
cd "$(dirname "$0")/.."

FILES="LICENSE NOTICE.md"

if [ "${1:-}" = "--check" ]; then
  DIFF=0
  for F in $FILES; do
    # cmp(diffutils)는 CI 이미지에 없을 수 있다 — gen-skills.sh 처럼 cksum 으로 견준다.
    [ -f "plugin/$F" ] && [ "$(cksum < "$F")" = "$(cksum < "plugin/$F")" ] || { echo "plugin/$F 가 루트 $F 와 다르다"; DIFF=1; }
  done
  [ "$DIFF" = 0 ] && { echo "plugin/ 의 LICENSE · NOTICE.md 가 루트와 맞다"; exit 0; }
  echo "루트의 것을 고치고 tools/plugin-copies.sh 를 돌린다 — plugin/ 의 사본을 손으로 고치지 않는다"; exit 1
fi

for F in $FILES; do cp "$F" "plugin/$F"; done
echo "plugin/ 에 LICENSE · NOTICE.md 를 옮겼다"
