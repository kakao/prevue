package prevue.fixture.preview

import androidx.compose.ui.tooling.preview.Preview

// 공개 저장소에서 본 멀티프리뷰 모양들(2026-10-06 — element-x · thunderbird · JetNews).

const val UI_MODE_NIGHT_YES = 0x20
const val UI_MODE_TYPE_NORMAL = 0x01

/** element-x `@PreviewsDayNight` — 상수 참조 uiMode. */
@Preview(name = "Day", fontScale = 1f)
@Preview(name = "Night", uiMode = UI_MODE_NIGHT_YES, fontScale = 1f)
annotation class DayNight

/** thunderbird `@PreviewLightDarkLandscape` — `or`로 합친 uiMode. */
@Preview(name = "Light", device = "spec:width=891dp,height=411dp")
@Preview(name = "Dark", uiMode = UI_MODE_NIGHT_YES or UI_MODE_TYPE_NORMAL, device = "spec:width=891dp,height=411dp")
annotation class LightDarkLandscape

/** `@Preview` 하나만 단 것 — Container 없이 바로 달린다. */
@Preview(name = "Tall", heightDp = 1200)
annotation class Tall

@Preview(name = "small font", fontScale = 0.5f)
@Preview(name = "large font", fontScale = 1.5f)
annotation class FontScales

@Preview(name = "phone", device = "spec:width=360dp,height=640dp,dpi=480")
@Preview(name = "tablet", device = "spec:width=1280dp,height=800dp,dpi=480")
annotation class DeviceSizes

/** JetNews `@CompletePreviews` — `@Preview`와 다른 멀티프리뷰를 함께 단다. */
@Preview(name = "dark theme", uiMode = UI_MODE_NIGHT_YES)
@FontScales
@DeviceSizes
annotation class Complete
