# Prevue 리뷰 규약

사용자 레벨 `review` 스킬이 Prevue diff를 판정할 때 읽는 이 저장소의 사실이다. 리뷰하는 법 · 관점 · 고칠 것/물을 것 기준 · 출력 형식은 `review` 스킬이 갖고, 여기에는 Prevue에만 해당하는 것만 둔다. 세션 규칙(`AGENTS.md`의 "리뷰" 절)이 이 문서를 리뷰 규약으로 선언하고, `implement` 4단계가 등급을 고를 때 아래 `json review-tier` 블록을 넘긴다.

## 코딩 표준

`AGENTS.md`를 끝까지 읽고 diff의 신규 · 수정 줄에 댄다. 특히 다음 절이다.

- **규칙** — 하드 제약(빌드 무침습 · 뷰어는 브라우저 · Gradle은 부트스트랩 1회 · debug 산출물만, 뒤집을 조건은 결정 기록), 뷰어 값은 `plugin/viewer/tokens.css`의 역할 이름으로만(D-96), 버전 숫자는 `plugin/VERSION`과 `tools/sync-version.sh`로만, `CHANGELOG.md`는 사용자에게 보이는 변화만(`dev-skills-src/release-notes.md`).
- **코멘트 컨벤션** — Kotlin 모듈에 새 주석 금지(D-70, `// 외부:` 한 줄만 예외), 층 규칙(`tools/lint/detekt.yml`, D-150), 다른 파일의 주석은 한국어로 이유 · 제약만.
- **저장소** — 생성물(`plugin/skills/claude/` · `plugin/skills/codex/` · `.claude/skills/` · `.agents/skills/` · `plugin/viewer/`의 생성 파일 · `plugin/`의 `LICENSE` · `NOTICE.md`)은 손으로 고치지 않는다. diff에 생성물만 바뀌고 원본(`skills-src/` · `dev-skills-src/` · `viewer-src/` · 루트 원본)이 그대로면 고칠 것이다.

구현 결정의 이유와 **되돌리지 말 것**은 볼트의 `Prevue 개발 문서`가 갖는다 — `AGENTS.md` 문서 표에서 찾아 읽고, diff가 그 목록의 무엇을 되돌리면 고칠 것이 아니라 물을 것이다(결정을 뒤집는 일이라).

## 린트

```sh
sh tools/lint.sh                       # 기준 origin/develop — 릴리즈 PR이면 --base origin/main
```

종료 코드 **0 통과 · 1 위반 · 2 검사를 못 했다.** 위반은 `경로:줄  규칙  조언` 한 줄씩이고, 규칙 갈래는 `slop` · `metric` · `dead` · `layer` · `comment` · `viewer`다. 경고 단계는 없다 — 판정할 것은 위반뿐이다.

- **위반은 고칠 것이다.** develop은 통과 상태로만 움직이므로 남은 위반은 이 작업 몫이다. 조언 칸이 고치는 방향이다. `AGENTS.md`대로 판단하지 않고 결과대로 고친다.
- **거짓 양성으로 보이면 물을 것이다** — "규칙 거짓 양성 의심: <규칙>". 예외 표시를 다는 대신 `tools/lint/`의 규칙과 `tests/lint`의 심은 위반을 함께 고치는 쪽이다.
- **diff가 닿지 않은 파일에 위반이 났으면 물을 것이다** — detekt 판 · 규칙 변경이 기존 코드를 새로 잡은 것이라 범위를 정해야 한다.
- **종료 2는 통과가 아니다** — stderr를 결과에 그대로 남긴다. 흔한 원인은 `viewer-src/node_modules`가 없거나(`npm ci --prefix viewer-src`) 이 머신에 detekt가 아직 없는 것(`sh tools/lint.sh --online` 한 번)이다.

리뷰어가 직접 돌려도 된다 — detekt는 Gradle로 돌지만 `build/lint`와 그 안의 프로젝트 캐시를 따로 써서 메인의 빌드 · 테스트와 겹치지 않는다. 그 밖의 빌드 도구는 부르지 않는다.

결과의 린트 집계 줄은 `lint.sh`의 마지막 줄을 그대로 옮긴다.

```
- 위반 N (slop n · metric n · …) (기준 origin/develop)     # 종료 2면: 검사를 못 했다: <원인>
```

## 기준 ref

`git merge-base origin/develop HEAD`다 — 린트와 등급 분류기가 쓰는 기준과 같다. 릴리즈 PR(`develop` → `main`)이면 `origin/main`과의 merge-base다. `origin/develop`이 없으면 `git fetch -q origin` 뒤 다시 보고, 그래도 정할 수 없으면 추측하지 않고 보고한다.

## 테스트 범위

계획 · 검증 연결의 "테스트 범위"는 `implement` 3 · 5단계의 명령 중 그 변경이 닿는 것이고, 검증 기록은 PR 본문이 갖는다.

| 바뀐 곳 | 덮는 명령 |
|---|---|
| `plugin/daemon/` | `(cd plugin/daemon && ./gradlew --offline test)` — 픽스처 · 클래스패스 경로면 `integrationTest`도 |
| `plugin/cli/` · `plugin/bin/` | `python3 -m unittest discover -s tests/cli` |
| `tools/lint/` | `sh tools/lint.sh`(자기 검사 `tests/lint`를 먼저 돈다) |
| `viewer-src/` · `plugin/viewer/` | `sh tools/gen-viewer.sh --check` · 헤드리스 Chrome(`tests/viewer/`) |
| `skills-src/` · `dev-skills-src/` | `sh tools/gen-skills.sh --check` — 배포 스킬은 릴리즈 때 `/ship`의 스킬 평가(`tests/evals`)가 잰다 |

