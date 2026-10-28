---
name: ship
description: Prevue를 릴리즈한다. 버전 커밋을 develop에 올려 develop → main PR 하나를 열고, CI와 스킬 평가가 나란히 통과하면 머지(=배포)하고, 태그·GitHub Release를 남기고, 볼트에 릴리즈 캡처를 남긴다. 사용자가 릴리즈·배포를 지시할 때만 쓴다(/ship, /ship 0.11.0). 멈춘 자리부터 이어 간다.
---
<!-- 생성물이다. dev-skills-src/ship/SKILL.md 를 고치고 tools/gen-skills.sh 로 만든다 -->

# ship — Prevue 릴리즈

릴리즈는 **사용자가 지시할 때만** 한다. 이 스킬이 불렸다는 것이 그 지시다. 규칙(왜 PR이 하나인가 · merge commit · 직접 푸시 예외)은 `AGENTS.md`의 "릴리즈" 절이 갖는다 — 여기는 절차만 갖는다.

- 인자: 버전(`0.11.0`)을 주면 그 값을 쓴다. 없으면 제안한다.
- **사람에게 묻는 곳은 한 번이다** — 2단계의 확인. 승인 뒤에는 끝까지 가고, 실패하면 그 자리에서 멈춰 보고한다.
- 상태는 git · GitHub에서 읽는다. 따로 적어 두는 파일이 없다 — 다시 불리면 1단계가 멈춘 자리를 찾는다.

## 0. 전제

베이스 체크아웃에서 돈다(워크트리가 아니다). 하나라도 어긋나면 이유를 말하고 멈춘다.

```sh
git rev-parse --abbrev-ref HEAD          # develop
git status --porcelain                    # 비어 있다
git fetch -q origin --tags --prune
git pull --ff-only origin develop
```

## 1. 어디서부터인가

```sh
ver() { { git show "$1:plugin/VERSION" 2>/dev/null || git show "$1:VERSION"; } | tr -d ' \n'; }   # plugin/ 로 옮기기 전 판은 루트에 있다(D-123)
D=$(ver origin/develop); M=$(ver origin/main)
git rev-parse -q --verify "refs/tags/v$M"                       # main 버전의 태그
gh pr list --base main --head develop --state open --json number,url
gh pr list --base main --head develop --state merged --limit 1 --json number -q '.[0].number'   # 마지막 릴리즈 PR
gh pr view <그 번호> --json comments -q '.comments[].body'                                       # 6단계의 볼트 릴리즈 캡처 코멘트가 있나
```

위에서부터 처음 맞는 줄로 간다.

| 상태 | 간다 |
|---|---|
| `v$M` 태그가 없다 | 5. 기록 |
| `D` > `M`, 열린 `develop → main` PR이 있다 | 4. 기다리고 머지 — 스킬 평가를 실은 판인데 PR head에 `스킬 평가` 상태가 없으면 3단계의 "상태가 없는 head"부터 |
| `D` > `M`, PR이 없다 | 3단계의 PR 열기부터 |
| 마지막 릴리즈 PR에 `볼트 릴리즈 캡처` 코멘트가 없다 | 6. 볼트 — 끝나면 이 표로 돌아온다 |
| `D` = `M` | 2. 새 릴리즈 |

이어 가는 경우(`D` > `M`)는 2단계에서 이미 승인받은 버전이라 다시 묻지 않는다. 단, 그 사이 `[Unreleased]`에 새 항목이 들어왔으면 이 버전의 절로 옮길지 **한 번** 묻는다 — 옮기면 그 커밋을 develop에 밀고(3단계와 같은 방식) 이어 간다.

## 2. 새 릴리즈 — 확인 한 번

실을 것이 없으면 멈춘다: `git log --oneline origin/main..origin/develop`이 비었거나 `CHANGELOG.md`의 `## [Unreleased]` 아래에 `- ` 줄이 없다.

**버전.** 인자가 있으면 그것. 없으면 `[Unreleased]`를 읽고 제안한다 — 새 기능·동작 변화가 하나라도 있으면 마이너(`0.10.0 → 0.11.0`), 고친 것뿐이면 패치(`0.10.0 → 0.10.1`). 메이저는 사람이 적을 때만 올린다. `M`보다 높아야 하고 `v<버전>` 태그가 없어야 한다 — 머지(=배포) 전에 이것을 보는 곳은 여기뿐이다.

