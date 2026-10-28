# Pearl 픽스처

Prevue 통합 테스트(`./gradlew integrationTest`)가 그리는 대상이자 README 그림을 찍는 버블티 주문 앱이다. 멀티 모듈로 나눠, 테스트가 보는 갈래를 한 저장소 안에서 덮는다.

- **도구 빌드와 떨어진 독립 Gradle 프로젝트다.** 루트의 `./gradlew`는 여기를 모른다. 통합 테스트가 `bin/prevue warmup`으로 이 프로젝트에 Gradle을 한 번 돌려 클래스패스 덤프를 뜬다(공개 Maven만 쓴다 — 승인 없음).
- **버전은 고정한다**(`gradle/libs.versions.toml`). 올리는 PR이 곧 Prevue의 호환성 확인이다. 의존성은 Compose · Material3 · AndroidX core뿐이다 — 새 라이브러리는 공개 저장소의 라이선스 확인을 다시 받는다.
- **그림 파일이 없다.** 컵 · 음료 · 펄 · 얼음 · 블롭은 `:core:ui`의 `Cup`이 Canvas 기본 도형으로 그리고, 아이콘은 직접 쓴 벡터다. 셰이더 · 블러는 쓰지 않는다 — 렌더러가 CPU에서 그려 셰이더는 틱마다 수백 ms다.
- **글꼴은 시스템 기본이다.** 글꼴 파일을 싣지 않는다 — 실으면 공개 저장소의 라이선스 확인(OLIVE)을 다시 받는다. 화면 글자는 영어 한 벌이다.
- **메뉴 100잔**의 이름 · 가격은 지어낸 값이다(`:core:model`의 `Drinks.kt`). 판정에 쓰지 않는다.
- **움직임은 모두 `Animatable` 계열이다.** layoutlib 인터랙티브에서 `AnimatedContent` · `AnimatedVisibility` · 공유 요소 전환은 첫 프레임에 끝나, 카드가 상세로 커지는 전환 · 바텀 네비의 알약 · 출렁임 · 펄 낙하를 직접 그린다.
- **일렁임은 정착을 기다리는 곳에서 멈춘다.** `ambient = false`가 기본이고, 통합 · 뷰어 테스트가 켜는 프리뷰는 모두 이쪽이다. 끝없이 일렁이는 수면(`ambient = true`)은 실제 앱(`MainActivity`)과 README 장면(`showcase/`)만 쓴다.

| 모듈 | 담는 것 | 통합 테스트가 보는 것 |
|---|---|---|
| `:core:model` | 음료 · 갈래 · 맛 데이터(순수 Kotlin) | 프리뷰 없는 모듈이 섞인 그래프 |
| `:core:designsystem` | 테마(레퍼런스 토큰) · 맛별 색 · 버튼 · 칩 · 아이콘(벡터) · 음수 치수 | 첫 포커스(버튼) · 리소스 APK의 음수 치수 |
| `:core:ui` | 컵(`Cup` — 출렁임 · 펄 · 얼음) · 음료 카드 · 가방 배지 · 바텀 네비(`PillNavBar`) | 목록 안 다른 모듈 컴포넌트로 겨냥(`touch --at`) |
| `:feature:pearl` | 앱(`PearlApp` — 탭 넷, 카드가 상세로 커지며 컵이 따로 날아가는 전환) · 메뉴(`PearlScreen` — 칩마다 바뀌는 머리) · 상세(600dp부터 왼쪽 컵 · 오른쪽 패널, 펼친 폴더블은 힌지에서 반반) · 탭 화면 셋 · 보드 30장(`PearlPreviews.kt`) · 칩 필터(`FilterScreen.kt`) · 창 폭으로 갈리는 화면(`AdaptivePreviews.kt` — 메뉴는 폭 220dp마다 한 열, 고르면 상세가 화면을 채운다) · 테스트 전용 프리뷰(스크롤 · `scroll --until` · 공유 요소) · README 장면(`showcase/`) | 보드 카드 수 · 로더 공유 · 프리로더 · 끌기 · values 오버레이 · 휠 |
| `:feature:search` | 검색(TextField) | 아직 없음 — 글자 넣기(`type`)를 덮을 자리 |
| `:app` | 앱 진입점 | 라이브러리 모듈이 리소스를 빌리는 앱(D-38) |

테스트가 기대는 값(카드 수 · 음료 수 · 문자열 · 치수 · 겨냥하는 줄의 표시 주석 · 칩 글자 줄 번호)을 바꾸면 `src/integrationTest`와 `tests/viewer`도 같이 본다.

`tests/viewer`의 데몬 테스트(tabs · workspace · content · resize · preparation)는 `AdaptivePreviews.kt`로 띄운 이 체크아웃의 데몬 하나에 연달아 돌려도 된다. 각 테스트가 시작할 때 데몬을 보드로 되돌려, 앞 테스트가 중간에 죽어도 다음 테스트로 번지지 않는다.
