#!/bin/sh
# 스킬 평가(NFR-15 · D-55). 진짜 스킬 · 도움말에 가짜 prevue(tests/evals/prevue)를 끼운 평가용 플러그인을 build/eval-plugin 에
# 조립해 tests/evals/cases 의 케이스를 돌린다 — 렌더러 · 대상 저장소 없이. 심볼릭 링크로 엮지 않는다: 평가는 플러그인 트리 밖을
# 가리키는 링크를 읽지 않는다. 모델 호출이 들어 비용이 있다(케이스 6 × 3회 ≈ $5) — CI 에는 걸지 않고, 스킬 · 도움말을 고친 PR 에서
# 손으로 돌려 결과를 PR 에 적는다.
#   sh tools/skill-eval.sh                                   # 전부, 3회씩
#   sh tools/skill-eval.sh --case approval-first --runs 1
set -e
cd "$(dirname "$0")/.."
P=build/eval-plugin
rm -rf "$P"
mkdir -p "$P/.claude-plugin" "$P/bin" "$P/fixtures" "$P/evals"
printf '{"name":"prevue","description":"Prevue 스킬 평가용 — 가짜 prevue"}\n' > "$P/.claude-plugin/plugin.json"
cp -R plugin/skills "$P/skills"
cp -R plugin/bin/help "$P/bin/help"
cp tests/evals/prevue "$P/bin/prevue" && chmod +x "$P/bin/prevue"
# 응답의 image 가 가리킬 카드 그림. 저장소는 *.png 를 무시해 사본을 두지 않고 여기서 만든다(회색 412×915, PIL 없이).
python3 - "$P/fixtures/card.png" <<'PY'
import struct, sys, zlib
w, h = 412, 915
raw = b"".join(b"\x00" + b"\xee\xee\xee" * w for _ in range(h))
chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
open(sys.argv[1], "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                              + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))
PY
cp -R tests/evals/cases/. "$P/evals/"
exec claude plugin eval "$P" \
  --scaffold --trust-plugin --no-publish \
  --ablation none \
  --allow-tools Bash Edit Write \
  --max-cost-usd "${PREVUE_EVAL_MAX_USD:-15}" \
  "$@"
