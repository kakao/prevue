---
name: implement
description: Prevue 저장소의 코드를 바꾸는 작업을 그 작업의 워크트리 안에서 계획 합의부터 PR까지, 사람이 머지한 뒤에는 치우기까지 간다. PR로 가는 경로(src · bin · viewer · skills-src · dev-skills-src · tools · 워크플로 · 빌드 파일)를 고치거나 기능을 더해 달라는 요청에 쓴다 — 원인 조사 · 질문 · 문서만 고치는 일에는 쓰지 않는다. /implement로도 부르고(/implement grill이면 grilling으로 계획한다), 멈춘 자리부터 이어 간다.
---
<!-- 생성물이다. dev-skills-src/implement/SKILL.md 를 고치고 tools/gen-agents.sh 로 만든다 -->

# implement — 작업 하나를 PR까지, 머지 뒤 치우기까지

규칙(브랜치 · 워크트리 · 머지 · 지우면 안 되는 것)은 `AGENTS.md` "브랜치와 워크트리"가 갖는다. 여기는 순서 · 멈추는 곳 · 판단할 것만 갖는다.

RESUME → PLAN → DEVELOP → REVIEW → QA → PR → CLEAN-UP

- **사람이 하는 일은 둘이다** — PLAN의 합의와 머지. 그 사이는 묻지 않고 간다.
- **따로 멈추는 곳은 넷이다** — 대상 저장소의 Gradle 실행(`AGENTS.md` "승인이 필요한 것"), 합의한 성공 기준을 못 맞추거나 범위를 바꿔야 할 때, `review` 스킬이 있는데 리뷰어를 띄울 수 없을 때, PR의 CI가 실패했을 때. 멈추면 무엇이 왜 어긋났는지 보고한다.
- 상태는 git · GitHub에서 읽는다 — 다시 불리면 RESUME이 멈춘 자리를 찾는다.

## RESUME — 멈춘 자리를 찾는다

`git fetch` 뒤 위에서부터 처음 맞는 줄로 간다.

| 지금 | 간다 |
|---|---|
| 베이스 체크아웃 | 멈춘다 — 아무것도 만들지 않고, 작업 워크트리 안에서 다시 부르라고 알린다 |
| 이 브랜치의 PR이 `MERGED` | CLEAN-UP |
| 열린 PR이 있다 | 로컬에 PR head 뒤 커밋이 있으면 REVIEW(수정 확인)와 QA를 거쳐 PR의 밀기와 본문 다시 쓰기부터, 없으면 PR의 CI 보기부터 |
| `origin/develop` 위에 커밋이 있다 | REVIEW(그 뒤 QA) — 개발이 덜 끝났으면 DEVELOP |
| 커밋이 없다 | 합의한 계획이 대화에 있으면 DEVELOP, 없으면 PLAN |

## PLAN — 읽기만 하고 합의한다

코드와 저장소 문서에서 사실을 확인한 뒤, 아래 한 화면으로 합의한다. 인계 노트가 인용한 커밋 · 코드 줄 · 관찰값과 문서 문장의 사실 주장은 계획을 보이기 전에 지금 코드에서 확인하고(`git cat-file -e` · `git log -S` · 그 줄 읽기), 어긋난 것은 계획에 적는다. 열린 결정이 있거나 인자가 `grill`이면 `grilling` 스킬로 하나씩 정한다(없으면 대화로) — 아래 한 화면을 산출물 형식으로 넘기고, `[최종]`이 합의다.

```
무엇을    <바꾸는 것 한두 줄 · 고칠 자리>
성공 기준  1. … (무엇으로 확인하나)  2. …
뺀 것     … (이유)
```

## DEVELOP — 성공 기준을 달성한다

- **PLAN에서 합의한 성공 기준을 달성한다.** 기준마다 무엇을 쳐서 무엇을 봤는지 증거를 남긴다.
- **`sh tools/check-local.sh`가 0이 될 때까지 고친다**(린트 · 기본 테스트). 결과대로 고쳐 다시 돌린다.

## REVIEW — 짠 쪽의 가정을 모르는 눈이 본다

리뷰어(`reviewer-<등급>`)가 `review` 스킬과 `dev-skills-src/review.md`로 판정한다. 등급은 분류기가 고른다 — 워크트리 루트에서 돌린다.

```sh
test -f ~/.codex/skills/review/scripts/review_tier.py     # 실패하면 review 스킬이 없다 — 건너뛴다
python3 ~/.codex/skills/review/scripts/review_tier.py --range origin/develop..HEAD --config dev-skills-src/review.md
```

