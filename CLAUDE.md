<!-- 생성물이다. AGENTS.md 를 고치고 tools/gen-agents.sh 로 만든다 -->
# Prevue — 세션 규칙

**Prevue**(CLI `prevue`)는 Android Studio 없이 Jetpack Compose의 `@Preview`를 브라우저에 띄우고, 저장하면 Gradle 없이 다시 그리는 CLI 도구다.
개발자와 코딩 에이전트가 **같은 프리뷰 한 장을 보면서** UI를 고치는 것이 목표다.

이 파일은 이 저장소에서 일할 때의 **규칙**만 갖는다.

## 규칙

- **문서와 코드가 어긋나면 코드가 기준**이다. 저장소 문서는 같은 PR에서 고친다. 같은 사실을 두 곳에 두지 않는다.
- **하드 제약** — 빌드 무침습(대상 저장소의 빌드 파일·플러그인·태스크를 건드리지 않는다) · 뷰어는 브라우저 · Gradle은 부트스트랩 1회 · debug 산출물만. 뒤집을 조건이 "없음"인 것은 뒤집지 않는다.
- **`CHANGELOG.md`에는 사용자에게 보이는 변화만** `[Unreleased]` 아래에 적는다. 작업 PR에서 적는다 — 병렬 PR이 같은 자리에 적어도 `merge=union`이 둘 다 남긴다. 쓰는 법과 외부 기여 · 제보 멘션은 `dev-skills-src/release-notes.md` — 외부 PR을 머지할 때도 본다.
- **뷰어의 색 · 글자 · 모서리 · 그림자 · 시간 · 간격은 `plugin/viewer/tokens.css`의 역할 이름으로만 쓴다**(D-96) — `sh tools/lint.sh`가 날값을 막는다. 새 값이 필요하면 `tokens.css`와 Storybook `재료/Tokens`(`viewer-src/stories/Tokens.stories.tsx`)를 같은 PR에서 고치고, 색 역할이면 대비 쌍(`tests/viewer/contrast-pairs.json`)도 고친다.
- **버전 숫자(`plugin.json`의 `version` · README 버전 배지 · CHANGELOG 제목)는 손으로 고치지 않는다.** `plugin/VERSION`만 올리고 `tools/sync-version.sh`로 옮긴다. 마켓플레이스의 플러그인 소스는 `main` 브랜치라 main에 머지되는 순간 배포된다.

## 브랜치와 워크트리

- **`main`은 배포본, `develop`은 통합 브랜치다.** 둘 다 PR로만 움직인다 — develop은 작업 PR과 로컬 검증 · CI(빌드 검증)(`implement` 5단계), main은 릴리즈 PR과 CI(빌드 검증). develop에는 필수 체크가 없어 CI를 기다리는 것은 `implement`가 지킨다 — 외부 기여 PR은 로컬 검증 없이 CI만 거친다. **직접 푸시하지 않는다** — 둘 다 ruleset(PR 필수 · 승인 0개 · 삭제 · 강제 푸시 금지)이 걸려 있지만 저장소 admin은 우회하므로 에이전트의 직접 푸시는 서버가 막아 주지 않는다. main에 미는 순간 배포된다.
- **작업 하나 = 브랜치 하나 = 워크트리 하나**(브랜치는 `worktree-<작업명>`). Claude Code와 Codex 모두 저장소 루트의 `.worktrees/<작업명>`에 워크트리를 둔다. 베이스 체크아웃은 `develop`에 두고 거기서 코드를 고치지 않는다. **워크트리를 만들고 지우는 것은 작업을 넘기는 쪽(사람이나 오케스트레이터)이다.** 그 워크트리 안의 절차(계획 → 개발 → 리뷰 → PR → 머지 → 치우기)는 **`implement` 스킬**(`dev-skills-src/implement/SKILL.md`)이 갖는다. 여기는 규칙만 둔다.
- **클론 직후 한 번 `git remote set-head origin develop`.** 워크트리는 로컬 `origin/HEAD`에서 따는데 GitHub 기본 브랜치는 `main`이라(마켓플레이스가 거기서 읽힌다) 그대로 두면 워크트리가 main에서 시작한다. `git remote set-head -a`를 치면 main으로 돌아간다.
- **워크트리에서 프리뷰를 볼 때는 그 워크트리를 `(cd plugin/daemon && ./gradlew --offline installPrevue)`로 빌드하고 그 `plugin/bin/prevue`를 쓴다.** CLI는 자기 체크아웃이 띄운 데몬만 쓴다(status의 `root`) — 다른 체크아웃의 `plugin/bin/prevue`를 부르면 그 체크아웃의 데몬과 코드로 그린다.
- **작은 수정은 PR 없이 develop에 바로 넣는다** — 동작이 안 바뀌는 것(문서 · 주석 · 오타)과 릴리즈의 버전 커밋. develop 위로 리베이스해 `git push origin HEAD:develop`(fast-forward만). `plugin/` · `skills-src/` · `dev-skills-src/` · `tools/` · 워크플로 · 빌드 파일을 건드리면 PR로 간다. 이 파일을 고치면 `sh tools/gen-agents.sh`로 만든 `CLAUDE.md`를 같은 커밋에 싣는다 — develop 푸시에는 CI가 돌지 않아 어긋난 채로 들어가면 뒤의 모든 PR이 CI에서 막힌다.
- **워크트리에서 `gh pr merge` · `gh pr close`에 `--delete-branch`를 붙이지 않는다** — 로컬 브랜치를 지우고 워크트리를 `main`으로 옮긴다(그 위에서 리베이스하면 로컬 main이 develop이 된다). 원격 브랜치는 머지한 뒤 따로 지운다.
- **PR은 `gh pr create --base develop`.** 기본 브랜치가 `main`이라 base를 빠뜨리면 main으로 간다.
- **develop 머지는 에이전트가 한다.** PR 본문의 성공 기준·검증 기록을 채우고 로컬 검증과 CI(빌드 검증)가 통과했으면 squash로 머지한다(`implement` 5단계).
- **머지한 뒤 그 작업의 것을 치운다** — 데몬 · 원격 작업 브랜치는 워크트리 안의 세션이, 워크트리 · 로컬 브랜치는 만든 쪽이. 다른 세션의 워크트리는 머지됐어도 건드리지 않는다. **저장소의 "머지 후 head 브랜치 자동 삭제"는 켜지 않는다** — 릴리즈 PR의 head가 `develop`이라 켜 두면 릴리즈 머지 때 `develop`이 지워진다(0.9.0에서 실제로 지워져 되살렸다). `develop` · `main`은 지우지 않는다. 쌓인 변화가 릴리즈할 만하면 사용자에게 **권하기만** 한다.