**CHANGELOG 정리.** `[Unreleased]`는 병렬 PR이 `merge=union`으로 쌓아 순서가 섞이고 같은 변화가 둘 셋으로 적혀 있곤 하다. 같은 변화는 하나로 합치고(뒤에 적힌 설명이 맞는 것이다), 사용자에게 큰 것부터 굵은 머리 줄 · 작은 고침은 아래로 놓는다. 사용자에게 안 보이는 줄(리팩터링 · CI)은 뺀다. 아직 파일에 쓰지 않는다.

**실린 작업.** `git log --first-parent --format='%s' v$M..origin/develop` — squash 커밋 제목의 `(#N)`이 PR이다. PR마다 본문 맨 위의 Sub-Task 키(`<!-- subtask: … -->`, 없으면 `없음`)를 읽는다 — 6단계 릴리즈 캡처의 재료다.

**스킬 평가.** `git diff --name-only v$M origin/develop -- skills-src plugin/bin/help bin/help tests/evals tools/skill-eval.sh tools/skill-eval-codex.py`가 비어 있지 않으면 스킬 · 도움말이 바뀐 판이다 — 3단계에서 **PR을 연 뒤 CI와 나란히 두 스킬 평가를 돌린다.** 평가는 모델 호출이라 CI에 없다 — 배포 전에 여기서 한 번 잰다. 확인 화면에 한 줄로 싣고, 사용자가 빼라고 하면 뺀다. 바뀐 것이 없으면 싣지 않는다.

이것을 한 화면으로 보이고 승인을 받는다.

```
0.10.0 → 0.11.0   (새 기능: 헤더 워드마크 · 파일 빠른 열기 …)
── CHANGELOG [0.11.0] (정리본) ──
- **…**
── 실리는 PR ──  #44 … · #45 … · #47 …
── 볼트 릴리즈 캡처 ──  #44 인터랙티브 성능 측정 · #45 헤더 워드마크 · #47 없음
── 스킬 평가 ──  스킬 · 도움말이 바뀌었다(skills-src 3 · bin/help 1) → PR을 연 뒤 CI와 나란히 Claude · Codex 평가를 돌린다(Claude 약 $4 · 5~10분, 빼려면 말씀)
진행할까요? 버전 커밋 → develop에 밀고 PR → CI ∥ 스킬 평가 → 모두 초록이면 main 머지(배포) → 태그 · Release → 볼트 캡처 순서로 끝까지 갑니다.
```

고쳐 달라면 고쳐 다시 보인다. 거절하면 아무것도 쓰지 않고 멈춘다.

## 3. 버전 커밋 → PR → CI ∥ 스킬 평가

**로컬 검증은 돌지 않는다.** develop에 코드가 들어오는 길은 `implement` PR뿐이고(그 5단계가 같은 다섯 — 스킬 두 벌 · 고지 사본 · CLI 판정 · 단위 · 린트 — 을 돈다), PR 없이 들어오는 것은 문서 · 주석과 버전 커밋(버전 문자열 여섯 파일)뿐이다. PR끼리 합쳐져 깨지는 것은 릴리즈 PR의 "빌드 검증"이 같은 다섯에 빌드 · CLI 계약까지 더해 **머지 전에** 잡는다. 그때 버전 커밋은 이미 develop에 있지만 배포 전이라, 4단계의 실패 경로대로 고침 PR로 이어 간다.

```sh
# CHANGELOG.md 의 [Unreleased] 를 승인받은 정리본으로 바꾼 뒤
printf '%s\n' 0.11.0 > plugin/VERSION
sh tools/sync-version.sh            # 매니페스트 둘 · README 두 벌의 배지 · CHANGELOG 제목([Unreleased] → [0.11.0] — 날짜)
sh tools/sync-version.sh --check
git diff --stat                     # plugin/VERSION · plugin/.claude-plugin/plugin.json · plugin/.codex-plugin/plugin.json · README.md · README.ko.md · CHANGELOG.md 뿐이다
git commit -am "0.11.0 릴리즈 — VERSION · 매니페스트 · 배지, CHANGELOG 정리(<무엇을 합치고 고쳤나>)"
git push origin HEAD:develop        # fast-forward 만
gh pr create --base main --head develop --title "0.11.0 릴리즈" --body "<본문>"
```

