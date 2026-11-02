package prevue.fixture.preview

import org.jetbrains.compose.ui.tooling.preview.Preview
import org.jetbrains.compose.ui.tooling.preview.Preview as JbPreview

// PreviewLocatorTest가 레거시 JetBrains @Preview 를 이 소스와 그 클래스 파일로 읽는다.

private const val WIDE = 600

@Preview("legacy wide", widthDp = WIDE)
@Preview("legacy tall", heightDp = WIDE * 2)
fun LegacyDirect() = Unit

@Preview(name = "legacy light")
@Preview(name = "legacy dark", showBackground = true)
annotation class LegacyPair

@LegacyPair
fun LegacyMulti() = Unit

@JbPreview(name = "legacy aliased")
fun LegacyAliased() = Unit
