package prevue.fixture.preview

import androidx.compose.ui.tooling.preview.Devices
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.tooling.preview.Preview as P

// PreviewLocatorTest가 이 소스와 그 클래스 파일을 함께 읽는다. 함수 몸통은 상관없다.

@Preview("Post screen navrail", device = Devices.PIXEL_C)
@Preview("Post screen navrail (dark)", uiMode = UI_MODE_NIGHT_YES or UI_MODE_TYPE_NORMAL, device = Devices.PIXEL_C)
fun NavRail() = Unit

@DayNight
fun Home() = Unit

@Complete
fun Card() = Unit

@LightDarkLandscape
@Tall
fun Both() = Unit

@P(name = "aliased", widthDp = 200)
fun Aliased() = Unit
