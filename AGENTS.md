# Prevue — 세션 규칙

**Prevue**(CLI `prevue`)는 Android Studio 없이 Jetpack Compose의 `@Preview`를 브라우저에 띄우고, 저장하면 Gradle 없이 다시 그리는 CLI 도구다.
개발자와 코딩 에이전트가 **같은 프리뷰 한 장을 보면서** UI를 고치는 것이 목표다.

이 파일은 이 저장소에서 일할 때의 **규칙**만 갖는다. 왜·무엇·어떻게는 볼트 문서가 소유하고, 여기에 요약을 복사하지 않는다.
볼트·검증장의 위치는 사람마다 달라 개인 파일에 둔다 — Claude Code는 `CLAUDE.local.md`(gitignore, `.worktreeinclude`로 워크트리에 복사된다), Codex는 `~/.codex/AGENTS.md`.

## 문서 — 시작 전에 읽는 순서

| 문서 | 언제 읽나 |
|---|---|
| `Atlas/Notes/Prevue.md` | **항상.** 허브. 할 일은 허브의 표가 아니라 작업 노트(Effort) 하나씩이고, `♺ Prevue`의 진행중 · 구상 뷰가 모은다 |
| `Atlas/Notes/Prevue 기획.md` | 방향·기준을 건드릴 때. 제품 정의 · 목표와 지표 · 갈림길 넷 · FR · 숫자가 있는 NFR(핫스왑 1초 · 콜드 5초 · 첫 설치 5분 · 메모리 · 에이전트 스킬) · 릴리즈 계획 |
| `Atlas/Notes/Prevue 결정 기록.md` | 정한 것을 건드릴 때. D-xx · 대안 · 뒤집을 조건 |
| `Efforts/On/Prevue *.md`와 그 폴더(`Efforts/On/Prevue <작업>/`) | **어느 작업을 시작·이어 갈 때.** 노트는 조각 · 순서 · 성공 기준 · 뺀 것과 이유, 폴더는 작업 하나당 하나인 Sub-Task 노트(PR로 끝나든 아니든)와 그 결과. 만들고 닫는 것은 볼트 쪽이다 |
| `Atlas/Notes/Prevue 개발 문서.md` | **코드를 고치기 전에.** 지금 구조 · 구현 결정의 이유 · **되돌리지 말 것** · 버전 핀. 지금 코드의 스냅숏이라 변경 이력을 적지 않는다 |
| `Atlas/Notes/Prevue 디자인 시스템.md` | **뷰어를 고치기 전에.** 두 층(원시값 · 역할 이름) · 단계 규칙 · 하지 않는 것. 값은 `plugin/viewer/tokens.css`, 눈으로 보는 곳은 `prototypes/design-system/` |
| `Atlas/Notes/Prevue 성능 실측.md` | 숫자를 말할 때. 회차별 원 기록 |
| `Atlas/Notes/Compose Preview 렌더 파이프라인 분석.md` | AS·렌더러의 일반 구조가 필요할 때 |
| `Atlas/Notes/AI 에이전트 시대의 Android 개발 도구 이탈 수요.md` | 시장·경쟁 근거가 필요할 때 |

**작업 흐름에서 볼트에 남기는 것은 과업 캡처(계획 · 착수 · 머지 · 릴리즈)뿐이다** — `wiki-ingest` 스킬의 보류 캡처 갈래에 종류와 재료만 넘긴다. 작업 노트 · Sub-Task를 만들고 닫는 것, 다음 할 일(구상) · 폐기 · 개발 문서 · 결정 기록 · 성능 실측에 옮기는 것은 볼트 쪽 편입이 하고, 언제 무엇을 넘기는지는 `implement` · `ship` 스킬이 갖는다. 그래서 볼트의 노트 모양이 바뀌어도 이 저장소는 고치지 않는다. 세션 사이에 따로 남기는 핸드오프 파일은 두지 않는다 — 이어받을 자리는 볼트의 작업 노트다. **작업을 접는 것(폐기 · 보류)은 사용자 결정이라 캡처가 없다** — PR을 머지하지 않고 닫으면 볼트 노트를 어떻게 할지 사용자에게 묻는다. 사용자가 볼트 노트를 직접 고치라고 하면 `wiki-ingest` 스킬로만 쓴다(규칙 본문은 사용자 레벨 파일이 갖는다).

