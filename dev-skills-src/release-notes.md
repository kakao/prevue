# 릴리즈 노트 — CHANGELOG 쓰는 법

`CHANGELOG.md`의 `[Unreleased]`가 곧 릴리즈 노트다. 릴리즈 워크플로(`.github/workflows/release.yml`)가 그 판의 절을 **그대로** GitHub Release 본문으로 옮긴다 — 따로 다듬는 단계가 없다. 그래서 항목은 적는 순간 사용자가 읽을 글이다.

쓰는 곳은 둘이다. `implement`가 작업 PR에서 항목을 적고(3단계), `/ship`이 릴리즈 직전에 판 전체를 정리한다(2단계). 외부 PR은 머지하는 사람이 적는다.
**`[Unreleased]`는 평평한 `- ` 줄만 쌓는다** — 절 · 문단 · 그림은 `/ship`이 릴리즈 때 짠다(아래 "판의 모양"). 병렬 PR이 `###` 절 안에 끼워 쓰면 `merge=union`이 줄 순서를 섞어 다른 절에 붙는다.
**예외 — 릴리즈 직전 정리 PR.** 판이 커서 정리를 미리 리뷰받고 싶으면 아래 "릴리즈 정리"를 PR 하나로 develop에 넣어도 된다 — 그 뒤 `[Unreleased]`는 판의 모양이고, 작업 PR이 더하는 줄은 맨 끝에 평평하게 둔다. `/ship` 2단계는 이미 짠 절을 다시 짜지 않고, 그 뒤에 들어온 줄은 "이어 가는 릴리즈에 늦게 들어온 줄"처럼 맞는 절에 넣는다. 멘션 점검은 그대로 돌고(정리 PR 뒤에 외부 PR이 줄이나 멘션 없이 들어올 수 있다), 히어로 그림이 develop에 없으면 그 줄을 빼며, 태그 주소의 버전은 2단계가 승인받은 버전과 맞춘다.

## 적는 것 · 빼는 것

- **사용자에게 보이는 변화만 적는다.** 동작 · 에러 문구 · 명령 · 설정 · 성능 숫자 · 설치 조건 · 문서(README 첫 화면처럼 사용자가 읽는 것).
- **뺀다** — 리팩터링 · 테스트 · CI · 린트 · 스킬 평가 · 개발용 스킬(`dev-skills-src/`) · 이 저장소의 규칙 문서. 사용자가 할 일도 볼 것도 없으면 뺀다.
- 한 변화는 한 항목이다. PR 하나가 둘을 바꾸면 둘, PR 둘이 하나를 바꾸면 하나.
- **아직 릴리즈되지 않은 같은 기능을 다시 바꾸면 새 줄을 더하지 않고 그 줄을 고쳐 쓴다(옛 설명은 지운다).** `[Unreleased]`에 있는 줄은 아직 아무도 보지 않았다 — 적기 전에 거기서 같은 기능을 찾는다. 옛 줄의 사실 중 아직 맞는 것은 새 문장에 옮긴다.

## 항목 모양

영어로, `- ` 한 줄에 **한 문장**으로 쓴다(새로 생긴 것을 이름 붙이는 명사구여도 된다) — 멘션만 그 뒤에 따로 한 문장이다(아래 절). 작업 PR이 처음부터 이 모양으로 적는다 — `/ship`은 문장을 다시 쓰지 않고 묶고 늘어놓기만 한다(아래 "판의 모양").

1. **굵은 머리 — 이제 무엇이 되나.** 항목의 본체다. 굵은 부분은 그 문장의 머리다 — 문장 전체여도 되고, 주어 · 기능 이름 · 명령만 굵고 서술어가 뒤에 이어져도 된다. 사용자 쪽에서 본 현재형 문장이나, 새로 생긴 것을 이름 붙인 명사구(`**Flatter board** — 1 px borders, …`)로 쓰고, 고친 것도 "고쳤다"가 아니라 이제 되는 것을 쓴다.
2. **꼬리는 필요할 때만, 같은 문장 안에서 짧게.** 조건 · 범위, 어디서 하나(명령 · 플래그 · 출처 링크), 그래서 되는 것, 사용자가 할 일, 이슈 링크 같은 짧은 구절이다 — 쉼표 · `;` · `—` · 괄호로 잇는다. **쓰지 않는 것**은 예전 동작의 설명 · 원인 · 내부 구조, 그리고 둘째 문장 · 문단이다 — PR 본문에 둔다. `used to …` · `Now …`로 문단을 쓰지 않는다. 한 변화의 두 면(파일을 열 때와 데몬을 다시 띄울 때처럼)은 `, and`로 한 문장에 둘 수 있다.
3. **숫자와 조건은 정확히.** 범위가 좁으면 좁은 대로 쓴다(`with implementation dependencies` · `in the browser only` · `about 11 MB once`). 짧게 쓰려고 조건을 빼서 넓히지 않는다 — 다른 사실이 된다.
4. **사용자가 본 에러는 글자 그대로 따옴표에 넣는다** — 같은 문구로 검색해 오는 사람이 찾게. 그래서 에러를 고친 항목은 `no longer … "<에러 문구>"`로 쓴다. 예전 것이 문장에 들어가는 것은 이때와, 새것이 옛 UI를 대신할 때 그 이름을 대는 것(`**One dock under the picture** replaces the side panel.` — 옛 이름으로 찾아오게)뿐이다.
5. **사용자가 할 일**(다시 warm up · 환경 변수 · 설치 명령)이 있으면 꼬리 끝에 쓴다(`— warm up once more`).
6. **링크와 멘션.** 이슈 · PR은 증상 뒤에 `([#129](https://github.com/kakao/prevue/issues/129))`처럼 건다. 멘션은 맨 끝(아래 절).

