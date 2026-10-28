#!/bin/sh
# README 영상 촬영 준비 — 뼈대를 저장소 밖에 새로 깔고 Gradle 덤프까지만 떠 둔다. 데몬은 영상 속 에이전트가 띄운다.
# 녹화 중 에이전트가 베이스 체크아웃을 고치지 않게, 그리고 판마다 같은 출발점이 되게 매번 새로 복사한다.
set -eu

HERE=$(cd "$(dirname "$0")" && pwd)
DEST=${1:-$HOME/Desktop/pearl}
# 영상은 이 체크아웃(개발판)으로 찍는다 — 에이전트도 이 체크아웃을 플러그인으로 읽어야 한다(마지막 줄).
# CLI 는 자기 사본이 띄운 데몬만 보므로 데몬도 같은 사본으로 띄운다
REPO=$(cd "$HERE/../.." && pwd)
PREVUE=${PREVUE:-$REPO/plugin/bin/prevue}
# 영상은 영어판이다 — 뷰어 주소에 ?lang=en 을 실어 녹화하는 사람의 언어와 상관없이 영어로 연다
export PREVUE_LANG=en
[ -x "$PREVUE" ] || { echo "$PREVUE 가 없다 — 저장소에서 ./gradlew --offline installPrevue 를 먼저 돌린다" >&2; exit 2; }

# init 스크립트는 저장소를 사내 Maven으로 돌릴 수 있다 — 공개 Maven만 쓴다는 전제로 승인 없이 도는 것이라 그때는 멈춘다
INIT_D=${GRADLE_USER_HOME:-$HOME/.gradle}/init.d
if [ -d "$INIT_D" ] && [ -n "$(find "$INIT_D" -maxdepth 1 -type f)" ]; then
  echo "$INIT_D 에 init 스크립트가 있다 — 픽스처 Gradle이 사내 Maven으로 갈 수 있어 멈춘다" >&2; exit 2
fi

if [ -e "$DEST" ]; then
  # 이 스크립트가 깐 폴더만 지운다
  [ -f "$DEST/.git/pearl-demo" ] || { echo "$DEST 가 이미 있고 이 스크립트가 만든 폴더가 아니다" >&2; exit 2; }
  (cd "$DEST" && "$PREVUE" stop >/dev/null 2>&1) || true
  rm -rf "$DEST"
fi
mkdir -p "$DEST"
cd "$DEST"
# 표시를 먼저 둔다 — 중간에 실패해도 다음 판이 이 폴더를 치울 수 있다
git init -q
: > .git/pearl-demo
(cd "$HERE" && tar --exclude=build --exclude=.gradle --exclude=stage.sh --exclude=edit.py --exclude=README.md --exclude=shim -cf - .) | tar -xf -
printf 'build/\n.gradle/\n.kotlin/\nlocal.properties\n' > .gitignore
# 새 복사본에는 local.properties 가 없다 — ANDROID_HOME 이 없는 셸이면 macOS 기본 SDK 위치를 적는다
if [ -z "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" ] && [ -d "$HOME/Library/Android/sdk" ]; then
  echo "sdk.dir=$HOME/Library/Android/sdk" > local.properties
fi
git add -A
git -c user.name=Pearl -c user.email=pearl@example.com -c commit.gpgsign=false commit -qm "Pearl skeleton"

HOME_KT=app/src/main/kotlin/com/example/pearl/ui/home/HomeScreen.kt
warm=$("$PREVUE" warmup "$HOME_KT" --no-open) || { echo "$warm" >&2; exit 1; }
# 에이전트의 prevue start 가 여는 뷰어를 cmux 브라우저 판(시안을 띄운 그 판)으로 보낸다 — shim/open
echo "에이전트  cd $DEST && PATH=$HERE/shim:\$PATH PEARL_VIEWER_SURFACE=${VIEWER_SURFACE:-<cmux 브라우저 판>} claude --plugin-dir $REPO --settings '{\"enabledPlugins\":{\"prevue@prevue\":false}}'"