## 규칙

- **문서와 코드가 어긋나면 코드가 기준**이다. 저장소 문서는 같은 PR에서 고치고, 볼트 문서가 어긋났으면 머지 캡처의 인사이트로 넘긴다. 같은 사실을 두 곳에 두지 않는다.
- **하드 제약은 기획의 결정 기록이 갖는다.** 빌드 무침습(대상 저장소의 빌드 파일·플러그인·태스크를 건드리지 않는다) · 뷰어는 브라우저 · Gradle은 부트스트랩 1회 · debug 산출물만. 뒤집을 조건이 "없음"인 것은 뒤집지 않는다.
- **`README.md` 벤치마크가 바뀌면 그 숫자 · 조건 · 명령을 머지 캡처의 실측으로 넘긴다.** README는 사람용 요약, 볼트가 원 기록이다.
- **`CHANGELOG.md`에는 사용자에게 보이는 변화만** `[Unreleased]` 아래에 적는다. 작업 PR에서 적는다 — 병렬 PR이 같은 자리에 적어도 `merge=union`이 둘 다 남긴다. 쓰는 법과 외부 기여 · 제보 멘션은 `dev-skills-src/release-notes.md` — 외부 PR을 머지할 때도 본다.
- **뷰어의 색 · 글자 · 모서리 · 그림자 · 시간 · 간격은 `plugin/viewer/tokens.css`의 역할 이름으로만 쓴다**(D-96) — `sh tools/lint.sh`가 날값을 막는다. 새 값이 필요하면 `tokens.css`와 견본(`prototypes/design-system/`)을 같은 PR에서 고친다.
- **버전 숫자(`plugin.json`의 `version` · README 버전 배지 · CHANGELOG 제목)는 손으로 고치지 않는다.** `plugin/VERSION`만 올리고 `tools/sync-version.sh`로 옮긴다. 마켓플레이스의 플러그인 소스는 `main` 브랜치라 main에 머지되는 순간 배포된다.

## 브랜치와 워크트리

