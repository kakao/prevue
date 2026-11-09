---
name: implement
description: Prevue 저장소의 코드를 바꾸는 작업을 그 작업의 워크트리 안에서 계획 합의부터 머지 · 볼트 캡처까지 끝까지 간다. PR로 가는 경로(src · bin · viewer · skills-src · dev-skills-src · tools · 워크플로 · 빌드 파일)를 고치거나 기능을 더해 달라는 요청에 쓴다 — 원인 조사 · 질문 · 문서만 고치는 일에는 쓰지 않는다. /implement로도 부르고(/implement grill이면 grilling으로 계획한다), 멈춘 자리부터 이어 간다.
---
<!-- 생성물이다. dev-skills-src/implement/SKILL.md 를 고치고 tools/gen-skills.sh 로 만든다 -->

# implement — 작업 하나를 머지까지

규칙(브랜치 · 워크트리 · 머지 권한 · 지우면 안 되는 것)은 `AGENTS.md`의 "브랜치와 워크트리" 절이 갖는다 — 여기는 절차만 갖는다.

- **사람에게 묻는 곳은 계획 합의 한 번이다.** 그 뒤에는 머지 · 볼트 캡처 · 치우기까지 간다. 따로 멈추는 곳은 넷 — 대상 저장소의 Gradle 실행(`AGENTS.md` "승인이 필요한 것"), 합의한 성공 기준을 못 맞추거나 범위를 바꿔야 할 때(4단계 리뷰의 물을 것이 계획 · 범위 · 공개 계약 · 결정을 건드릴 때도), 독립 리뷰어를 띄울 수 없을 때(4단계), 그리고 PR의 CI가 실패했을 때(5단계). 멈추면 무엇이 왜 어긋났는지 보고한다.
- **워크트리를 만들고 지우는 것은 이 스킬 밖의 일이다** — 작업을 넘기는 쪽(사람이나 오케스트레이터)이 만들고, 머지 뒤에 지운다. 이 스킬은 그 워크트리 안에서만 돈다.
- 상태는 git · GitHub · 볼트에서 읽는다(볼트는 읽기만 한다). 따로 적어 두는 파일이 없다 — 다시 불리면 0단계가 멈춘 자리를 찾는다.
- **볼트에 노트를 직접 쓰지 않는다.** 볼트에 남기는 것은 `wiki-ingest` 스킬의 보류 캡처 갈래로 넘기는 과업 캡처 둘(1단계 계획 · 6단계 머지)뿐이고, 형식과 노트 모양은 위키 스킬과 볼트가 갖는다 — 여기서는 재료만 넘긴다. 노트를 만들고 옮기는 것(작업 노트 · Archive · 개발 문서 · 결정 기록)은 볼트 쪽 편입이 한다.

## 0. 어디서부터인가

```sh
git rev-parse --abbrev-ref HEAD; git status --porcelain
git fetch -q origin
git rev-list --count origin/develop..HEAD
gh pr list --head "$(git rev-parse --abbrev-ref HEAD)" --state all --json number,state,url
gh pr view <그 번호> --json comments -q '.comments[].body'     # MERGED 면 — 6단계의 볼트 머지 캡처 코멘트가 있나
```

위에서부터 처음 맞는 줄로 간다.

| 지금 | 간다 |
|---|---|
| 베이스 체크아웃 | 멈춘다 — 아래 "베이스에서 불렸으면" |
| 워크트리, 이 브랜치의 PR이 `MERGED`이고 `볼트 머지 캡처` 코멘트가 없다 | 6. 볼트 |
| 워크트리, 이 브랜치의 PR이 `MERGED` | 7. 치우기 |
| 워크트리, 열린 PR이 있다 | 5. 머지 |
| 워크트리, `origin/develop` 위에 커밋이 있다 | 4. 리뷰 — 개발이 덜 끝났으면 3 |
| 워크트리, 커밋이 없다 | 합의한 계획(대화 · 볼트 작업 노트 · 볼트 `+`의 계획 캡처)이 있으면 2, 없으면 1 |

**베이스에서 불렸으면** 아무것도 만들지 않고, 이 작업의 워크트리를 먼저 만들어 그 안에서 다시 부르라고 알린다. 만드는 법은 개인 문서에 있으면 그것을, 없으면 베이스에서 `git fetch -q origin` · `git worktree add .worktrees/<작업명> -b worktree-<작업명> origin/develop`을 알려 준다. 개인 문서(추적하지 않는 파일)는 Git으로 만든 워크트리에 따라오지 않는다.