이 여섯 파일 밖이 바뀌었으면 밀지 말고 멈춘다 — PR 없이 develop에 바로 가는 예외는 버전 커밋뿐이다. 커밋 끝에는 세션의 공동 저자 줄을 붙인다. 푸시가 거부되면(그 사이 develop이 움직였다) 버전 커밋을 버리고(`git reset --hard origin/develop`) 2단계부터 다시 본다.

본문: 첫 줄 "`develop` → `main`. **merge commit으로 머지한다**(squash · rebase면 develop과 main이 갈라진다). 머지가 곧 배포다." 그다음 `[0.11.0]` 절의 요지 한 문단, 실린 PR 범위(`#44~#47`). 스킬 · 도움말이 바뀐 판이면 "스킬 평가: CI와 나란히 도는 중 — 결과는 `스킬 평가` 상태와 코멘트"(사용자가 뺐으면 "스킬 평가: 뺐다(사용자)")라고 적는다. 끝에 세션의 PR 서명 줄.

**스킬 평가 — 2단계에서 실었으면 PR을 연 직후 돌린다.** CI(빌드 검증)는 PR을 열면 저절로 돌고, 평가는 그와 나란히 돈다. **먼저 PR head에 `스킬 평가`를 `pending`으로 올린다** — 4단계의 `gh pr checks --watch`는 이미 있는 체크만 기다려서, 상태가 없으면 CI가 끝나는 순간 평가가 돌고 있어도 초록으로 끝난다.

```sh
H=$(gh pr view <N> --json headRefOid -q .headRefOid)     # 평가할 커밋 — 로컬 HEAD 와 같아야 한다(아니면 2단계부터)
R=kakao/prevue
st() { gh api repos/$R/statuses/$H -f context="스킬 평가" -f state="$1" -f description="$2"; }
st pending "Claude · Codex 평가 중"
sh tools/skill-eval.sh                       # Claude — tests/evals/cases
python3 tools/skill-eval-codex.py            # Codex — tests/evals/cases + codex-cases. 터미널이 codex 를 감싸면 PREVUE_EVAL_CODEX 로 감싸지 않은 실행 파일을 준다
python3 tools/skill-eval-codex.py --clean    # 끝나면 Codex 캐시에 둔 평가 플러그인을 지운다
st success "Claude 6/6 · Codex 24/24"        # 결과대로 — 실패면 failure
gh pr comment <N> --body "<에이전트별 통과 수 · 실패한 케이스의 채점기와 이유 · 비용>"
```

두 평가는 `run_in_background`로 나란히 띄운다. 4단계의 CI 기다림도 PR에 CI 체크가 붙은 것을 본 뒤 같이 띄운다. 셋 다 끝났다는 알림에 이어 간다.
- 실패한 케이스는 그 케이스만 한 번 다시 돌린다(`--case <이름>`) — 모델 행동이라 회차마다 흔들린다. 다시 돌려도 실패하면 `failure`로 올리고 **멈춰** 실패한 채점기 · 트레이스 요지를 보고한다. 사람이 그 결과를 보고 진행하라고 하면 그 말을 코멘트에 남기고 `success`(설명 "사람 승인 — …")로 올려 4단계로 간다.
- `claude` · `codex`가 없거나 로그인이 안 됐으면 그 평가를 건너뛰고 `success`로 올리되 설명을 "건너뜀(…)"으로 **시작한다** — 평가 때문에 릴리즈를 멈추지 않는 대신 체크 목록에서 보이게 한다. 7단계 보고에도 싣는다.
- 사용자가 2단계에서 평가를 뺐으면 돌리지 않고 `success`(설명 "뺐다(사용자)")를 바로 올린다 — 다시 불렸을 때 1단계가 빠진 평가로 읽지 않게.

**상태가 없는 head.** 평가 도중이나 실패 뒤 고침으로 PR head가 바뀌면(develop이 움직였다) 새 head에는 상태가 없다. 1단계 · 4단계 모두 같은 규칙이다:

```sh
git diff --name-only <상태가 있는 앞 head> <새 head> -- skills-src plugin/bin/help bin/help tests/evals tools/skill-eval.sh tools/skill-eval-codex.py
```

비었으면 앞 결과를 새 head에 그대로 올리고(설명 끝에 "· 앞 커밋 <짧은 sha> 결과"), 아니면 새 head에서 평가를 다시 돌린다. 앞 head는 PR 코멘트의 평가 결과나 `gh api $GHE repos/$R/commits/<sha>/status`로 찾는다.