- **`test -f`가 실패하면** `review` 스킬이 없는 환경이다 — 건너뛰고 "독립 리뷰 없음"을 적는다. **있는데 리뷰어를 띄울 수 없으면 멈춘다** — 자기 diff를 다시 읽는 것으로 대신하지 않는다.
- 출력 첫 줄이 등급이다. `skip`이면 띄우지 않는다. 종료 코드 2면 `high`로 띄우고 stderr를 넘긴다.
- 위임에는 기준(`origin/develop`과의 merge-base) · 끝 커밋을 SHA로, 분류기 근거 · 계획과 성공 기준 · 증거 · `check-local.sh` 요약을 넘긴다.

리뷰어 정의는 `~/.codex/agents/reviewer-<등급>.toml`이다.

- 커스텀 에이전트 이름을 지정할 수 있으면 그 리뷰어로 띄운다.
- 일반 협업 도구만 있으면 그 TOML의 `developer_instructions`를 위임 프롬프트 앞에 넣고 `fork_turns: "none"` · `reasoning_effort: <등급>`으로 띄운다.
- 그 effort를 지원하지 않으면 지원되는 가장 높은 effort로 띄우고, 요청 등급과 실제 값을 PR 본문의 "꼭 봐 주세요"에 적는다. 적용 절은 원래 등급의 지시 그대로 둔다.
- **협업 도구 자체가 없으면 멈춘다** — 독립 리뷰를 못 했다고 보고하고, 자기 diff를 다시 읽는 것으로 리뷰를 대신하지 않는다.

결과는 이렇게 다룬다.

- **고칠 것** — 고치거나, 안 고치는 이유를 PR 본문의 "꼭 봐 주세요"에 적는다. 고쳤으면 그 고침이 닿는 성공 기준 증거를 다시 보고 `check-local.sh`를 다시 통과시킨다.
- **물을 것** — 계획 · 범위 · 공개 계약(CLI 출력 · 매니페스트) · 결정(`D-<n>`)을 건드리면 멈추고 묻는다. 나머지는 리뷰어 추천안으로 처리하고 질문과 고른 것을 PR 본문의 "꼭 봐 주세요"에 적는다.
- **머지 위험 줄**과 diff만으로 확정하지 못한 위험은 PR 본문의 "꼭 봐 주세요"에 사람 말로 옮긴다 — 본문에는 "머지 위험"이라는 줄을 따로 두지 않는다.

## QA — 리뷰가 끝난 끝 커밋을 실제 화면에서 본다

사람이 PR 뒤에 하던 화면 확인을 에이전트가 먼저 한다. REVIEW가 끝난 끝 커밋으로 돈다 — 리뷰 수정마다 다시 돌지 않으려는 순서다. 짠 에이전트가 계획 맥락을 쥔 채 직접 하고 서브에이전트로 떼지 않는다. 통합 테스트는 CI가 맡으므로 QA에서 돌리지 않는다 — 로컬에서 또 돌리면 CI와 자원이 겹친다.

- **해당 없음** — 둘 중 하나면 그 이유를 "QA 해당 없음 — <이유>"로 적고 PR로 간다. 제품 입력이 develop과 같거나, 성공 기준에 뷰어 · CLI로 볼 것이 없다. 제품 입력은 `tools/check-local.sh`의 `INPUTS`에 `plugin/bin`을 더한 경로다.

  ```sh
  # sh로 감싼다 — zsh는 $P를 단어로 나누지 않아 plugin/bin만 보고 "해당 없음"으로 잘못 건너뛴다
  sh -c 'P="$(sed -n "s/^INPUTS=\"\(.*\)\"\$/\1/p" tools/check-local.sh)"; test -n "$P" || exit 2; git diff --quiet "$(git merge-base origin/develop HEAD)" -- plugin/bin $P'
  # 0 해당 없음 · 1 제품 입력이 바뀌었다 · 2 INPUTS를 못 읽었다 — 판정하지 않고 멈춘다
  ```