- **`main`은 배포본, `develop`은 통합 브랜치다.** 둘 다 PR로만 움직인다 — develop은 작업 PR과 로컬 검증(`implement` 5단계), main은 릴리즈 PR과 CI(빌드 검증). 빌드 검증은 develop PR에도 돌지만 그곳의 머지 관문은 로컬 검증이다 — 외부 기여 PR을 받는 그물이다. **직접 푸시하지 않는다** — 둘 다 ruleset(PR 필수 · 승인 0개 · 삭제 · 강제 푸시 금지)이 걸려 있지만 저장소 admin은 우회하므로 에이전트의 직접 푸시는 서버가 막아 주지 않는다. main에 미는 순간 배포된다.
- **작업 하나 = 브랜치 하나 = 워크트리 하나**(브랜치는 `worktree-<작업명>`). Claude Code와 Codex 모두 저장소 루트의 `.worktrees/<작업명>`에 워크트리를 둔다. 베이스 체크아웃은 `develop`에 두고 거기서 코드를 고치지 않는다. 절차(계획 → 워크트리 → 개발 → 리뷰 → PR → 머지 → 볼트 캡처 → 치우기)는 **`implement` 스킬**(`dev-skills-src/implement/SKILL.md`)이 갖는다. 여기는 규칙만 둔다.
- **클론 직후 한 번 `git remote set-head origin develop`.** 워크트리는 로컬 `origin/HEAD`에서 따는데 GitHub 기본 브랜치는 `main`이라(마켓플레이스가 거기서 읽힌다) 그대로 두면 워크트리가 main에서 시작한다. `git remote set-head -a`를 치면 main으로 돌아간다.
- **워크트리에서 프리뷰를 볼 때는 그 워크트리를 `(cd plugin && ./gradlew --offline installPrevue)`로 빌드하고 그 `plugin/bin/prevue`를 쓴다.** CLI는 자기 체크아웃이 띄운 데몬만 쓴다(status의 `root`) — 다른 체크아웃의 `plugin/bin/prevue`를 부르면 그 체크아웃의 데몬과 코드로 그린다.
- **작은 수정은 PR 없이 develop에 바로 넣는다** — 동작이 안 바뀌는 것(문서 · 주석 · 오타)과 릴리즈의 버전 커밋. develop 위로 리베이스해 `git push origin HEAD:develop`(fast-forward만). `plugin/` · `skills-src/` · `dev-skills-src/` · `tools/` · 워크플로 · 빌드 파일을 건드리면 PR로 간다.
- **워크트리에서 `gh pr merge` · `gh pr close`에 `--delete-branch`를 붙이지 않는다** — 로컬 브랜치를 지우고 워크트리를 `main`으로 옮긴다(그 위에서 리베이스하면 로컬 main이 develop이 된다). 원격 브랜치는 머지한 뒤 따로 지운다.
- **PR은 `gh pr create --base develop`.** 기본 브랜치가 `main`이라 base를 빠뜨리면 main으로 간다.
- **develop 머지는 에이전트가 한다.** PR 본문의 성공 기준·검증 기록을 채우고 로컬 검증이 통과했으면 squash로 머지한다.
- **머지한 뒤 그 작업의 것을 치운다** — 데몬 · 원격 작업 브랜치 · 워크트리. 다른 세션의 워크트리는 머지됐어도 건드리지 않는다. **저장소의 "머지 후 head 브랜치 자동 삭제"는 켜지 않는다** — 릴리즈 PR의 head가 `develop`이라 켜 두면 릴리즈 머지 때 `develop`이 지워진다(0.9.0에서 실제로 지워져 되살렸다). `develop` · `main`은 지우지 않는다. 쌓인 변화가 릴리즈할 만하면 사용자에게 **권하기만** 한다.

## 릴리즈 — 사용자가 지시할 때만

절차는 **`/ship` 스킬**(`dev-skills-src/ship/SKILL.md`)이 갖는다. 여기는 규칙만 둔다.

- **PR은 `develop` → `main` 하나다.** 버전 커밋(`plugin/VERSION` · `sh tools/sync-version.sh` · `[Unreleased]` 정리)은 PR 없이 develop에 fast-forward로 민다 — 코드가 없어 릴리즈 PR의 "빌드 검증"이 같은 트리를 본다(main · develop 푸시에는 아무것도 돌지 않는다). 여섯 파일(`plugin/VERSION` · 매니페스트 둘 · README 두 벌 · CHANGELOG) 밖이 바뀌면 이 예외가 아니다.
- **릴리즈 PR은 merge commit으로 머지한다** — squash · rebase면 develop과 main이 갈라진다. 머지가 배포다.
- **기록** `gh workflow run 릴리즈 --ref main`이 태그와 GitHub Release를 만든다. 그 실행 결과까지 확인하고 완료라고 말한다.
- **릴리즈의 머지 관문은 CI(빌드 검증)와 PR head의 `스킬 평가` 상태다** — 버전 · 태그 · 동기화는 `/ship`이 버전 커밋 전에 본다 — 릴리즈에서 로컬 검증을 다시 돌지 않는다. main ruleset이 빌드 검증(`build`) 통과와 merge commit만 강제하고, `스킬 평가`는 서버가 아니라 `/ship`이 지킨다.
- 사람에게 확인받는 곳은 버전 커밋을 밀기 전 한 번이다. 실패하면 되돌리지 않고 멈춰 보고한다 — 고친 뒤 `/ship`이 멈춘 자리부터 이어 간다.

## 승인이 필요한 것