## 4. CI · 평가를 기다리고 머지

```sh
gh pr checks <N> --watch --fail-fast
```

"빌드 검증"(약 7~10분)이 초록이어야 하고, 스킬 평가를 실은 판이면 PR head의 `스킬 평가` 상태도 `success`여야 한다 — 3단계가 `pending`부터 올려 두어 `gh pr checks`가 둘을 함께 기다린다. 머지 직전에 PR head와 그 상태가 붙은 커밋이 같은지 한 번 더 본다(다르면 3단계의 "상태가 없는 head"). 빌드 검증은 CI(Ubuntu)에서 돌아 macOS에서만 통과하는 것도 잡는다. 막 연 PR은 체크가 아직 안 붙어 "no checks"로 끝날 수 있다 — 그러면 조금 뒤 다시 본다.
기다림은 `run_in_background`로 돌리고 끝났다는 알림에 이어 간다(포그라운드 sleep은 막혀 있다).

실패하면 **머지하지 않고 멈추고** 어느 체크 · 어느 스텝이 무엇으로 실패했는지(`gh run view <id> --log-failed`의 요지 · 평가의 채점기) 보고한다. 고치는 일은 이 스킬 밖이다 — 평소처럼 작업 PR을 develop에 넣고 `/ship`을 다시 치면 PR에 새 커밋이 실려 4단계부터 이어진다. 버전 커밋을 되돌리지 않는다 — 머지 전이라 사용자에게 간 것은 없다. 새 head에는 `스킬 평가` 상태가 없으니 3단계의 "상태가 없는 head"대로 한다.

초록이면:

```sh
gh pr merge <N> --merge             # merge commit. --delete-branch 를 붙이지 않는다 — head 가 develop 이다
```

이 순간이 배포다. 마켓플레이스 둘이 `main`을 읽는다.

## 5. 기록 — 태그 · GitHub Release

```sh
gh workflow run 릴리즈 --ref main
gh run list --workflow 릴리즈 --branch main --limit 1 --json databaseId,status,createdAt   # 방금 뜬 실행인지 createdAt 으로 본다
gh run watch <id> --exit-status
gh release view v0.11.0 --json tagName,url
```

태그가 이미 있으면 워크플로가 아무것도 하지 않는다 — 다시 돌려도 안전하다. Release를 만들지 못했으면(태그는 나갔다) 실패 스텝을 보고하고 6단계로 간다 — 설치하는 사람에게 영향이 없다.

## 6. 볼트 — 릴리즈 캡처

볼트에 노트를 직접 쓰지 않는다 — 어느 작업 노트의 `release`를 어떻게 고칠지는 볼트 쪽 편입이 정한다. 이 판에 Sub-Task 키가 있는 PR이 하나라도 있으면 `wiki-ingest` 스킬을 보류 캡처 갈래로 로드해 릴리즈 캡처를 남긴다. 넘길 재료는 origin `prevue` · `v<버전>`, 버전, 배포일, 실린 PR마다 번호 · 제목 · Sub-Task 키(없으면 `없음`)다. 이어 가는 중이라 2단계의 목록이 없으면 `v<이전 태그>..v<버전>`의 PR로 다시 뽑는다.

끝나면 릴리즈 PR에 `볼트 릴리즈 캡처 — <캡처 경로>` 코멘트를 단다. 남기지 않았으면(Sub-Task 키가 있는 PR이 없다 · 볼트나 `wiki-ingest` 스킬이 없다) `볼트 릴리즈 캡처 — 남기지 않음(<이유>)`으로 단다 — 1단계가 이 코멘트 하나로 이 단계를 마쳤는지 가리므로, 어느 쪽이든 코멘트는 꼭 남긴다. 이 체계 전의 릴리즈 PR은 코멘트가 없어 한 번 이 단계로 오고, 그 판에는 키가 있는 PR이 없으니 `남기지 않음` 코멘트만 남는다.

- 릴리즈 단락은 볼트에 쓰지 않는다 — CHANGELOG와 GitHub Release가 원 기록이다.

## 7. 보고

버전 · PR 링크 · 머지 커밋 · Release 링크 · 스킬 평가 결과(돌렸으면) · 남긴 볼트 캡처를 한 덩어리로 말한다. 건너뛰거나 실패한 단계가 있으면 그대로 말한다.