## 릴리즈 — 사용자가 지시할 때만

절차는 **`/ship` 스킬**(`dev-skills-src/ship/SKILL.md`)이 갖는다. 여기는 규칙만 둔다.

- **PR은 `develop` → `main` 하나다.** 버전 커밋(`plugin/VERSION` · `sh tools/sync-version.sh` · `[Unreleased]` 정리)은 PR 없이 develop에 fast-forward로 민다 — 코드가 없어 릴리즈 PR의 "빌드 검증"이 같은 트리를 본다(main · develop 푸시에는 아무것도 돌지 않는다). 여섯 파일(`plugin/VERSION` · 매니페스트 둘 · README 두 벌 · CHANGELOG) 밖이 바뀌면 이 예외가 아니다.
- **릴리즈 PR은 merge commit으로 머지한다** — squash · rebase면 develop과 main이 갈라진다. 머지가 배포다.
- **기록** `gh workflow run 릴리즈 --ref main`이 태그와 GitHub Release를 만든다. 그 실행 결과까지 확인하고 완료라고 말한다.
- **릴리즈의 머지 관문은 CI(빌드 검증)와 PR head의 `스킬 평가` 상태다** — 버전 · 태그 · 동기화는 `/ship`이 버전 커밋 전에 본다 — 릴리즈에서 로컬 검증을 다시 돌지 않는다. main ruleset이 빌드 검증(`build`) 통과와 merge commit만 강제하고, `스킬 평가`는 서버가 아니라 `/ship`이 지킨다.
- 사람에게 확인받는 곳은 버전 커밋을 밀기 전 한 번이다. 실패하면 되돌리지 않고 멈춰 보고한다 — 고친 뒤 `/ship`이 멈춘 자리부터 이어 간다.

## 승인이 필요한 것

- **대상 저장소의 Gradle 실행**(클래스패스 덤프) — 남의 빌드를 돌리는 일이라 알리고 승인받는다. 도구 자신의 빌드는 `(cd plugin/daemon && ./gradlew --offline installPrevue)`로 충분하다. 저장소 안 픽스처(`fixtures/pearl` · `fixtures/pearl-kmp`, 공개 Maven만)는 도구의 일부라 승인 없이 — `integrationTest`가 덤프를 스스로 뜬다. 단 Gradle 홈의 `init.d`에 스크립트가 있으면 테스트가 뜨지 않고 멈춘다.

## 개발 위생 — 제품 제약이 아니다

- 검증장은 저장소 안 픽스처 `fixtures/pearl` · `fixtures/pearl-kmp` · `fixtures/pearl-demo`와, `tools/`의 측정 · 촬영 스크립트가 쓰는 저장소 밖 공개 앱 체크아웃(nowinandroid · kotlinconf-app 등)이다. 검증장에 실험 산출물을 남기지 않는다 — 소스를 고쳐 봐야 하면 `.cache/spike/src/` 복사본을 `--watch`로 감시한다. 저장소 밖 체크아웃은 고쳤다 되돌린다.
- 같은 대상 체크아웃을 다른 워크트리의 데몬이 이미 보고 있으면(`prevue status`의 `daemons`) `--no-watch`로 띄우고 `reload`로 잰다. 산출물 디렉터리가 대상 경로마다 하나라 저장 한 번에 두 데몬이 같은 PNG를 쓰다 깨진다 — 남의 세션 데몬도 깨운다.

## 코멘트 컨벤션