## 1. 계획 — 읽기만

코드와 볼트 문서(`AGENTS.md`의 문서 표 순서)에서 사실을 먼저 확인한다. 재현이 필요하면 2단계의 빌드 뒤 이 워크트리의 `plugin/bin/prevue`로 본다 — 고치지 않는다.

- **열린 결정이 있으면**(대안이 갈리거나 기준을 정해야 한다) `grilling` 스킬로 하나씩 정한다. 인자가 `grill`이면 늘 이쪽이다. 사용자 레벨 전역 스킬이라 Prevue 규약은 부르는 여기가 넘긴다.
  - 사실 확인 순서 — `AGENTS.md` 문서 표의 순서대로, 코드와 볼트 문서를 읽고 묻는다. 볼트 경로(사용자 레벨 지시 파일에 적힌 절대 경로)도 함께 넘긴다.
  - 산출물 형식 — `[최종]`의 본문을 아래 한 화면 계획(무엇을 · 성공 기준 · 뺀 것 · Sub-Task)으로 쓴다.
  - `[최종]`이 오면 그것이 합의다 — 다시 묻지 않고 아래 계획 캡처를 남긴 뒤 2단계로 간다.
- **없으면** 한 화면으로 보이고 "진행할까요?"를 받는다.

```
무엇을    <바꾸는 것 한두 줄 · 고칠 자리>
성공 기준  1. … (무엇으로 확인하나)  2. …
뺀 것     … (이유)
Sub-Task  <이름> | 없음
```

합의가 이 스킬의 유일한 확인이다. 고쳐 달라면 고쳐 다시 보인다. 거절하면 아무것도 만들지 않고 멈춘다.

**Sub-Task.** Sub-Task는 PR 단위가 아니라 작업 단위다 — PR 없이 끝나는 Sub-Task(심사 · 이전 같은 절차)도 있다. 이 스킬이 다루는 것은 PR로 끝나는 Sub-Task이고, 그 PR이 머지되면 Sub-Task가 닫힌다. 이름은 PR 본문 키(5단계)이자 볼트 노트 이름이 되므로 머지 전에는 바꾸지 않는다.

- **기존 작업 노트를 잇는 일**(한 화면짜리여도) — 그 노트의 `## Sub-Task`(Sub-Task 노트는 `Efforts/On/Prevue <작업>/` 폴더에 있다)에서 아직 끝나지 않은 Sub-Task를 골라 그 이름을 쓴다. 맞는 것이 없을 때만 새 Sub-Task를 정한다.
- **grilling을 거친 새 작업** — 작업과 Sub-Task를 함께 정한다.
- **작업 노트가 없는 한 화면짜리 작업** — 단발이라 `없음`이다. 성공 기준은 PR 본문이 갖는다.

**계획 캡처 — Sub-Task를 새로 정했을 때.** 세션을 넘겨 이어받을 자리가 볼트의 작업 노트뿐이라 지금 남긴다. 고른 Sub-Task가 이미 있으면 남기지 않는다. `wiki-ingest` 스킬을 보류 캡처 갈래로 로드해 넘길 재료:

- origin `prevue` · 이 브랜치, 작업 이름(기존 작업이면 그 노트 이름 — 그때는 새 Sub-Task만), 한 줄 · 왜 · 범위(한다 · 뺀다와 이유) · 성공 기준
- 결정 — 정한 것 · 기각한 것과 이유. 뒤집을 조건이 있는 결정에는 다음 `D-<n>`을 붙인다 — `Prevue 결정 기록`의 마지막 번호와 볼트 `+`의 계획 캡처에 이미 붙은 번호 중 큰 것의 다음이다. 읽기만 하고, 결정 기록에 옮기는 것은 볼트 쪽이다
- Sub-Task마다 이름 · 계획 · 검증 · 선행
- Prevue 재료 — 예상 버전(대개 `plugin/VERSION`의 다음 마이너), 성격(버그 · 기능 · 개선 · 조사)

