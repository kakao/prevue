# Prevue 코드 규칙

코드를 고칠 때 지키는 이 저장소의 규칙이다. 세션 규칙(`AGENTS.md`)이 이 문서를 가리키고, `implement`가 만들 때 따르며, 리뷰 규약(`dev-skills-src/review.md`)이 코딩 표준으로 읽는다. 린트 결과는 판단하지 않고 결과대로 고친다.

## 뷰어 값

- **뷰어의 색 · 글자 · 모서리 · 그림자 · 시간 · 간격은 `plugin/viewer/tokens.css`의 역할 이름으로만 쓴다**(D-96) — `sh tools/lint.sh`가 날값을 막는다. 새 값이 필요하면 `tokens.css`와 Storybook `재료/Tokens`(`viewer-src/stories/Tokens.stories.tsx`)를 같은 PR에서 고치고, 색 역할이면 대비 쌍(`tests/viewer/contrast-pairs.json`)도 고친다.

## 코멘트 컨벤션

- **Kotlin(`plugin/daemon/`의 모듈 `application` · `infrastructure` · `daemon` · `build-logic`의 `src/main`과 `daemon`의 `src/bridge`)에는 새 주석을 달지 않는다**(D-70) — KDoc 포함. 이유는 이름 · 테스트로 옮긴다. 코드 밖 세계의 사실(라이브러리 버그 · 플랫폼 제약)만 `// 외부:` 한 줄로 둔다. 기존 주석은 고치지 말고 지운다 — 문구를 고쳐도 새 주석이다.
- 판정은 `sh tools/lint.sh`가 한다 — 슬롭 규칙 · 지표 · 죽은 코드 · 층 규칙(`tools/lint/detekt.yml`, D-150) · 새 주석 · 뷰어 날값. 규칙을 더할 때는 `tools/lint/`의 규칙과 심은 위반(`tests/lint`)을 함께 둔다.
- 다른 파일(셸 · JS · 파이썬 · 빌드 스크립트)의 주석은 한국어로 간결하게, 이유 · 제약(why)만 적는다. 워크플로(`.github/workflows/`)는 이름 · 스텝 이름 · 주석 · 메시지를 영어로 쓴다.
