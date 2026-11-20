# Prevue 리뷰 규약

`review` 스킬이 Prevue diff를 판정할 때 읽는 이 저장소의 사실이다. 리뷰하는 법 · 관점 · 고칠 것/물을 것 기준 · 출력 형식은 `review` 스킬이 갖고, 여기에는 Prevue에만 해당하는 것만 둔다. `implement`의 리뷰 맡기기(`dev-skills-src/implement/tools/review.md`)가 등급을 고를 때 아래 `json review-tier` 블록을 넘긴다.

## 코딩 표준

`dev-skills-src/coding.md`를 끝까지 읽고 diff의 신규 · 수정 줄에 댄다 — `coding.md` 전체가 코딩 표준이다.

- **생성물만 바뀌고 원본이 그대로면 고칠 것이다** — 무엇이 생성물이고 원본인지는 생성 스크립트 머리말(`tools/gen-agents.sh` · `tools/plugin-copies.sh`)과 뷰어의 손 소스 · 생성물 구분(`viewer-src/README.md`)이 갖고, CI가 각각의 `--check`로 막는다.
- **결정(`D-<n>`)을 뒤집으면 물을 것이다** — 결정을 뒤집는 일은 사람이 정한다.

반복 리뷰 지적 — 리뷰가 통과시킨 뒤 사람이 잡은 모양이다.

- **성패를 `String?`·null로 돌려주는 반환은 고칠 것이다** — 실패가 값이고 성공이 null인 반환, nullable · boolean이 sealed 타입의 갈래를 대신하는 인자 · 반환. 계획에서 합의한 모양이어도 시그니처는 따로 판정한다.
- **diff가 원인을 바꾼 테스트 · 코드 근처의 기존 주석이 새 원인과 맞는지 본다** — 이 diff가 아니라고 밝힌 옛 원인을 말하는 주석이 남았으면 고칠 것이다.

## 린트

```sh
sh tools/lint.sh                       # 기준 origin/develop — 릴리즈 PR이면 --base origin/main
```

종료 코드 **0 통과 · 1 위반 · 2 검사를 못 했다.** 위반은 `경로:줄  규칙  조언` 한 줄씩이고, 규칙 갈래는 `slop` · `metric` · `dead` · `layer` · `comment` · `viewer`다. 경고 단계는 없다 — 판정할 것은 위반뿐이다. 테스트 소스는 린트가 보지 않고 아래 "테스트 판정"으로 본다.

- **위반은 고칠 것이다.** develop은 통과 상태로만 움직이므로 남은 위반은 이 작업 몫이다. 조언 칸이 고치는 방향이다. `dev-skills-src/coding.md`대로 판단하지 않고 결과대로 고친다.
- **거짓 양성으로 보이면 물을 것이다** — "규칙 거짓 양성 의심: <규칙>". 예외 표시를 다는 대신 `tools/lint/`의 규칙과 `tests/lint`의 심은 위반을 함께 고치는 쪽이다.
- **diff가 닿지 않은 파일에 위반이 났으면 물을 것이다** — detekt 판 · 규칙 변경이 기존 코드를 새로 잡은 것이라 범위를 정해야 한다.
- **종료 2는 통과가 아니다** — stderr를 결과에 그대로 남긴다. 흔한 원인은 `viewer-src/node_modules`가 없거나(`npm ci --prefix viewer-src`) 이 머신에 detekt가 아직 없는 것(`sh tools/lint.sh --online` 한 번)이다.

리뷰어가 직접 돌려도 된다 — detekt는 Gradle로 돌지만 `build/lint`와 그 안의 프로젝트 캐시를 따로 써서 메인의 빌드 · 테스트와 겹치지 않는다. 그 밖의 빌드 도구는 부르지 않는다. 리뷰어 정의가 빌드 도구 실행을 막으면 돌리지 않고 "검사를 못 했다(리뷰어 정의)"로 적는다 — 관문은 `implement`의 검증 돌리기(`tools/check-local.sh`)다.

**`implement`가 넘긴 위임에 `check-local.sh` 요약이 실려 오면** 그 커밋이 끝 커밋과 같고 작업 트리가 깨끗하다고 찍혀 있을 때 린트 줄을 결과의 린트 집계 줄로 옮기고 다시 돌리지 않는다. 다르거나 요약이 없으면(단독 리뷰) 위대로 돌린다.

`lint.sh`는 끝 커밋이 아니라 작업 트리를 읽는다. `git diff --quiet <끝 커밋>`이 실패하면(리뷰 중에 메인이 고쳤다) 그 결과를 끝 커밋의 판정으로 쓰지 않고 그렇다고 적는다.

결과의 린트 집계 줄은 `lint.sh`의 마지막 줄을 그대로 옮긴다.

```
- 위반 N (slop n · metric n · …) (기준 origin/develop)     # 종료 2면: 검사를 못 했다: <원인>
```

## 기준 ref

`git merge-base origin/develop HEAD`다 — 린트와 등급 분류기가 쓰는 기준과 같다. 릴리즈 PR(`develop` → `main`)이면 `origin/main`과의 merge-base다. `origin/develop`이 없으면 `git fetch -q origin` 뒤 다시 보고, 그래도 정할 수 없으면 추측하지 않고 보고한다.