```md
O  - **Folding keeps the device the way you hold it.**
O  - **Show inset areas** draws each inset band and the safe area.
O  - **The first start after updating downloads about 11 MB once** — run `prevue setup` when `health` asks.
O  - **KMP library modules** with `implementation` dependencies no longer fail on save with "Unresolved reference" ([#129](https://github.com/kakao/prevue/issues/129)) — warm up once more. Thanks to @citytexi for the report and the fix ([#130](https://github.com/kakao/prevue/pull/130)).
X  - **Fixed the fold posture bug.**
X  - **Folding keeps the device the way you hold it.** Folding used to reset the device to portrait. Now the posture change keeps the orientation you picked, because …
```

위 O 넷은 0.22.0 항목 그대로다 — 문장 전체가 굵은 것, 이름만 굵은 것, 할 일이 꼬리인 것, 에러를 고친 것. X의 첫 줄은 이제 되는 것이 없고, 둘째 줄은 굵은 머리로 끝난 항목에 문단을 붙였다.

**작은 고침**은 굵은 머리 없이 한 문장으로 적는다 — 이슈 링크 · 멘션 · 사용자가 할 일 · 검색될 에러 문구가 없고 한 구절로 끝나는 것이다. `/ship`이 `### Fixes` 끝의 `Also:` 한 줄로 묶는다(아래 "판의 모양").

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

`[Unreleased]`는 병렬 PR이 `merge=union`으로 쌓아서 순서가 섞인다. 같은 변화는 작업 PR이 고쳐 쓰지만(위 "적는 것 · 빼는 것"), 두 PR이 같은 줄을 나란히 고치면 union이 두 판을 다 남기니 여기서 한 번 더 본다.

1. **같은 변화는 하나로.** 뒤에 적힌 설명이 맞는 것이다(나중 PR이 앞의 것을 고쳐 썼다). 앞의 것에만 있는 사실이 있으면 옮긴다.
2. **순서.** 사용자에게 큰 것부터 — 새로 되는 것 · 막히던 것이 풀린 것이 위, 작은 고침이 아래.
3. **빼기.** 위 "적는 것 · 빼는 것"에 맞지 않는 줄.
4. **멘션 점검.** 아래 명령이 내는 사람마다 그 번호가 걸린 항목에 멘션이 있는지 본다. 없으면 위 표대로 붙인다.
5. **판의 모양으로 짠다** — 아래 절.

```sh
git fetch -q --tags origin                  # v$M 태그가 없으면 git log 가 조용히 비어 PR 쪽을 놓친다
M=$(git show origin/main:plugin/VERSION)
{ git log --first-parent --format='%s' "v$M"..origin/develop | grep -oE '\(#[0-9]+\)'
  awk '/^## \[Unreleased\]/{f=1;next} /^## \[/{f=0} f' CHANGELOG.md | grep -oE '\[#[0-9]+\]'
} | tr -dc '0-9\n' | sort -un | while read n; do
  gh api "repos/kakao/prevue/issues/$n" --jq 'select(.user.type != "Bot" and (.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not))
    | "#\(.number) @\(.user.login) \(if .pull_request then "PR" else "issue" end)"'
done
```

squash 커밋 제목 끝의 `(#N)`과 `[Unreleased]`에 걸린 링크만 본다 — 커밋 본문의 번호까지 주우면 지난 판의 이슈가 섞인다. 링크 없이 고친 외부 제보는 여기에 안 잡힌다. 그래서 제보로 고친 PR은 항목에 이슈 링크를 건다.

