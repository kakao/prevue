# 화면으로 확인하기

사람이 PR 뒤에 하던 화면 확인을 에이전트가 먼저 한다. 할지는 `implement`의 도구 표대로 판단하고, 할 때는 그 커밋의 빌드로, 짠 에이전트가 계획 맥락을 쥔 채 직접 하고 서브에이전트로 떼지 않는다. 통합 테스트는 CI가 맡으므로 여기서 돌리지 않는다 — 로컬에서 또 돌리면 CI와 자원이 겹친다.

## 해당 없음

둘 중 하나면 그 이유를 "화면 확인 해당 없음 — <이유>"로 적는다. 제품 입력이 develop과 같거나, 사용자에게 보이는 동작(뷰어 화면 · CLI 출력)이 바뀌지 않았다. 제품 입력은 `tools/check-local.sh`의 `INPUTS`에 `plugin/bin`을 더한 경로다.

```sh
# sh로 감싼다 — zsh는 $P를 단어로 나누지 않아 plugin/bin만 보고 "해당 없음"으로 잘못 건너뛴다
sh -c 'P="$(sed -n "s/^INPUTS=\"\(.*\)\"\$/\1/p" tools/check-local.sh)"; test -n "$P" || exit 2; git diff --quiet "$(git merge-base origin/develop HEAD)" -- plugin/bin $P'
# 0 해당 없음 · 1 제품 입력이 바뀌었다 · 2 INPUTS를 못 읽었다 — 판정하지 않고 멈춘다
```

## 빌드하고 띄운다

`AGENTS.md`의 워크트리 프리뷰 규칙대로 이 워크트리를 빌드하고 그 `plugin/bin/prevue`를 쓴다. 대상은 저장소 픽스처(`fixtures/pearl` · `fixtures/pearl-kmp` · `fixtures/pearl-demo`)다 — 그 밖의 대상은 `AGENTS.md` "승인이 필요한 것"이다. 같은 대상을 다른 데몬이 보고 있으면 `AGENTS.md` "개발 위생"대로 띄운다. 파일 인자가 없는 명령(`focus` · `touch` · `scroll` · `log` · `status` 등)은 대상 픽스처 디렉터리 안에서 친다 — 데몬이 둘 이상 떠 있으면 워크트리 루트에서는 "Can't tell which repository"가 나고, `focus` · `type` · `scroll` · `log`는 오류가 권하는 `--project`를 옵션으로 받지 않는다.

## 본다

**바뀐 보이는 동작은 계획에 적혔든 아니든 전부 직접 확인한다.**

- CLI는 그 `prevue` 명령의 응답 · 종료 코드 · PNG로 본다.
- 뷰어는 Chrome으로 본다 — `tests/viewer/*.mjs`처럼 CDP로 몰아 스크린샷 · DOM · 진행 중인 애니메이션(`getAnimations()`) · 모션 줄이기(`Emulation.setEmulatedMedia`)를 보고, 프레임 간격은 `tools/scroll-jank.mjs --headed --trace`로 잰다. 모션은 시작 · 중간 · 끝 프레임을 찍어 본다.
<!-- only:claude -->
- Chrome 확장 도구(`mcp__claude-in-chrome__*`)가 있으면 그것으로 뷰어를 조작하고 봐도 된다.
<!-- /only -->
- 확인마다 확인한 커밋과, 무엇을 해서 무엇을 봤는지 기록 파일에 적는다(그림은 `.cache/` 아래, 경로만). 그 뒤 커밋을 다시 보지 않았으면 그 이유도 적는다.

**"사람 확인 전"은 에이전트가 할 수 없는 것만**, 이유와 함께 남긴다 — 실제 화면에서 느끼는 부드러움처럼 찍거나 잴 수 없는 것.