## 테스트 범위

계획 · 검증 연결의 "테스트 범위"는 그 변경을 덮는 아래 명령이고, 검증 기록은 PR 본문이 갖는다.

| 바뀐 곳 | 덮는 명령 |
|---|---|
| `plugin/daemon/` | `(cd plugin/daemon && ./gradlew --offline test)` — 픽스처 · 클래스패스 경로면 `integrationTest`도. Gradle은 JDK 21+에서만 뜬다(Metro) — `tools/check-local.sh`는 스스로 고르고, 손으로 부를 때는 `JAVA_HOME`을 `python3 tools/lint/gradle_jdk.py`가 내는 경로로 준다 |
| `plugin/cli/` · `plugin/bin/` | `python3 -m unittest discover -s tests/cli` |
| `tools/lint/` | `sh tools/lint.sh`(자기 검사 `tests/lint`를 먼저 돈다) |
| `viewer-src/` · `plugin/viewer/` | `sh tools/gen-viewer.sh --check` · `python3 -m unittest discover -s tests/cli`(마크업 · 사전) · 헤드리스 Chrome(`tests/viewer/`) |
| `skills-src/` · `dev-skills-src/` | `sh tools/gen-agents.sh --check` · `python3 -m unittest discover -s tests/cli`(스킬의 JSON 예시) — 배포 스킬은 릴리즈 때 `/ship`의 스킬 평가(`tests/evals`)가 잰다 |

## 테스트 판정

지울지는 `review` 스킬의 "테스트 거짓말" 기준으로 가른다. 그 기준에 걸려도 Prevue는 아래 넷을 남긴다(D-186).

- **공개 CLI 계약** — 종료 코드 · JSON 응답의 키 · `help/` 문구. 값을 다시 적는 모양이어도 사용자 에이전트 · 스크립트가 그 값으로 분기한다.
- **린트의 심은 위반** — `tests/lint`.
- **소스를 읽어 금지 패턴을 막는 규칙 테스트.**
- **이유를 든 테스트** — 코드에서 읽히지 않는 이유를 이름이나 본문(`//` 줄 포함)이 들고 있다. 지우면 저장소 안에서 그 이유를 찾을 곳이 없어진다(D-70).

이 넷은 범주 안에서 같은 것을 두 번 확인하는 중복만 지울 후보로 올린다. 가르는 눈금:

- **라우팅 · 메서드 · 매퍼 테스트는 소비자가 그 값으로 분기하는지로 가른다** — 뷰어는 `app.json`의 `icon` · `reveal`로 분기한다(`viewer-src/src/components/ProjectHeader.tsx`).
- **`ContractTest`와 겹친다고 보기 전에 무엇을 견주는지 본다** — 상태 코드와 응답의 키 · 타입만 견주고 값은 견주지 않는다. 배열 원소와 같은 종류의 SSE 이벤트는 합친 스키마 하나로 보아 일부 원소 · 발행의 키 생략을 못 잡고, 계약 픽스처에 없는 시나리오는 보지 않으며, SSE `state` 이벤트는 빠진 키를 통과시킨다(`fits`). 값의 진위나 그런 키 생략을 확인하는 테스트는 계약과 중복이 아니다.
- **남긴다** — 기획 NFR의 숫자 기본값(유휴 1시간 · 산출물 64MB), 언어를 넘는 계약(`DaemonPaths`의 덤프 이름 ↔ `plugin/cli/prevue_plan.py`), 손으로 짠 `Json` 파서의 왕복, `help/` 문구 계약을 확인하는 마지막 테스트.
- **"다른 테스트가 확인한다"는 짝 구현을 망가뜨려 보고 말한다** — 정적으로 중복이라 본 것이 망가뜨려 보면 혼자 지키는 경우가 있었다.
- **개수는 `@Test fun`으로 센다** — `grep -c '@Test'`는 `@TestInstance`까지 센다.

테스트 린트 알림은 없다. 대상 구현의 크기(줄 · 분기)는 리뷰어가 직접 본다 — 얇은 대상 · 테스트 대 구현 비율 · 직렬화 왕복 · 라이브러리 타입 단언 넷을 정리 PR 넷의 판정표로 쟀으나 D-187의 문턱(정밀도 50% 이상 · 발화가 있음)을 넘은 규칙이 없었다.

## 한쪽 문 신호

되돌려도 결과가 남는 것이다.

