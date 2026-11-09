package prevue.application.domain.model

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class SystemBarsTest {
    private val on = PreviewSpec("demo.CardsKt.Card0", "demo.CardsKt.Card0", mapOf("showSystemUi" to "true"), null, 0)

    private fun barsOn(size: ScreenSize): SystemBars = size.applyTo(on).systemBars

    @Test fun `기기를 고르면 그 기기의 모양과 출처 값이고 고르지 않은 크기는 공통 바다`() {
        assertEquals(SystemBars.Shown(BarLook.ONE_UI, BarInsets(37.0, 15.0, InsetSource.WINDOW_INSETS)), barsOn(ScreenSize.Device(DeviceModel.GALAXY_S26)))
        assertEquals(SystemBars.Shown(BarLook.PIXEL, BarInsets(65.9, 24.0, InsetSource.WINDOW_INSETS)), barsOn(ScreenSize.Device(DeviceModel.PIXEL_9)))
        assertEquals(SystemBars.Shown(BarLook.IOS, BarInsets(68.0, 34.0, InsetSource.SAFE_AREA)), barsOn(ScreenSize.Device(DeviceModel.IPHONE_AIR)))
        assertEquals(SystemBars.COMMON, barsOn(ScreenSize.Dp(320, 640)))
        assertEquals(SystemBars.COMMON, on.systemBars)
    }

    @Test fun `접이식은 커버 · 펼침이 따로고 재지 않은 자세는 공통 바로 물러난다`() {
        assertEquals(41.9, (barsOn(ScreenSize.Device(DeviceModel.GALAXY_Z_FOLD8, folded = true)) as SystemBars.Shown).insets!!.statusDp)
        assertEquals(40.0, (barsOn(ScreenSize.Device(DeviceModel.GALAXY_Z_FOLD8)) as SystemBars.Shown).insets!!.statusDp)
        assertEquals(SystemBars.COMMON, barsOn(ScreenSize.Device(DeviceModel.PIXEL_9, landscape = true)))
        assertEquals(SystemBars.COMMON, barsOn(ScreenSize.Device(DeviceModel.IPHONE_DUO)))
    }

    @Test fun `끄면 기기를 골라도 바가 없다`() {
        val off = ScreenSize.Device(DeviceModel.GALAXY_S26).applyTo(SystemUi.OFF.applyTo(on))
        assertEquals(SystemBars.Hidden, off.systemBars)
    }

    @Test fun `모든 기기 자세의 이름표로 그 자세를 되찾는다`() {
        val all = DeviceModel.entries.flatMap { it.postures }
        assertTrue(all.all { ScreenSize.postureOf(it.key) == it })
    }
}
