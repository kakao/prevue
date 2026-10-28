---
name: implement
description: Prevue 저장소의 코드를 바꾸는 작업을 계획 합의부터 머지 · 워크트리 정리 · 볼트 캡처까지 끝까지 간다. PR로 가는 경로(src · bin · viewer · skills-src · dev-skills-src · tools · 워크플로 · 빌드 파일)를 고치거나 기능을 더해 달라는 요청에 쓴다 — 원인 조사 · 질문 · 문서만 고치는 일에는 쓰지 않는다. /implement로도 부르고(/implement grill이면 grilling으로 계획한다), 멈춘 자리부터 이어 간다.
---
<!-- 생성물이다. dev-skills-src/implement/SKILL.md 를 고치고 tools/gen-skills.sh 로 만든다 -->

# implement — 작업 하나를 머지까지

규칙(브랜치 · 워크트리 · 머지 권한 · 지우면 안 되는 것)은 `AGENTS.md`의 "브랜치와 워크트리" 절이 갖는다 — 여기는 절차만 갖는다.

- **사람에게 묻는 곳은 계획 합의 한 번이다.** 그 뒤에는 머지 · 볼트 캡처 · 치우기까지 간다. 따로 멈추는 곳은 둘 — 대상 저장소의 Gradle 실행(`AGENTS.md` "승인이 필요한 것"), 그리고 합의한 성공 기준을 못 맞추거나 범위를 바꿔야 할 때. 멈추면 무엇이 왜 어긋났는지 보고한다.
- 상태는 git · GitHub · 볼트에서 읽는다(볼트는 읽기만 한다). 따로 적어 두는 파일이 없다 — 다시 불리면 0단계가 멈춘 자리를 찾는다.
- **볼트에 노트를 직접 쓰지 않는다.** 볼트에 남기는 것은 `wiki-ingest` 스킬의 보류 캡처 갈래로 넘기는 과업 캡처 셋(1단계 계획 · 2단계 착수 · 6단계 머지)뿐이고, 형식과 노트 모양은 위키 스킬과 볼트가 갖는다 — 여기서는 재료만 넘긴다. 노트를 만들고 옮기는 것(작업 노트 · Archive · 개발 문서 · 결정 기록)은 볼트 쪽 편입이 한다.

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
| 베이스 체크아웃 — `develop`이고 깨끗하다(아니면 이유를 말하고 멈춘다) | 1. 계획 |
| 워크트리, 이 브랜치의 PR이 `MERGED`이고 `볼트 머지 캡처` 코멘트가 없다 | 6. 볼트 |
| 워크트리, 이 브랜치의 PR이 `MERGED` | 7. 치우기 |
| 워크트리, 열린 PR이 있다 | 5. 머지 |
| 워크트리, `origin/develop` 위에 커밋이 있다 | 4. 리뷰 — 개발이 덜 끝났으면 3 |
| 워크트리, 커밋이 없다 | 합의한 계획(대화 · 볼트 작업 노트 · 볼트 `+`의 계획 캡처)이 있으면 3, 없으면 1 — 워크트리 만들기는 건너뛴다 |

## 1. 계획 — 베이스에서 읽기만

코드와 볼트 문서(`AGENTS.md`의 문서 표 순서)에서 사실을 먼저 확인한다. 재현이 필요하면 베이스의 `bin/prevue`로 본다 — 고치지 않는다.

- **열린 결정이 있으면**(대안이 갈리거나 기준을 정해야 한다) `grilling` 스킬로 하나씩 정한다. 인자가 `grill`이면 늘 이쪽이다. 사용자 레벨 전역 스킬이라 Prevue 규약은 부르는 여기가 넘긴다.
  - 사실 확인 순서 — `AGENTS.md` 문서 표의 순서대로, 코드와 볼트 문서를 읽고 묻는다. 볼트 경로(`CLAUDE.local.md`)도 함께 넘긴다.
  - 산출물 형식 — `[최종]`의 본문을 아래 한 화면 계획(무엇을 · 성공 기준 · 뺀 것 · Sub-Task · 워크트리)으로 쓴다.
  - `[최종]`이 오면 그것이 합의다 — 다시 묻지 않고 아래 계획 캡처를 남긴 뒤 2단계로 간다.
