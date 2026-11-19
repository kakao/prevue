<!-- 생성물이다. AGENTS.md 를 고치고 tools/gen-agents.sh 로 만든다 -->
# Prevue — 세션 규칙

- **`main` · `develop`은 PR로만 움직이고 직접 푸시하지 않는다.** 저장소 admin은 ruleset을 우회해 서버가 막아 주지 않고, `main`에 미는 순간 배포된다. 예외는 `ship`이 하는 버전 커밋과 릴리즈 뒤 fast-forward뿐이다.
- **저장소의 "머지 후 head 브랜치 자동 삭제"를 켜지 않는다.** 릴리즈 PR의 head가 `develop`이라 켜면 릴리즈 머지 때 `develop`이 지워진다.
