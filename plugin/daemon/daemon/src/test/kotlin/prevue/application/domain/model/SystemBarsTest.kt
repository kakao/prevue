package prevue.application.domain.model

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class SystemBarsTest {
    private val on = PreviewSpec("demo.CardsKt.Card0", "demo.CardsKt.Card0", mapOf("showSystemUi" to "true"), null, 0)

    private fun barsOn(size: ScreenSize): SystemBars = size.applyTo(on).systemBars

    @Test fun `모든 기기 자세는 제 계열의 바를 전달 인셋의 위 · 아래 높이와 출처로 그리고 기기 없는 크기는 Preview 기본 바다`() {
        DeviceModel.entries.flatMap { it.postures }.forEach { device ->
            val shown = barsOn(device) as SystemBars.Shown
            val input = DeviceInsetInputs.of(device)
            assertEquals(device.model.look, shown.look, device.key)
            assertEquals(input.values.statusBars.top, shown.insets!!.statusDp, device.key)
            assertEquals(input.values.navigationBars.bottom, shown.insets.navDp, device.key)
            assertEquals(input.evidence.url, shown.insets.url, device.key)
            assertEquals(input.values, CardOverride(on.previewId, device).applyTo(on).appInsets, device.key)
        }
        val ios = DeviceModel.IPHONE_17.postures.first()
        assertEquals(ios.insetProfile.safeArea!!.top, (barsOn(ios) as SystemBars.Shown).insets!!.statusDp)
        assertEquals(SystemBars.COMMON, barsOn(ScreenSize.Dp(320, 640)))
        assertEquals(SystemBars.COMMON, on.systemBars)
    }

    @Test fun `끄면 기기를 골라도 바가 없다`() {
        val off = ScreenSize.Device(DeviceModel.GALAXY_S26).applyTo(SystemUi.OFF.applyTo(on))
        assertEquals(SystemBars.Hidden, off.systemBars)
    }

    @Test fun `기기 크기 위에 dp 크기를 얹으면 옛 기기의 바를 들고 가지 않는다`() {
        val device = ScreenSize.Device(DeviceModel.GALAXY_S26).applyTo(on)
        assertEquals(SystemBars.COMMON, ScreenSize.Dp(320, 640).applyTo(device).systemBars)
    }

    @Test fun `모든 기기 자세의 이름표로 그 자세를 되찾는다`() {
        val all = DeviceModel.entries.flatMap { it.postures }
        assertTrue(all.all { ScreenSize.postureOf(it.key) == it })
    }
}