- **없으면** 한 화면으로 보이고 "진행할까요?"를 받는다.

```
무엇을    <바꾸는 것 한두 줄 · 고칠 자리>
성공 기준  1. … (무엇으로 확인하나)  2. …
뺀 것     … (이유)
Sub-Task  <이름> | 없음
워크트리   <작업명>
```

합의가 이 스킬의 유일한 확인이다. 고쳐 달라면 고쳐 다시 보인다. 거절하면 아무것도 만들지 않고 멈춘다.

**Sub-Task.** Sub-Task는 PR 단위가 아니라 작업 단위다 — PR 없이 끝나는 Sub-Task(심사 · 이전 같은 절차)도 있다. 이 스킬이 다루는 것은 PR로 끝나는 Sub-Task이고, 그 PR이 머지되면 Sub-Task가 닫힌다. 이름은 PR 본문 키(5단계)이자 볼트 노트 이름이 되므로 머지 전에는 바꾸지 않는다.

- **기존 작업 노트를 잇는 일**(한 화면짜리여도) — 그 노트의 `## Sub-Task`(Sub-Task 노트는 `Efforts/On/Prevue <작업>/` 폴더에 있다)에서 아직 끝나지 않은 Sub-Task를 골라 그 이름을 쓴다. 맞는 것이 없을 때만 새 Sub-Task를 정한다.
- **grilling을 거친 새 작업** — 작업과 Sub-Task를 함께 정한다.
- **작업 노트가 없는 한 화면짜리 작업** — 단발이라 `없음`이다. 성공 기준은 PR 본문이 갖는다.

**계획 캡처 — Sub-Task를 새로 정했을 때.** 세션을 넘겨 이어받을 자리가 볼트의 작업 노트뿐이라 지금 남긴다. 고른 Sub-Task가 이미 있으면 남기지 않는다. `wiki-ingest` 스킬을 보류 캡처 갈래로 로드해 넘길 재료:

- origin `prevue` · `worktree-<작업명>`, 작업 이름(기존 작업이면 그 노트 이름 — 그때는 새 Sub-Task만), 한 줄 · 왜 · 범위(한다 · 뺀다와 이유) · 성공 기준
- 결정 — 정한 것 · 기각한 것과 이유. 뒤집을 조건이 있는 결정에는 다음 `D-<n>`을 붙인다 — `Prevue 결정 기록`의 마지막 번호와 볼트 `+`의 계획 캡처에 이미 붙은 번호 중 큰 것의 다음이다. 읽기만 하고, 결정 기록에 옮기는 것은 볼트 쪽이다
- Sub-Task마다 이름 · 계획 · 검증 · 선행
- Prevue 재료 — 예상 버전(대개 `VERSION`의 다음 마이너), 성격(버그 · 기능 · 개선 · 조사)

볼트 경로(문서를 읽는 곳)는 개인 파일이 갖는다 —
`~/.codex/AGENTS.md`.
볼트나 `wiki-ingest` 스킬이 없으면 캡처를 모두 건너뛰고 보고에 적는다.

## 2. 워크트리

Claude Code와 Codex 모두 저장소 루트의 공용 폴더 `.worktrees/`를 쓴다. Claude Code의 `EnterWorktree`는 `.claude/worktrees/`를 만들므로 여기서는 Git으로 직접 만든다.

```sh
git fetch -q origin
git worktree add .worktrees/<작업명> -b worktree-<작업명> origin/develop
```


**착수 캡처 — Sub-Task가 `없음`이 아닐 때.** 워크트리를 새로 만들었으면 `wiki-ingest` 스킬을 보류 캡처 갈래로 로드해 origin `prevue` · `worktree-<작업명>`과 이번에 착수하는 Sub-Task 이름을 넘긴다 — 볼트가 그 Sub-Task를 진행 중으로 바꾼다. 이어 하는 세션(워크트리가 이미 있다)은 남기지 않는다. 볼트나 `wiki-ingest` 스킬이 없으면 건너뛴다.

이후 명령은 전부 그 디렉터리에서 돈다.

```sh
git log -1 --oneline                 # origin/develop 의 끝인지 본다 — 아니면 origin/HEAD 가 main 이다(AGENTS.md 클론 직후)
./gradlew --offline installPrevue    # 이 체크아웃의 bin/prevue 가 쓸 실행 파일. 스킬 · 문서만 고치면 건너뛴다
```