- **빌드하고 띄운다** — `AGENTS.md`의 워크트리 프리뷰 규칙대로 이 워크트리를 빌드하고 그 `plugin/bin/prevue`를 쓴다. 대상은 저장소 픽스처(`fixtures/pearl` · `fixtures/pearl-kmp` · `fixtures/pearl-demo`)다 — 그 밖의 대상은 `AGENTS.md` "승인이 필요한 것"이다. 같은 대상을 다른 데몬이 보고 있으면 `AGENTS.md` "개발 위생"대로 띄운다.
- **성공 기준 중 뷰어 · CLI로 봐야 하는 것을 직접 확인한다.** CLI는 그 `prevue` 명령의 응답 · 종료 코드 · PNG로 본다. 뷰어는 Chrome으로 본다 — `tests/viewer/*.mjs`처럼 CDP로 몰아 스크린샷 · DOM · 진행 중인 애니메이션(`getAnimations()`) · 모션 줄이기(`Emulation.setEmulatedMedia`)를 보고, 프레임 간격은 `tools/scroll-jank.mjs --headed --trace`로 잰다. 모션은 시작 · 중간 · 끝 프레임을 찍어 본다. 기준마다 무엇을 해서 무엇을 봤는지 증거를 남긴다(그림은 `.cache/` 아래).
- **"사람 확인 전"은 에이전트가 할 수 없는 것만**, 이유와 함께 남긴다 — 실제 화면에서 느끼는 부드러움처럼 찍거나 잴 수 없는 것.
- **결함이 나오면** 고친다 → `check-local.sh` → REVIEW 수정 확인(분류기에 `--range <QA를 돈 커밋>..HEAD --recheck`, 직전 결과 자리에 QA 결함) → 새 끝 커밋으로 QA를 다시 한다. PR에 올라가는 끝 커밋은 QA를 거친 커밋이다. 고쳐도 성공 기준을 못 맞추면 멈춘다.

## PR — 올리고, 머지는 사람이 한다

`check-local.sh`와 QA를 거친 커밋을 밀고 `gh pr create --base develop`으로 연다 — 드래프트로 만들지 않는다. 본문은 `dev-skills-src/pr-template.md`의 구성과 문체로 쓴다(검증이 원 기록이다: 확인한 것 · 확인하지 못한 것 · 꼭 봐 주세요). QA 결과는 "확인한 것"에, "사람 확인 전"은 "확인하지 못한 것"에, 리뷰 결과는 "꼭 봐 주세요"에 사람 말로 담는다(건너뛰었으면 "독립 리뷰 없음"). 끝에 세션의 PR 서명 줄.

- **PR을 연 뒤 커밋을 올리면**(수정 · 추가 QA · 구조 변경) 밀고 나서 본문 전체를 현재 상태로 다시 쓴다 — `gh pr edit --body-file`. 갱신 코멘트를 따로 남기지 않는다.

- QA에서 에이전트가 할 수 없었던 확인은 이유와 함께 "확인하지 못한 것"에 "사람 확인 전"으로 적어 두고 막지 않는다.
- develop이 앞서 충돌하면 `git merge origin/develop`으로 따라가고 `check-local.sh`를 다시 통과시켜 민다 — 리베이스 · 강제 푸시를 하지 않는다. 병합이 제품 입력(QA의 경로)을 바꿨으면 밀기 전에 QA를 다시 한다.
- **CI를 기다린다** — `gh pr checks <N> --required --watch`. 종료 0이면 초록이다. "no required checks reported"로 끝나면 실패가 아니다 — `ci-success`는 앞 job이 다 끝나야 생긴다. 몇 분 뒤 다시 친다(종료 코드는 실패와 같아 메시지로 가른다).
- **실패하면 멈춰** 어느 job · 스텝이 무엇으로 실패했는지(`gh run view <id> --log-failed`의 요지) 보고한다. 다시 불려 고쳤으면 REVIEW를 수정 확인으로 띄우고(분류기에 `--range <실패한 head>..HEAD --recheck`, 직전 결과 자리에 CI 실패 요지) QA를 거쳐 민다.
- **초록이면 멈춘다 — `gh pr merge`를 부르지 않는다.** PR 본문의 검증 기록에 CI 실행 링크를 채우고, 보고에 PR 링크와 "머지한 뒤 `/implement`로 다시 부르면 이어 간다"를 싣는다.

## CLEAN-UP — 머지된 뒤 이 작업의 것만 치우고 보고한다

PR이 `MERGED`일 때만 한다. `plugin/bin/prevue stop --mine`으로 데몬을 멈추고, 원격 작업 브랜치가 남아 있으면 지운다. 다른 워크트리는 머지됐어도 건드리지 않는다. 워크트리와 로컬 브랜치는 만든 쪽이 지운다. 그 뒤 `retro` 스킬을 **남기기**로 로드한다(없으면 건너뛴다) — 규약은 `dev-skills-src/retro.md`다.

끝으로 바뀐 것 · PR 링크 · 머지 커밋 · 성공 기준별 검증 · 리뷰 결과 · QA 결과 · 회고 노트 · 남은 사람 확인 · "워크트리 정리 남음 — <워크트리 경로>"를 한 덩어리로 보고한다. 건너뛰거나 멈춘 단계는 그대로 말한다.