- **대상 저장소의 Gradle 실행**(클래스패스 덤프) — 사내 Maven에 요청이 나간다. 알리고 승인받는다. 도구 자신의 빌드는 `(cd plugin && ./gradlew --offline installPrevue)`로 충분하다. 저장소 안 픽스처(`fixtures/pearl` · `fixtures/pearl-kmp`, 공개 Maven만)는 도구의 일부라 승인 없이 — `integrationTest`가 덤프를 스스로 뜬다. 단 Gradle 홈의 `init.d`에 스크립트가 있으면(저장소를 사내 Maven으로 돌릴 수 있다) 테스트가 뜨지 않고 멈춘다.
- 사내 Maven 자격을 로그·산출물·커밋에 남기지 않는다(NFR-7).

## 개발 위생 — 제품 제약이 아니다

- 검증장(개인 파일에 적은 대상 저장소 체크아웃들)에 실험 산출물을 남기지 않는다. 소스를 고쳐 봐야 하면 `.cache/spike/src/` 복사본을 `--watch`로 감시한다. 개인 체크아웃(nowinandroid 등)은 고쳤다 되돌린다.
- 같은 대상 체크아웃을 다른 워크트리의 데몬이 이미 보고 있으면(`prevue status`의 `daemons`) `--no-watch`로 띄우고 `reload`로 잰다. 산출물 디렉터리가 대상 경로마다 하나라 저장 한 번에 두 데몬이 같은 PNG를 쓰다 깨진다 — 남의 세션 데몬도 깨운다.

## 코멘트 컨벤션

- **Kotlin(`plugin/src/main` · `plugin/src/bridge`)에는 새 주석을 달지 않는다**(D-70) — KDoc 포함. 이유는 이름 · 테스트 · 볼트 결정 기록으로 옮긴다. 코드 밖 세계의 사실(라이브러리 버그 · 플랫폼 제약)만 `// 외부:` 한 줄로 둔다. 기존 주석은 고치지 말고 지운다 — 문구를 고쳐도 새 주석이다.
- 판정은 `sh tools/lint.sh`가 한다 — 슬롭 규칙 · 지표 · 죽은 코드 · 새 주석 · 뷰어 날값. 규칙을 더할 때는 `tools/lint/`의 규칙과 심은 위반(`tests/lint`)을 함께 둔다.
- 다른 파일(셸 · JS · 파이썬 · 빌드 스크립트)의 주석은 한국어로 간결하게, 이유 · 제약(why)만 적는다.

## 저장소

원격은 `github.com/kakao/prevue`이고 기본 브랜치는 `main`이다(마켓플레이스가 거기서 읽힌다). `.claude/`는 작업 메모라 gitignore이고(생성물인 `.claude/skills/`만 추적한다), 제품은 **`plugin/`** 하나다 — 마켓플레이스 둘(`.claude-plugin/marketplace.json` · `.agents/plugins/marketplace.json`)이 git-subdir로 그 폴더만 받는다(D-123). 런타임 · Gradle 프로젝트 · `skills/`(Claude Code) · `codex/skills/`(Codex) · `.claude-plugin/plugin.json` · `.codex-plugin/`이 거기 있고, 밖(`fixtures/` · `assets/` · `prototypes/` · `tests/` · `tools/`)은 설치본에 실리지 않는다. `plugin/`의 `LICENSE` · `NOTICE.md`는 루트 원본의 사본이라 `tools/plugin-copies.sh`로만 옮긴다. 스킬은 **`skills-src/`만 고치고 `tools/gen-skills.sh`로 두 벌을 만든다** — `plugin/skills/`·`plugin/codex/skills/`는 생성물이라 손으로 고치지 않는다(CI가 `--check`로 막는다). 이 저장소를 개발할 때만 쓰는 스킬(`implement` · `ship`)은 **`dev-skills-src/`**에 두고, 같은 스크립트가 `.claude/skills/`·`.agents/skills/`(Codex의 저장소 스킬)로 만든다 — 플러그인에 실리지 않아 Prevue 사용자에게 가지 않는다. `skills-src/`에 넣으면 배포된다. 한 에이전트에만 줄 구간은 `<!-- only:claude -->`/`<!-- only:codex -->` … `<!-- /only -->`로 제 줄에 감싼다.
