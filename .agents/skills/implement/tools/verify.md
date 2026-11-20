<!-- 생성물이다. dev-skills-src/implement/tools/verify.md 를 고치고 tools/gen-agents.sh 로 만든다 -->
# 검증 돌리기

`sh tools/check-local.sh`가 0으로 끝날 때까지 고친다. 무엇을 검사하는지는 그 스크립트의 머리말이 갖는다 — 여기에 목록을 다시 적지 않는다. 실패해도 끝까지 돌아 한 번에 다 보이고, 마지막 줄들이 요약이다.

- **고치는 동안은 실패한 검사만** 그 검사의 명령(요약 줄의 이름과 스크립트 본문에서 찾는다)으로 다시 돌린다.
- **리뷰를 맡기기 전에는 전체를** 깨끗한 작업 트리에서 다시 돌린다. 검사는 커밋이 아니라 작업 트리를 읽으므로, 요약이 "작업 트리 깨끗"이라고 찍은 결과만 그 커밋의 것이다.
- **데몬 빌드(Gradle)는 JDK 21 이상이 필요하다** — Metro의 Gradle 플러그인 때문이다. `check-local.sh` · `lint.sh`는 셸 `JAVA_HOME`이 17이어도 `tools/dev_jdk.py`로 21+를 골라 돌고, 못 찾으면 무엇을 깔지 말하고 멈춘다. `./gradlew`를 직접 칠 때는 `export JAVA_HOME="$(python3 tools/dev_jdk.py)"`를 먼저 한다.
- **린트는 `dev-skills-src/coding.md`대로 고친다** — 위반 해석은 `dev-skills-src/review.md` "린트"다.