볼트 경로(문서를 읽는 곳)는 사용자 레벨 지시 파일이 갖는다 —
`~/.codex/AGENTS.md`.
볼트나 `wiki-ingest` 스킬이 없으면 캡처를 모두 건너뛰고 보고에 적는다.

## 2. 준비

```sh
git log -1 --oneline                 # origin/develop 의 끝인지 본다 — 아니면 origin/HEAD 가 main 이다(AGENTS.md 클론 직후)
(cd plugin/daemon && ./gradlew --offline installPrevue)    # 이 체크아웃의 plugin/bin/prevue 가 쓸 실행 파일. 스킬 · 문서만 고치면 건너뛴다
python3 tools/lint/viewer.py --deps 2>/dev/null || npm ci --prefix viewer-src    # node_modules 는 git 밖이라 새 워크트리에 없다 — 없으면 tools/lint.sh 가 종료 2로 멈춘다. 판정은 viewer.py 가 갖는다
```

## 3. 개발

- **성공 기준마다 증거를 남긴다** — 무엇을 쳐서 무엇을 봤는지. 5단계의 검증 기록이 된다.
  - 단위 테스트 `(cd plugin/daemon && ./gradlew --offline test)` · CLI 판정 `python3 -m unittest discover -s tests/cli` · 스킬 두 벌 `sh tools/gen-skills.sh --check`
  - 렌더는 **이 워크트리의** `plugin/bin/prevue`로 본다(`AGENTS.md` "브랜치와 워크트리").
  - 뷰어는 헤드리스 Chrome으로 본다. 모션 느낌 · Safari처럼 사람 눈이 필요한 것은 "사람 확인 전"으로 적어 두고 막지 않는다.
- 사용자에게 보이는 변화는 `CHANGELOG.md` `[Unreleased]`에 적는다 — 무엇을 어떤 모양으로 쓰나, 외부 제보 · 기여를 어떻게 멘션하나는 `dev-skills-src/release-notes.md`가 갖는다. 그 항목이 곧 GitHub Release 본문이다.
- 검증장 · 대상 체크아웃은 `AGENTS.md` "개발 위생"을 따른다.
- 커밋은 조각마다. 끝에 세션의 공동 저자 줄을 붙인다.

## 4. 리뷰

짠 쪽의 가정을 모르는 눈이 본다 — 사용자 레벨 리뷰어(`reviewer-<등급>`)가 `review` 스킬과 이 저장소의 리뷰 규약(`dev-skills-src/review.md`, `AGENTS.md` "리뷰")으로 판정한다. 등급은 분류기가 고른다. 워크트리 루트에서 돌린다 — 규약 경로가 상대 경로다.

```sh
python3 ~/.codex/skills/review/scripts/review_tier.py --range origin/develop..HEAD --config dev-skills-src/review.md
git merge-base origin/develop HEAD   # 기준 ref — 0단계의 fetch로 origin/develop이 앞서 나가도 이 작업분만 보게 SHA로 넘긴다
git rev-parse HEAD                   # 끝 커밋 — 리뷰 중에 고쳐도 범위가 흔들리지 않게 SHA로 고정한다
```

첫 줄이 등급, 둘째 줄부터 근거다.

- **`skip`** — 바뀐 파일이 전부 규약의 건너뛰기 패턴에 맞는다. 리뷰어를 띄우지 않고 5단계로 간다.
- **`medium` · `high` · `xhigh`** — 그 등급의 리뷰어에 위임한다. **종료 코드 2**(판정 못 함)면 `high`로 띄우고 stderr를 위임 프롬프트에 함께 넘긴다.

위임 프롬프트에는 기준 ref(위 merge-base SHA) · 끝 커밋 SHA · 분류기 근거 줄 · 합의한 계획과 성공 기준 · 3단계 증거(무엇을 돌려 무엇을 봤나)를 넣는다.

리뷰어 정의는 `~/.codex/agents/reviewer-<등급>.toml`이다.

- 커스텀 에이전트 이름을 지정할 수 있으면 그 리뷰어로 띄운다.
- 일반 협업 도구만 있으면 그 TOML의 `developer_instructions`를 위임 프롬프트 앞에 넣고 `fork_turns: "none"` · `reasoning_effort: <등급>`으로 띄운다.
- 그 effort를 지원하지 않으면 지원되는 가장 높은 effort로 띄우고, 요청 등급과 실제 값을 PR 본문에 적는다. 적용 절은 원래 등급의 지시 그대로 둔다.
- **협업 도구 자체가 없으면 멈춘다** — 독립 리뷰를 못 했다고 보고하고, 자기 diff를 다시 읽는 것으로 리뷰를 대신하지 않는다.

