#!/bin/sh
# 설치본에는 Node 없이 쓸 생성물만 싣는다.
set -eu
cd "$(dirname "$0")/../viewer-src"
exec node build.mjs "$@"
