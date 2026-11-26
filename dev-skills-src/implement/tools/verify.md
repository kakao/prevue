# 검증 돌리기

아래 명령이 모두 0으로 끝날 때까지 고친다. 명령마다 따로 돌리고, 고치는 동안은 실패한 명령만 다시 돌린다.

| 명령 | 언제 | 무엇을 |
|---|---|---|
| `sh tools/lint.sh` | 늘 | Kotlin 슬롭 · 층 규칙 · 뷰어 날값 린트. 종료 2(검사를 못 했다)도 통과가 아니다 |
| `sh tools/unit-test.sh` | 늘 | CLI 판정과 데몬 단위 테스트. 데몬 쪽은 그 입력이 develop과 같으면 스스로 건너뛴다 |
| `sh tools/gen-agents.sh --check` | 늘 | 스킬 두 벌 · `CLAUDE.md`가 원본과 맞는지. 커밋 훅(`tools/git-hooks/pre-commit`)이 켜져 있으면 이미 맞다 |
| `sh tools/gen-viewer.sh --check` | 늘 — `viewer-src` 밖의 계약 JSON · 기기 스펙도 읽는다 | 뷰어 생성물 · `viewer.state` 계약 타입. `viewer-src/node_modules`가 없으면 `npm ci --prefix viewer-src` |

- **리뷰를 맡기기 전에는 전부를** 깨끗한 작업 트리에서 다시 돌리고, 돌린 커밋 SHA와 각 명령의 마지막 줄을 기록 파일에 적는다. 검사는 커밋이 아니라 작업 트리를 읽으므로, `git status --porcelain`이 비어 있을 때 돌린 결과만 그 커밋의 것이다.
- **CI는 Ubuntu · sh · python 3.9에서 돈다** — 로컬에서 통과하고 CI에서만 실패하면 macOS에서만 통과하는 것부터 의심한다.
- **데몬 빌드(Gradle)는 JDK 21 이상이 필요하다** — Metro의 Gradle 플러그인 때문이다. `unit-test.sh` · `lint.sh`는 셸 `JAVA_HOME`이 17이어도 21+를 스스로 고른다. `./gradlew`를 직접 칠 때는 한 명령 안에서 같은 JDK를 준다 — `(G="$(python3 tools/lint/gradle_jdk.py)" && cd plugin/daemon && JAVA_HOME="${G:-${JAVA_HOME:-}}" ./gradlew …)`. 에이전트 셸은 호출 사이에 환경 변수를 넘기지 않는다.
- **린트는 `dev-skills-src/coding.md`대로 고친다** — 위반 해석은 `dev-skills-src/review.md` "린트"다.