`author_association`은 조직 멤버십을 비공개로 둔 팀원도 `CONTRIBUTOR` · `NONE`으로 낸다. 목록에 우리 팀원이 나오면 멘션하지 않고 뺀다.

## 판의 모양 — `/ship`이 짠다

릴리즈 정리 끝에 그 판의 절을 이 순서로 짠다. 항목 문장은 작업 PR이 "항목 모양"대로 적은 그대로 둔다 — 여기서는 묶고 늘어놓기만 하고, 작은 고침만 `Also:` 한 줄로 접는다(3번).

1. **히어로 그림 — 있을 때만.** develop에 `assets/release-<버전>.png`가 있으면 맨 위에 한 줄로 건다. 없으면 이 줄 없이 간다 — `/ship`은 그림 때문에 멈추지 않는다.
   `![Prevue 0.21 — Kotlin Multiplatform, in your browser](https://raw.githubusercontent.com/kakao/prevue/v0.21.0/assets/release-0.21.0.png)`
   주소는 **그 판의 태그**에 고정한다 — Release 본문은 저장소 상대 경로를 풀지 못하고, `main`에 걸면 나중에 그림이 바뀔 때 지난 노트도 바뀐다. 태그는 5단계에서 생기니 그 전까지는 CHANGELOG에서 그림이 깨져 보인다. 그림은 릴리즈 전에 PR로 넣는다(버전 커밋 여섯 파일 밖이다) — 만드는 법은 `tools/release-hero/README.md`.
2. **요약 문단** — 두세 문장. 이 판에서 사용자가 새로 할 수 있게 된 것을 먼저(축이 둘이면 한 문장씩), 나머지 무게를 한 문장으로. 히어로 그림이 있으면 그 제목을 문단 맨 앞에 굵게 둘 수 있다(`**See what it's made of. See where it fits.** Point at an element and …`).
3. **주제별 `###` 절** — 무엇을 할 수 있게 됐나로 묶는다. 절 이름은 판마다 정하고(`### See where it fits` · `### Kotlin Multiplatform`), 고친 것은 주제 절들 뒤 `### Fixes`로 모은다. 절 순서는 주제 절들 → `### Fixes` → `### Thanks`(맨 끝)다.
   - **절 머리는 그림 한 장 — 있을 때만.** 절 머리에 문단을 두지 않는다 — 무엇이 되나 · 조건 · 사용자가 할 일은 항목이 갖는다. 그림은 그 절의 기능이 움직이는 장면(webp · gif)이고, 주소는 히어로처럼 그 판의 태그에 고정한다. 그림이 없는 절은 절 이름 아래 바로 항목이 온다.
   - **`### Fixes` 끝의 `Also:` 한 줄.** 작은 고침("항목 모양"의 끝 문단)은 줄을 따로 주지 않고 `- Also: …, and ….` 한 줄에 구절로 묶는다 — "한 변화는 한 항목"의 예외다. 작은 고침이 아닌 고침은 접지 않고 제 줄을 둔다 — 멘션 점검이 항목의 `[#N]` 링크와 끝의 멘션에 기댄다.
     ``- Also: `next` and `then` use the `prevue` that answered, and Original size keeps its aspect ratio.``
   - **한 판 안에서만 있던 상태는 쓰지 않는다.** 같은 판의 앞 PR이 만든 문제를 뒤 PR이 고쳤으면 사용자가 본 적이 없다 — `no longer …` 줄도 `Also:` 구절도 두지 않는다.
4. **`### Thanks`** — 외부 기여자 · 제보자가 있을 때만, 한 줄로 이름과 번호를 모은다(`@Dwite ([#29](…)) · @sergei-lapin ([#30](…), [#31](…))`). 항목 끝의 멘션은 그대로 둔다 — 무엇을 했는지는 그 변화 옆에서 보인다.

판이 작아 절이 하나뿐이면 `###` 없이 요약 문단 아래 항목만 둔다 — `Also:` 줄은 항목 맨 끝이다.

**이어 가는 릴리즈에 늦게 들어온 줄** — 버전 커밋 뒤 `[Unreleased]`에 새 `- ` 줄이 들어와 그 판으로 옮기면(`/ship` 1단계), 맞는 주제 절에 넣고 없으면 `### Fixes`에 넣는다 — 작은 고침이면 `Also:` 줄에 구절로 합치고(그 줄이 없으면 만든다), 제 줄을 갖는 고침은 `Also:` 앞에 둔다. 그 줄이 요약 문단의 무게를 바꾸거나 새 외부 멘션을 달고 오면 요약 · Thanks도 고친다.