## 한쪽 문 신호

되돌려도 결과가 남는 것이다.

- **배포** — `main`에 머지되는 순간 마켓플레이스가 읽는다. 매니페스트 넷(`.claude-plugin/marketplace.json` · `.agents/plugins/marketplace.json` · `plugin/.claude-plugin/plugin.json` · `plugin/.codex-plugin/plugin.json`)과 `plugin/VERSION`이 잘못되면 설치 · 갱신이 모두에게 깨진다.
- **릴리즈 · CI 워크플로**(`.github/workflows/`) — 태그 · GitHub Release를 만들고, main의 머지 관문(빌드 검증)이다.
- **공개 CLI 계약** — 종료 코드(사용법 2 · 데몬에 닿지 못함 3, FR-13), JSON 응답의 키, `help/` 문구. 배포 스킬과 사용자 에이전트 · 스크립트가 이것으로 분기한다.
- **배포 스킬 본문**(`skills-src/`) — 사용자의 에이전트가 그대로 실행한다. 릴리즈 뒤 되돌려도 이미 받은 판이 남는다.
- **사용자 기기에 남는 것** — `~/.prevue`(`PREVUE_HOME`)의 데몬 기록 · 프로젝트별 기록 · 공유 툴체인의 형식과 자리. 새 판이 옛 판이 남긴 것을 읽는다.

폭발 반경이 넓은 곳: 입구 `plugin/bin/prevue`(모든 명령이 지난다), 데몬의 렌더 · 핫스왑 경로와 감시 루프, 컴파일러 `bridge`.

## 빌드 사각지대

- **`daemon/src/bridge`** — `kotlin-compiler-embeddable`에 `compileOnly`로 묶이고, 실행 때는 격리 클래스로더에 공유 툴체인의 컴파일러 jar와 함께 올라가 데몬이 리플렉션으로 부른다. 이름 · 시그니처가 어긋나면 컴파일이 아니라 실행 때 드러난다.
- **대상 앱 클래스패스 · Compose 판** — 렌더 결과는 대상의 클래스패스 덤프에 달렸고, 대상 저장소의 Gradle 실행은 승인이 필요해 리뷰에서 돌릴 수 없다(`AGENTS.md` "승인이 필요한 것").
- **Python CLI**(`plugin/cli/` · `plugin/bin/prevue`) — 타입 검사가 없다. 호출처 누락 · 키 이름 오타는 `tests/cli`에 없는 경로면 빌드로도 잡히지 않는다.
- **생성물** — 위 "저장소"의 생성물은 diff에 보여도 판정 대상은 원본이다. 원본과 생성물이 함께 바뀌었으면 원본을 읽는다.
- **버전 핀** — `plugin/daemon/`의 빌드 파일 · 버전 카탈로그는 layoutlib · 컴파일러 판과 맞물린다. 핀을 바꾼 diff는 "빌드 실패 시 볼 곳"에 적는다.

## 외부 근거 도구

```sh
android --no-metrics docs search "<query>"      # Android · Compose 공식 문서의 kb:// URL 목록
android --no-metrics docs fetch "<kb:// url>"   # 그 문서 전문
```

`--no-metrics`는 서브커맨드 앞에 오는 전역 플래그다 — 빠지면 사용 명령이 Google로 전송된다. 이 도구가 없으면 웹 검색으로 공식 문서를 찾는다. Kotlin 컴파일러 · layoutlib · Gradle의 동작은 로컬 Gradle 캐시의 소스 · 바이트코드로 확인해도 된다.

## 등급 분류 패턴

`review` 스킬의 분류기(`scripts/review_tier.py`)가 이 블록을 읽는다. 형식과 규칙 순서는 그 스크립트 머리말이 갖는다.

- **건너뛰기는 경로로 박는다** — Prevue에서는 `*.md`가 곧 동작이다(`skills-src/*/SKILL.md` · `dev-skills-src/` · `AGENTS.md`). 사람용 요약(README 두 벌 · CHANGELOG)과 그림(`assets/`) · 이슈 양식만 건너뛴다.
- **가벼운 파일은 두지 않는다** — `plugin/daemon/`의 빌드 파일은 버전 핀을 갖고, 그것을 가볍다고 내리면 위험한 diff가 high로 빠진다.
- **max는 diff 안에서 맞는지 따질 수 있는 한쪽 문만** — 매니페스트 · `plugin/VERSION` · 워크플로 · CLI 계약(입구와 `help/`). 배포 스킬 본문 · 사용자 기기 저장 형식은 xhigh로 보고 머지 위험 줄로 사람 리뷰에 넘긴다.
- 레거시 진입점은 아직 없다.

```json review-tier
{
  "test_dirs": ["test", "integrationTest", "tests"],
  "skip": ["README.md", "README.ko.md", "CHANGELOG.md", "assets/*", ".github/ISSUE_TEMPLATE/*"],
  "light": [],
  "one_way": {
    "배포 매니페스트 · 버전": [".claude-plugin/marketplace.json", ".agents/plugins/marketplace.json", "plugin/.claude-plugin/plugin.json", "plugin/.codex-plugin/*", "plugin/VERSION"],
    "릴리즈 · CI 워크플로": [".github/workflows/*"],
    "공개 CLI 계약": ["plugin/bin/prevue", "plugin/cli/help/*"]
  }
}
```
