# Pearl KMP 픽스처

[Pearl](../pearl/README.md)을 Kotlin Multiplatform · Compose Multiplatform으로 옮긴 복제본이다. Prevue 통합 테스트(`plugin/`에서 `./gradlew integrationTest`의 `KmpRenderIntegrationTest`)가 commonMain 프리뷰를 앱 덤프로 그리는 길의 회귀를 본다.

- **pearl의 규칙을 그대로 따른다** — 독립 Gradle 프로젝트, 공개 Maven만, 버전 고정, 그림 · 글꼴 파일 없음. 그래서 CMP 글꼴은 여기서 못 보고 공개 검증장(kotlinconf-app)에서만 본다.
- **빌드 모양은 AGP 9의 새 모양**(`com.android.kotlin.multiplatform.library`)이다. Kotlin · AGP · CMP는 kotlinconf-app과 같은 조합이다(`gradle/libs.versions.toml`).
- **타깃은 Android + iOS다.** iOS 타깃은 덤프 Gradle이 Kotlin/Native를 받지 않는지 보려고 둔다 — 테스트는 덤프에 빈 `KONAN_DATA_DIR`을 주고 그 자리가 빈 채인지 본다.
- **pearl을 고치면 여기도 같이 본다.** 코드는 같고 바뀐 곳은 아래뿐이다.

| pearl | pearl-kmp |
|---|---|
| `src/main/kotlin` | `src/commonMain/kotlin` — `:app`만 Android 앱 그대로 |
| `R.string` · `R.drawable`(`res/`) | `Res.string` · `Res.drawable`(`composeResources/`) — 아이콘은 같은 손으로 쓴 벡터다 |
| 음수 치수 리소스(`dimens.xml`) | 상수 — CMP에는 치수 리소스가 없다 |
| `BackHandler` | `PearlBackHandler` — expect/actual(`BackHandler.kt`). 저장하면 Prevue가 Gradle 빌드 필요로 멈춘다 |
| `Configuration.UI_MODE_NIGHT_YES` | 같은 값의 상수(`PearlPreviews.kt`) — `android.content.res`는 commonMain에 없다 |
| `LocalConfiguration.screenWidthDp` | `screenWidthDp()`(`Window.kt`) — 창 크기에서 잰다 |
| — | `AdaptivePearlWidePreview`(`AdaptivePreviews.kt`) — 1280dp 정적 프리뷰. `screenWidthDp()`가 첫 프레임부터 실제 폭이면 5열이다(`KmpRenderIntegrationTest`가 본다) |
| — | `LegacyPreviews.kt` — 옛 JetBrains `@Preview`(직접 하나 + 멀티 프리뷰 둘) |
| — | `:feature:desktop` — Android 타깃이 없는 모듈. warmup이 이유를 말하고 멈춘다 |
| — | `components/` — `includeBuild`로 싣는 composite 빌드. `:app`이 좌표로 받는 KMP 모듈 `:ui:swatch` 하나를 두고, 덤프가 그 commonMain을 `:components:ui:swatch`로 적는지 본다 |