- **Kotlin(`plugin/daemon/`의 모듈 `application` · `infrastructure` · `daemon` · `build-logic`의 `src/main`과 `daemon`의 `src/bridge`)에는 새 주석을 달지 않는다**(D-70) — KDoc 포함. 이유는 이름 · 테스트로 옮긴다. 코드 밖 세계의 사실(라이브러리 버그 · 플랫폼 제약)만 `// 외부:` 한 줄로 둔다. 기존 주석은 고치지 말고 지운다 — 문구를 고쳐도 새 주석이다.
- 판정은 `sh tools/lint.sh`가 한다 — 슬롭 규칙 · 지표 · 죽은 코드 · 층 규칙(`tools/lint/detekt.yml`, D-150) · 새 주석 · 뷰어 날값. 규칙을 더할 때는 `tools/lint/`의 규칙과 심은 위반(`tests/lint`)을 함께 둔다.
- 다른 파일(셸 · JS · 파이썬 · 빌드 스크립트)의 주석은 한국어로 간결하게, 이유 · 제약(why)만 적는다.

## 리뷰

리뷰는 `review` 스킬과 리뷰어(`reviewer-medium` · `reviewer-high` · `reviewer-xhigh`)가 한다 — 이 스킬이 설치돼 있으면 쓰고 없으면 건너뛴다. 이 저장소의 리뷰 규약은 `dev-skills-src/review.md`다 — 코딩 표준 위치 · 린트 명령과 해석 · 기준 ref · 한쪽 문 신호 · 빌드 사각지대 · 등급 분류 패턴을 갖는다. 언제 어느 등급으로 띄우나는 `implement` 4단계가 갖는다.

## 회고

회고는 `retro` 스킬이 한다 — 이 스킬이 설치돼 있으면 쓰고 없으면 건너뛴다. 이 저장소의 회고 규약은 `dev-skills-src/retro.md`다 — 남기기 노트와 장부가 쌓이는 폴더를 갖는다. 언제 남기나는 `implement` 6단계가 갖는다.

## 저장소

원격은 `github.com/kakao/prevue`이고 기본 브랜치는 `main`이다(마켓플레이스가 거기서 읽힌다). `.claude/`는 작업 메모라 gitignore이고(생성물인 `.claude/skills/`만 추적한다), 제품은 **`plugin/`** 하나다 — 마켓플레이스 둘(`.claude-plugin/marketplace.json` · `.agents/plugins/marketplace.json`)이 git-subdir로 그 폴더만 받는다(D-123). 입구 `bin/prevue` · CLI 몸통 `cli/`(파이썬 · `help/`) · 데몬 Gradle 프로젝트 `daemon/` · 기기 스펙 `devices/`(데몬 빌드와 뷰어 빌드가 같은 스펙에서 기기 표를 만든다, D-183) · 뷰어 `viewer/` · `skills/claude/`(Claude Code) · `skills/codex/`(Codex) · `.claude-plugin/plugin.json` · `.codex-plugin/`이 거기 있고, 밖(`viewer-src/` · `fixtures/` · `assets/` · `prototypes/` · `tests/` · `tools/`)은 설치본에 실리지 않는다. `plugin/`의 `LICENSE` · `NOTICE.md`는 루트 원본의 사본이라 `tools/plugin-copies.sh`로만 옮긴다. 스킬은 **`skills-src/`만 고치고 `tools/gen-agents.sh`로 두 벌을 만든다** — `plugin/skills/claude/`·`plugin/skills/codex/`는 생성물이라 손으로 고치지 않는다(CI가 `--check`로 막는다). 이 저장소를 개발할 때만 쓰는 스킬(`implement` · `ship`)은 **`dev-skills-src/`**에 두고, 같은 스크립트가 `.claude/skills/`·`.agents/skills/`(Codex의 저장소 스킬)로 만든다 — 플러그인에 실리지 않아 Prevue 사용자에게 가지 않는다. `skills-src/`에 넣으면 배포된다. 한 에이전트에만 줄 구간은 `only:claude` · `only:codex` 표시로 감싼다(형식은 `tools/gen-agents.sh` 머리말). **`CLAUDE.md`는 이 파일에서 같은 스크립트가 만든 생성물이다** — 이 파일만 고친다. Codex는 이 파일을 원본째 읽으므로 여기에는 `only` 구간을 두지 않는다.

뷰어 HTML·JS·CSS의 원본과 React·TypeScript·Storybook은 `viewer-src/`에 있다. Node 판과 의존성은 그 안의 `.node-version`·`package-lock.json`으로 고정한다. `sh tools/gen-viewer.sh`가 `plugin/viewer/`의 생성물을 만들고 CI는 `--check`와 `tsc --noEmit`으로 검증한다. `plugin/viewer/tokens.css`·`strings/*.json`·`js/resize-scene.js`·`prevue.svg`는 손으로 고치는 소스다. 기존 화면 원본은 `viewer-src/legacy/`에 있고, 날값 린트는 그 원본과 TS·TSX의 JSX `style`을 검사하며 번들을 제외한다.