## 3. 개발

- **성공 기준마다 증거를 남긴다** — 무엇을 쳐서 무엇을 봤는지. 5단계의 검증 기록이 된다.
  - 단위 테스트 `./gradlew --offline test` · CLI 판정 `python3 -m unittest discover -s tests/cli` · 스킬 두 벌 `sh tools/gen-skills.sh --check`
  - 렌더는 **이 워크트리의** `bin/prevue`로 본다(`AGENTS.md` "브랜치와 워크트리").
  - 뷰어는 헤드리스 Chrome으로 본다. 모션 느낌 · Safari처럼 사람 눈이 필요한 것은 "사람 확인 전"으로 적어 두고 막지 않는다.
- 사용자에게 보이는 변화는 `CHANGELOG.md` `[Unreleased]`에 적는다.
- 검증장 · 대상 체크아웃은 `AGENTS.md` "개발 위생"을 따른다.
- 커밋은 조각마다. 끝에 세션의 공동 저자 줄을 붙인다.

## 4. 리뷰

diff가 README · CHANGELOG · 그림뿐이면 건너뛴다.

`git diff origin/develop...HEAD`를 처음 보는 것처럼 다시 읽는다 — 동시성 · 실패 경로 · 상태 꼬임 · 계약(JSON · 종료 코드)이 바뀌었는지를 본다.

지적은 고치거나, 고치지 않으면 이유를 PR 본문에 적는다. 고쳤으면 그 고침이 닿는 3단계 증거를 다시 본다.

## 5. 로컬 검증 → PR → 머지

develop으로 가는 PR에도 빌드 검증(CI)이 돌지만 머지 관문은 아니다 — 외부 기여 PR을 받는 그물이다(`AGENTS.md`). 머지 관문은 밀기 전에 마지막 커밋에서 돌리는 넷이다.

```sh
sh tools/gen-skills.sh --check
python3 -m unittest discover -s tests/cli
./gradlew --offline test             # 소스 · 빌드 파일을 안 건드렸으면(문서 · 스킬만) 건너뛴다
sh tools/lint.sh                     # Kotlin · 뷰어 날값 린트(D-70 · D-96) — 판단하지 말고 결과대로 고친다
```

하나라도 실패하면 고쳐 다시 돌린다. 통과한 결과(테스트 수)를 PR 본문의 검증 기록에 적는다.

```sh
git push -u origin HEAD
gh pr create --base develop --title "<무엇을 · 왜 한 줄>" --body "<본문>"   # 열린 PR이 이미 있으면(이어 가는 중) 밀기만 하고 건너뛴다
```

본문: 맨 위 줄에 `<!-- subtask: <Sub-Task 이름> -->`(`없음`이면 이 줄을 두지 않는다 — 6단계와 `/ship`이 이 키로 Sub-Task를 찾는다), 무엇을 · 왜, 성공 기준과 검증(여기가 원 기록이다), 고치지 않은 리뷰 지적과 이유, 사람 확인이 남았으면 그것. 끝에 세션의 PR 서명 줄.

- **develop이 앞서 충돌하면** `git fetch -q origin` · `git rebase origin/develop` 뒤 위의 로컬 검증을 다시 돌리고 `git push --force-with-lease`.

PR 본문의 성공 기준 결과 · 검증 기록을 채우고 머지한다.

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
bin/prevue stop --mine
git push origin --delete <브랜치>
```

베이스 체크아웃으로 돌아가 `git worktree remove .worktrees/<작업명>` · `git branch -D worktree-<작업명>` · `git pull --ff-only origin develop`.

이 세션이 만든 워크트리만 지운다. 다른 경로에서 시작한 기존 워크트리는 옮기거나 지우지 않는다.

## 8. 보고

무엇이 바뀌었나 · PR 링크 · 머지 커밋 · 성공 기준별 검증 · 남긴 볼트 캡처 · 남은 사람 확인을 한 덩어리로 말한다. 건너뛰거나 멈춘 단계는 그대로 말한다. develop에 쌓인 변화가 릴리즈할 만하면 `/ship`을 권하기만 한다.