결과를 이렇게 처리한다.

- **고칠 것** — 고치거나, 고치지 않으면 이유를 PR 본문에 적는다. 고쳤으면 그 고침이 닿는 3단계 증거를 다시 본다.
- **물을 것** — 계획 · 범위나 기존 공개 계약(CLI 출력 · 매니페스트)을 바꿔야 하거나, 결정(결정 기록 · 개발 문서의 되돌리지 말 것)을 뒤집는 것이면 멈추고 묻는다. 나머지(API 모양 · 읽기 쉬움처럼 취향이 갈리는 것)는 리뷰어 추천안으로 처리하고 질문과 고른 것을 PR 본문에 적는다.
- **머지 위험 줄**은 PR 본문에 옮긴다.

## 5. 로컬 검증 → PR → 머지

머지 관문은 둘이다 — 밀기 전에 마지막 커밋에서 돌리는 로컬 검증 다섯과, PR을 연 뒤 그 head에서 도는 CI(빌드 검증)의 성공. develop에는 필수 체크가 없어 서버가 막아 주지 않으므로 CI를 기다리는 것은 여기가 지킨다(`AGENTS.md`).

```sh
sh tools/gen-skills.sh --check
sh tools/plugin-copies.sh --check   # plugin/ 의 LICENSE · NOTICE.md 가 루트 원본과 같다(D-123)
python3 -m unittest discover -s tests/cli
(cd plugin/daemon && ./gradlew --offline test)   # 소스 · 빌드 파일을 안 건드렸으면(문서 · 스킬만) 건너뛴다
sh tools/lint.sh                     # Kotlin · 뷰어 날값 린트(D-70 · D-96) — 판단하지 말고 결과대로 고친다
```

하나라도 실패하면 고쳐 다시 돌린다. 통과한 결과(테스트 수)를 PR 본문의 검증 기록에 적는다.

```sh
git push -u origin HEAD
gh pr create --base develop --title "<무엇을 · 왜 한 줄>" --body "<본문>"   # 열린 PR이 이미 있으면(이어 가는 중) 밀기만 하고 건너뛴다
```

본문: 맨 위 줄에 `<!-- subtask: <Sub-Task 이름> -->`(`없음`이면 이 줄을 두지 않는다 — 6단계와 `/ship`이 이 키로 Sub-Task를 찾는다), 무엇을 · 왜, 성공 기준과 검증(여기가 원 기록이다), 리뷰 등급과 결과(고치지 않은 지적과 이유 · 추천안으로 처리한 물을 것 · 머지 위험), 사람 확인이 남았으면 그것. 끝에 세션의 PR 서명 줄.

- **develop이 앞서 충돌하면** `git fetch -q origin` · `git rebase origin/develop` 뒤 위의 로컬 검증을 다시 돌리고 `git push --force-with-lease`.

**CI를 기다린다.** CI 결과가 나오기 전에는 머지 명령을 부르지 않는다.

```sh
gh pr checks <N> --watch --fail-fast
```

"빌드 검증"(약 7~10분, job 시간 제한 20분이 기다림의 상한이다)이 초록이어야 한다. 막 연 PR은 체크가 아직 안 붙어 "no checks"로 끝나거나, `license/cla`만 붙은 채로 초록으로 끝날 수 있다 — 그래서 끝난 뒤의 아래 확인이 판정이다. 기다리는 사이 새 커밋을 밀었으면 앞 실행은 취소된다(`cancel-in-progress`) — 새 head의 실행을 다시 기다린다.

기다림이 끝나면 머지 직전에 `gh pr view <N> --json headRefOid,statusCheckRollup`로 판정한다 — `statusCheckRollup`은 head 커밋의 체크다.

- `headRefOid`가 기다림을 시작할 때의 `git rev-parse HEAD`와 다르거나, `build`가 아직 없거나 진행 중이면 조금 뒤 다시 기다린다.
- head가 같고 `build`의 `conclusion`이 `SUCCESS`면 초록이다.
- head가 같고 `build`의 `conclusion`이 `SUCCESS`가 아니면(`FAILURE` · `CANCELLED` · `SKIPPED` · `TIMED_OUT` 등) 실패다 — `gh pr checks`가 종료 0으로 끝났어도 그렇다.

