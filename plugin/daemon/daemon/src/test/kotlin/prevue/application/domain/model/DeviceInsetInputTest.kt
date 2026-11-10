package prevue.application.domain.model

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import prevue.application.domain.model.DeviceOrientation.*

class DeviceInsetInputTest {
    @Test fun `42자세 모두 근삿값으로 켜지고 측정 원자료의 빈칸은 남는다`() {
        DeviceModel.entries.flatMap { it.postures }.forEach { device ->
            val input = DeviceInsetInputs.of(device)
            assertNotEquals(AppInsets.NONE, input.values, device.key)
            assertTrue(input.approximate, device.key)
            assertNotNull(input.note, device.key)
            assertNotNull(input.evidence, device.key)
            assertTrue(device.insetProfile.supported)
            assertFalse(device.insetProfile.verified)
            assertNull(device.insetProfile.measured?.systemOverlays)
            val source = PreviewSpec("demo.Card", "demo.Card", emptyMap(), null, 0)
            val on = CardOverride(source.previewId, device).applyTo(source)
            val off = CardOverride(source.previewId, device, deviceInsets = DeviceInsetChoice.OFF).applyTo(source)
            assertEquals(on.params, off.params)
            assertTrue(on.systemBars is SystemBars.Shown)
            assertEquals(input.values, on.appInsets)
            assertEquals(AppInsets.NONE, off.appInsets)
        }
    }

    @Test fun `S26 양쪽 컷아웃과 Duo 커버의 비대칭 safe area를 전달한다`() {
        fun input(model: DeviceModel, folded: Boolean, orientation: DeviceOrientation) = DeviceInsetInputs.of(ScreenSize.Device(model, folded, orientation)).values
        assertEquals(InsetEdges(left = 37.0), input(DeviceModel.GALAXY_S26, false, LANDSCAPE_LEFT).displayCutout)
        assertEquals(InsetEdges(right = 37.0), input(DeviceModel.GALAXY_S26, false, LANDSCAPE_RIGHT).displayCutout)
        assertEquals(InsetEdges(right = 84.0), input(DeviceModel.IPHONE_DUO, true, LANDSCAPE_LEFT).displayCutout)
        assertEquals(InsetEdges(left = 84.0), input(DeviceModel.IPHONE_DUO, true, LANDSCAPE_RIGHT).displayCutout)
        val missing = DeviceInsetInputs.of(ScreenSize.Device(DeviceModel.GALAXY_Z_FOLD8, false, LANDSCAPE_RIGHT))
        assertEquals("fold8", missing.basisPosture)
        assertTrue(missing.note!!.contains("반전"))
        assertEquals(InsetEdges(top = 40.0), missing.values.statusBars)
    }

    @Test fun `절대 방향과 이전 가로 옵션은 구분하고 충돌은 거절한다`() {
        for (model in DeviceModel.entries) for (direction in DeviceOrientation.entries) {
            val device = ScreenSize.parse(null, model.id, false, false, direction.key) as ScreenSize.Device
            assertEquals(direction, device.orientation)
        }
        assertThrows<IllegalArgumentException> { ScreenSize.parse(null, "s26", false, true, "portrait") }
        assertThrows<IllegalArgumentException> { ScreenSize.parse(null, null, false, false, "portrait") }
        assertThrows<IllegalArgumentException> { DeviceOrientation.parse("upside-down") }
    }
}
