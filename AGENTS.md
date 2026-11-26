# Prevue — 세션 규칙

- **`main` · `develop`은 PR로만 바꾼다.** admin은 ruleset을 우회하고, `main` 푸시는 곧 배포다. 예외는 `release`의 버전 커밋과 릴리즈 뒤 fast-forward다.
- **"머지 후 head 브랜치 자동 삭제"를 켜지 않는다.** 릴리즈 PR의 head가 `develop`이라 켜면 `develop`이 지워진다.
- **커밋 훅을 켠다** — `git config core.hooksPath tools/git-hooks`. 스킬 원본(`skills-src` · `dev-skills-src` · `AGENTS.md`)을 고친 커밋에 생성물을 함께 담는다.
