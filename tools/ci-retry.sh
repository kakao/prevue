#!/bin/sh
# CI의 Gradle 스텝을 감싸, 의존성 다운로드가 일시적으로 실패했을 때만 같은 명령을 한 번 다시 돈다.
#
#   sh tools/ci-retry.sh <명령…>
#
# 다시 도는 때 — 로그에 서버 429 · 5xx 응답이 있거나, Gradle이 내려받기(Could not GET · HEAD · resolve)에서 시간 초과 ·
# 연결 끊김을 보고했을 때. 테스트나 빌드 자체의 실패, 테스트 출력에 찍힌 시간 초과는 다시 돌지 않는다.
# 종료 코드는 마지막 실행의 것이다. 쉬는 시간은 RETRY_DELAY(초, 기본 30).
set -u

[ "$#" -gt 0 ] || { echo "usage: sh tools/ci-retry.sh <command...>" >&2; exit 2; }

LOG="$(mktemp)"
RC_FILE="$(mktemp)"
trap 'rm -f "$LOG" "$RC_FILE"' EXIT

# 로그를 흘리면서 파일에도 남긴다. 파이프가 끝 코드를 가리므로 코드는 파일로 받는다.
run() {
  { "$@" 2>&1; echo $? > "$RC_FILE"; } | tee "$LOG"
  return "$(cat "$RC_FILE")"
}

download_flaked() {
  grep -Eq 'Received status code (429|5[0-9][0-9])' "$LOG" && return 0
  grep -Eq 'Could not (GET|HEAD|resolve)' "$LOG" || return 1
  grep -Eq 'Read timed out|Connect timed out|Connection reset|Remote host terminated' "$LOG"
}

run "$@" && exit 0
RC=$?

download_flaked || exit "$RC"

DELAY="${RETRY_DELAY:-30}"
echo "::warning::the download failed (exit $RC) — retrying once after ${DELAY}s"
sleep "$DELAY"
run "$@"
