# 릴리즈 노트 — CHANGELOG 쓰는 법

`CHANGELOG.md`의 `[Unreleased]`가 곧 릴리즈 노트다. 릴리즈 워크플로(`.github/workflows/release.yml`)가 그 판의 절을 **그대로** GitHub Release 본문으로 옮긴다 — 따로 다듬는 단계가 없다. 그래서 항목은 적는 순간 사용자가 읽을 글이다.

쓰는 곳은 둘이다. `implement`가 작업 PR에서 항목을 적고(3단계), `/ship`이 릴리즈 직전에 판 전체를 정리한다(2단계). 외부 PR은 머지하는 사람이 적는다.

## 적는 것 · 빼는 것

- **사용자에게 보이는 변화만 적는다.** 동작 · 에러 문구 · 명령 · 설정 · 성능 숫자 · 설치 조건 · 문서(README 첫 화면처럼 사용자가 읽는 것).
- **뺀다** — 리팩터링 · 테스트 · CI · 린트 · 스킬 평가 · 개발용 스킬(`dev-skills-src/`) · 이 저장소의 규칙 문서. 사용자가 할 일도 볼 것도 없으면 뺀다.
- 한 변화는 한 항목이다. PR 하나가 둘을 바꾸면 둘, PR 둘이 하나를 바꾸면 하나.

## 항목 모양

영어로, `- ` 한 줄(한 문단)에 쓴다.

1. **굵은 머리 줄 — 이제 어떻게 되나.** 사용자 쪽 주어로, 현재형 한 문장. 고친 것도 "고쳤다"가 아니라 이제 되는 것을 쓴다.
   `**Saving redraws projects built for Java 21.**` (O) · `**Fixed jvm-target bug.**` (X)
2. **예전엔 어땠나.** `used to …`로, 사용자가 실제로 본 것. 에러는 **글자 그대로** 따옴표에 넣는다 — 같은 문구로 검색해 오는 사람이 찾게.
3. **이제 어떻게.** `Now …`로 동작을 쓴다. 내부 구조는 사용자가 무엇을 하게 되는지 설명할 때만 쓴다.
4. **숫자와 조건은 정확히.** 범위가 좁으면 좁은 대로 쓴다("on devices whose screen does not divide evenly into dp (Pixel 9, …)"). 줄여서 넓히지 않는다.
5. **사용자가 할 일.** 다시 warm up · 환경 변수 · 설치 명령처럼 해야 할 것이 있으면 끝에 쓴다(`warm up once more to pick it up`).
6. **링크와 멘션.** 이슈 · PR은 증상 뒤에 `([#30](https://github.com/kakao/prevue/issues/30))`처럼 건다. 멘션은 맨 끝(아래 절).

길이는 이 다섯이 들어가는 만큼이다. 작은 고침은 머리 줄 없이 한 문장이어도 된다.

## 기여자 · 제보자 멘션

외부 사람(저장소 `OWNER` · `MEMBER` · `COLLABORATOR`가 아닌 계정)이 이 변화에 손을 댔으면 항목 끝에 적는다. 무엇을 했는지에 따라 문구가 다르다.

| 한 일 | 문구 |
|---|---|
| 고쳤다(PR) | `Thanks to @id for the fix ([#PR](…/pull/PR)).` |
| 제보만 했다(이슈) | `Reported by @id.` — 이슈 링크는 본문에 이미 있다 |
| 제보하고 고쳤다 | `Thanks to @id for the report and the fix ([#PR](…/pull/PR)).` |

- **적는 때.** 우리 PR이 외부 제보를 고치면 그 PR에서. 외부 PR은 머지하면서 — PR에 항목이 없으면 머지하는 사람이 쓰고, 있으면 멘션만 붙인다.
- **여러 명이면** 한 문장에 모은다 — `Thanks to @a for the report and @b for the fix (…).`
- **릴리즈 뒤에 고치면 늦다.** CHANGELOG는 고쳐도 이미 만든 GitHub Release 본문은 그대로라 따로 고쳐야 한다.

## 릴리즈 정리 — `/ship` 2단계

`[Unreleased]`는 병렬 PR이 `merge=union`으로 쌓아서 순서가 섞이고 같은 변화가 둘 셋으로 적혀 있곤 하다.

1. **같은 변화는 하나로.** 뒤에 적힌 설명이 맞는 것이다(나중 PR이 앞의 것을 고쳐 썼다). 앞의 것에만 있는 사실이 있으면 옮긴다.
2. **순서.** 사용자에게 큰 것부터 — 새로 되는 것 · 막히던 것이 풀린 것이 위, 작은 고침이 아래.
3. **빼기.** 위 "적는 것 · 빼는 것"에 맞지 않는 줄.
4. **멘션 점검.** 아래 명령이 내는 사람마다 그 번호가 걸린 항목에 멘션이 있는지 본다. 없으면 위 표대로 붙인다.

```sh
M=$(git show origin/main:plugin/VERSION)
{ git log --first-parent --format='%s' "v$M"..origin/develop | grep -oE '\(#[0-9]+\)'
  awk '/^## \[Unreleased\]/{f=1;next} /^## \[/{f=0} f' CHANGELOG.md | grep -oE '\[#[0-9]+\]'
} | tr -dc '0-9\n' | sort -un | while read n; do
  gh api "repos/kakao/prevue/issues/$n" --jq 'select(.user.type != "Bot" and (.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not))
    | "#\(.number) @\(.user.login) \(if .pull_request then "PR" else "issue" end)"'
done
```

squash 커밋 제목 끝의 `(#N)`과 `[Unreleased]`에 걸린 링크만 본다 — 커밋 본문의 번호까지 주우면 지난 판의 이슈가 섞인다. 링크 없이 고친 외부 제보는 여기에 안 잡힌다. 그래서 제보로 고친 PR은 항목에 이슈 링크를 건다.