- **배포** — `main`에 머지되는 순간 마켓플레이스가 읽는다. 매니페스트 넷(`.claude-plugin/marketplace.json` · `.agents/plugins/marketplace.json` · `plugin/.claude-plugin/plugin.json` · `plugin/.codex-plugin/plugin.json`)과 `plugin/VERSION`이 잘못되면 설치 · 갱신이 모두에게 깨진다.
- **릴리즈 · CI 워크플로**(`.github/workflows/`) — 태그 · GitHub Release를 만들고, main의 머지 관문(`Verify`의 `ci-success`)이다.
- **공개 CLI 계약** — 종료 코드(사용법 2 · 데몬에 닿지 못함 3, FR-13), JSON 응답의 키, `help/` 문구. 배포 스킬과 사용자 에이전트 · 스크립트가 이것으로 분기한다.
- **배포 스킬 본문**(`skills-src/`) — 사용자의 에이전트가 그대로 실행한다. 릴리즈 뒤 되돌려도 이미 받은 판이 남는다.
- **사용자 기기에 남는 것** — `~/.prevue`의 데몬 기록(`PREVUE_HOME`으로 옮길 수 있다) · 프로젝트별 기록 · 공유 툴체인의 형식과 자리. 새 판이 옛 판이 남긴 것을 읽는다.

폭발 반경이 넓은 곳: 입구 `plugin/bin/prevue`(모든 명령이 지난다), 데몬의 렌더 · 핫스왑 경로와 감시 루프, 컴파일러 `bridge`.

## 빌드 사각지대

- **`plugin/daemon/daemon/src/bridge/`** — `kotlin-compiler-embeddable`에 `compileOnly`로 묶이고, 실행 때는 격리 클래스로더에 공유 툴체인의 컴파일러 jar와 함께 올라가 데몬이 리플렉션으로 부른다. 이름 · 시그니처가 어긋나면 컴파일이 아니라 실행 때 드러난다.
- **대상 앱 클래스패스 · Compose 판** — 렌더 결과는 대상의 클래스패스 덤프에 달렸고, 대상 저장소의 Gradle 실행은 승인이 필요해 리뷰에서 돌릴 수 없다(`implement`의 멈춤 목록).
- **CLI**(`plugin/cli/`의 파이썬 · `plugin/bin/prevue`의 bash와 인라인 `python3`) — 정적 검사(타입 · shellcheck)가 없다. 호출처 누락 · 키 이름 오타는 `tests/cli`에 없는 경로면 빌드로도 잡히지 않는다.
- **생성물** — 생성 스크립트가 만든 생성물은 diff에 보여도 판정 대상은 원본이다. 원본과 생성물이 함께 바뀌었으면 원본을 읽는다.
- **버전 핀** — `plugin/daemon/`의 빌드 파일 · 버전 카탈로그는 layoutlib · 컴파일러 판과 맞물린다. 핀을 바꾼 diff는 "빌드 실패 시 볼 곳"에 적는다.

## 외부 근거 도구

```sh
android --no-metrics docs search "<query>"      # Android · Compose 공식 문서의 kb:// URL 목록
android --no-metrics docs fetch "<kb:// url>"   # 그 문서 전문
```

`--no-metrics`는 서브커맨드 앞에 오는 전역 플래그다 — 빠지면 사용 명령이 Google로 전송된다. 이 도구가 없으면 웹 검색으로 공식 문서를 찾는다. Kotlin 컴파일러 · layoutlib · Gradle의 동작은 로컬 Gradle 캐시의 소스 · 바이트코드로 확인해도 된다.

## 등급 분류 패턴

`review` 스킬의 분류기(`scripts/review_tier.py`)가 이 블록을 읽는다. 형식과 규칙 순서는 그 스크립트 머리말이 갖는다.

- **건너뛰기는 경로로 박는다** — Prevue에서는 `*.md`가 곧 동작이다(`skills-src/*/SKILL.md` · `dev-skills-src/` · `AGENTS.md`). 사람용 요약(README 두 벌)과 그림(`assets/`) · 이슈 양식만 건너뛴다. `CHANGELOG.md`는 건너뛰지 않는다 — `.github/workflows/release.yml`이 GitHub Release 본문을 여기서 뽑고 `tools/sync-version.sh`가 판 제목을 검사한다.
- **가벼운 파일은 두지 않는다** — `plugin/daemon/`의 빌드 파일은 버전 핀을 갖고, 그것을 가볍다고 내리면 위험한 diff가 medium으로 빠진다.
- **xhigh는 diff 안에서 맞는지 따질 수 있는 한쪽 문만** — 매니페스트 · `plugin/VERSION` · 워크플로 · CLI 계약(입구와 `help/`). JSON 응답의 키(데몬 · `plugin/cli/`가 만든다) · 배포 스킬 본문 · 사용자 기기 저장 형식은 high로 보고 머지 위험 줄로 사람 리뷰에 넘긴다.
- 레거시 진입점은 아직 없다.

```json review-tier
{
  "test_dirs": ["test", "integrationTest", "tests"],
  "skip": ["README.md", "README.ko.md", "assets/*", ".github/ISSUE_TEMPLATE/*"],
  "light": [],
  "one_way": {
    "배포 매니페스트 · 버전": [".claude-plugin/marketplace.json", ".agents/plugins/marketplace.json", "plugin/.claude-plugin/plugin.json", "plugin/.codex-plugin/*", "plugin/VERSION"],
    "릴리즈 · CI 워크플로": [".github/workflows/*"],
    "공개 CLI 계약": ["plugin/bin/prevue", "plugin/cli/help/*"]
  }
}
```
