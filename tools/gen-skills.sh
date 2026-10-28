#!/bin/sh
# 원본 한 벌에서 에이전트별 스킬 두 벌을 만든다. 원본은 둘이다.
#   skills-src/      → plugin/skills/ · plugin/codex/skills/   제품 — 플러그인에 실려 Prevue 사용자에게 간다
#   dev-skills-src/  → .claude/skills/ · .agents/skills/ 이 저장소를 개발할 때만 — 플러그인에 싣지 않는다(implement · ship)
# 손으로 두 벌을 고치면 공통 내용이 조용히 어긋난다. 원본은 여기 하나고, 두 벌은 생성물이다.
#
# 원본에서 한 에이전트에만 줄 구간은 제 줄에 놓인 표시로 감싼다.
#   <!-- only:claude -->  …  <!-- /only -->
#   <!-- only:codex -->   …  <!-- /only -->
# 원본은 plugin/ 밖에 둔다 — Claude Code 는 매니페스트와 무관하게 플러그인 루트의 skills/ 를 스캔해 표시째 읽는다.
#
#   tools/gen-skills.sh           만든다
#   tools/gen-skills.sh --check   만든 것이 커밋된 두 벌과 다르면 무엇이 다른지 말하고 1로 끝난다
#
# 로컬은 BSD 도구라 POSIX sh·awk 만 쓴다.
set -eu
cd "$(dirname "$0")/.."

gen() {  # gen <claude|codex> <원본> <출력>
  # frontmatter 바로 아래에 생성물이라는 표시를 넣는다 — SKILL.md 는 frontmatter 로 시작해야 해서 맨 위에는 못 둔다.
  awk -v want="$1" -v src="$2" -v note="<!-- 생성물이다. $2 를 고치고 tools/gen-skills.sh 로 만든다 -->" '
    NR == 1 && $0 == "---" { fm = 1; print; next }
    fm == 1 && $0 == "---" { fm = 2; print; print note; next }
    /^<!-- only:(claude|codex) -->$/ {
      if (tag != "") { printf "%s:%d: only 가 겹쳤다\n", src, NR > "/dev/stderr"; bad = 1 }
      tag = $0; sub(/^<!-- only:/, "", tag); sub(/ -->$/, "", tag); next
    }
    /^<!-- \/only -->$/ {
      if (tag == "") { printf "%s:%d: 여는 표시 없이 닫았다\n", src, NR > "/dev/stderr"; bad = 1 }
      tag = ""; next
    }
    /<!-- \/?only/ { printf "%s:%d: 표시는 제 줄에 혼자 둔다\n", src, NR > "/dev/stderr"; bad = 1 }
    tag == "" || tag == want { print }
    END {
      if (tag != "") { printf "%s: only:%s 를 닫지 않았다\n", src, tag > "/dev/stderr"; bad = 1 }
      exit bad
    }' "$2" > "$3"
}

# out_dir <원본> <claude|codex>
out_dir() {
  case "$1:$2" in
    skills-src:claude) echo plugin/skills ;;
    skills-src:codex) echo plugin/codex/skills ;;
    dev-skills-src:claude) echo .claude/skills ;;
    dev-skills-src:codex) echo .agents/skills ;;
  esac
}
SRCS="skills-src dev-skills-src"

if [ "${1:-}" = "--check" ]; then
  T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
  DIFF=0
  for R in $SRCS; do
    for A in claude codex; do
      for S in "$R"/*/SKILL.md; do
        N="$(basename "$(dirname "$S")")"
        gen "$A" "$S" "$T/$A-$N.md"
        O="$(out_dir "$R" "$A")/$N/SKILL.md"
        # cmp(diffutils)는 CI 이미지에 없을 수 있다 — coreutils 의 cksum 으로 견준다.
        [ -f "$O" ] && [ "$(cksum < "$T/$A-$N.md")" = "$(cksum < "$O")" ] || { echo "$O 가 $R/$N 에서 만든 것과 다르다"; DIFF=1; }
      done
      # 원본에 없는 스킬이 생성물에만 남아 있으면 그것도 어긋난 것이다.
      for O in "$(out_dir "$R" "$A")"/*/SKILL.md; do
        [ -f "$O" ] || continue
        [ -f "$R/$(basename "$(dirname "$O")")/SKILL.md" ] || { echo "$O 는 원본에 없다"; DIFF=1; }
      done
    done
  done
  [ "$DIFF" = 0 ] && { echo "스킬 두 벌이 원본과 맞다"; exit 0; }
  echo "skills-src/ · dev-skills-src/ 를 고치고 tools/gen-skills.sh 를 돌린다 — 생성물을 손으로 고치지 않는다"; exit 1
fi

for R in $SRCS; do
  for A in claude codex; do
    D="$(out_dir "$R" "$A")"
    for S in "$R"/*/SKILL.md; do
      N="$(basename "$(dirname "$S")")"
      mkdir -p "$D/$N"
      gen "$A" "$S" "$D/$N/SKILL.md"
    done
  done
done
echo "plugin/skills/ · plugin/codex/skills/ · .claude/skills/ · .agents/skills/ 를 만들었다"