**실패하면 머지하지 않고 멈춘다.** 어느 job · 어느 스텝이 무엇으로 실패했는지(`gh run view <id> --log-failed`의 요지) 보고한다. 로컬 검증이 통과했는데 CI만 실패했다면 macOS에서만 통과하는 것(Ubuntu · `sh`)일 수 있다 — 그 짐작도 함께 적되 고치지는 않는다. 다시 불려 고친 커밋이 있으면 4단계 리뷰어를 수정 확인으로 띄운다 — 분류기에 `--range <CI가 실패한 head>..HEAD --recheck`(곧 `medium`)를 주고, 위임 프롬프트의 직전 결과 자리에는 CI 실패 요지를 넘긴다. 그다음 이 단계의 로컬 검증부터 다시 돌아 민 뒤 CI를 기다린다.

초록이면 PR 본문의 성공 기준 결과 · 검증 기록(CI 실행 링크 포함)을 채우고 머지한다.

```sh
gh pr merge <N> --squash             # --delete-branch 를 붙이지 않는다
```

## 6. 볼트 — 머지 캡처

치우기 전에 남긴다 — 워크트리와 브랜치가 남아 있어야 0단계가 이 단계를 다시 찾는다. `wiki-ingest` 스킬을 보류 캡처 갈래로 로드해 머지 캡처를 남긴다. 작업 노트를 닫고 옮기는 것, 개발 문서를 지금 코드에 맞추는 것, 새 작업 노트를 만드는 것은 볼트 쪽 편입이 이 재료로 한다. 넘길 재료:

- origin `prevue` · 브랜치 · PR, Sub-Task(PR 본문 키, 없으면 `없음`), PR 제목, 머지일
- 결과 재료 — 동작 변경, 확인하지 못한 것, 범위 밖으로 남긴 것
- 인사이트 — 구조 · 구현 결정이 바뀐 것과 그 좌표(파일:줄 · 커밋)
- 후속 후보 — 이번 작업 밖에서 본 문제와 그 좌표. **사람 확인이 남았으면**(3단계의 "사람 확인 전") 확인하지 못한 것에 적고 여기에도 `사람 확인 — <무엇을>`으로 넣는다 — 작업 노트는 Sub-Task가 다 머지되면 닫히므로, 따로 챙길 일로 남겨야 잊히지 않는다
- 실측 — 숫자가 나왔으면(README 벤치마크 등) 숫자 · 조건 · 명령

Sub-Task가 `없음`이고 인사이트 · 후속 후보 · 실측도 없으면 남기지 않는다 — PR과 CHANGELOG가 기록이다. `release`는 `/ship`의 릴리즈 캡처가 채운다.

끝나면 PR에 `볼트 머지 캡처 — <캡처 경로>` 코멘트를 단다. 남기지 않았으면(재료가 없다 · 볼트나 `wiki-ingest` 스킬이 없다) `볼트 머지 캡처 — 남기지 않음(<이유>)`으로 단다 — 0단계가 이 코멘트로 이 단계를 마쳤는지 가린다.

## 7. 치우기 — 이 작업의 것만

다른 워크트리는 머지됐어도 건드리지 않는다 — 다른 세션이 쓰고 있을 수 있다.

```sh
gh pr view <N> --json state -q .state     # MERGED 일 때만 아래로
plugin/bin/prevue stop --mine
git ls-remote --exit-code --heads origin <브랜치> && git push origin --delete <브랜치>    # 이미 지웠으면 건너뛴다
```

워크트리와 로컬 브랜치는 지우지 않는다 — 이 세션이 그 안에 있고, 만든 쪽이 지운다. 8단계 보고에 "워크트리 정리 남음 — <워크트리 경로>"를 적는다.

## 8. 보고

무엇이 바뀌었나 · PR 링크 · 머지 커밋 · 성공 기준별 검증 · 남긴 볼트 캡처 · 남은 사람 확인 · 워크트리 정리 남음을 한 덩어리로 말한다. 건너뛰거나 멈춘 단계는 그대로 말한다. develop에 쌓인 변화가 릴리즈할 만하면 `/ship`을 권하기만 한다.
