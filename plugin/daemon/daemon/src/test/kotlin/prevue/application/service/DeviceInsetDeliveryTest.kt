package prevue.application.service

import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import prevue.application.domain.model.*
import prevue.daemon.fake.Fixture
import prevue.daemon.fake.awaitBoardFilled

class DeviceInsetDeliveryTest {
    private val fx = Fixture()

    @AfterEach fun down() = fx.close()

    @Test fun `기기는 모든 자세와 원본 커스텀 경유 저장 뒤에도 그 자세의 인셋을 늘 전달한다`() = runBlocking {
        val uc = fx.graph()
        uc.tabs.openPreview(fx.file.path, null, emptyMap(), "test")
        uc.workspace.awaitBoardFilled()
        val first = ScreenSize.Device(DeviceModel.GALAXY_S26)
        uc.boards.focus(0, true, "test", first)
        for (d in DeviceModel.entries.flatMap { it.postures }) {
            uc.live.resize(d, "test")
            val state = uc.status.read()
            assertEquals(d, state.size)
            assertEquals(d, state.deviceInsets!!.device)
            assertEquals(DeviceInsetInputs.of(d).values, fx.renderer.opened.last().appInsets, d.key)
            assertNotEquals(AppInsets.NONE, fx.renderer.opened.last().appInsets, d.key)
            assertTrue(state.systemUi!!.shown)
        }
        for (s in listOf(ScreenSize.Original, ScreenSize.Dp(500, 600))) {
            uc.live.resize(s, "test")
            assertNull(uc.status.read().deviceInsets)
            assertNull(fx.renderer.opened.last().appInsets)
            assertFalse(uc.status.read().systemUi!!.shown)
        }
        uc.live.resize(first, "test")
        uc.hotReload.applySave(listOf(fx.file), "test")
        assertEquals(DeviceInsetInputs.of(first).values, fx.renderer.opened.last().appInsets)
    }

    @Test fun `기기의 시스템 UI 변경은 상태를 바꾸지 않고 거절하며 이전 비기기 선택은 복원된다`() = runBlocking {
        val uc = fx.graph()
        uc.tabs.openPreview(fx.file.path, null, emptyMap(), "test")
        uc.workspace.awaitBoardFilled()
        uc.boards.focus(0, true, "test", systemUi = SystemUi.OFF)
        uc.live.resize(ScreenSize.Device(DeviceModel.IPHONE_DUO), "test")
        val before = uc.workspace.now.cardOverride
        val e = assertThrows<IllegalArgumentException> { uc.live.setSystemUi(SystemUi.OFF, "test") }
        assertFalse(e.message!!.contains("--device-insets"))
        assertEquals(before, uc.workspace.now.cardOverride)
        assertTrue(uc.status.read().systemUi!!.shown)
        assertEquals(SystemUi.OFF, uc.status.read().systemUi!!.choice)
        uc.live.resize(ScreenSize.Original, "test")
        assertFalse(uc.status.read().systemUi!!.shown)
        val other = fx.previewFile("Other")
        uc.tabs.openPreview(other.path, null, emptyMap(), "test")
        assertNull(uc.workspace.now.cardOverride)
    }

    @Test fun `인셋 적용 렌더가 실패하면 실패를 알리고 근거는 요청한 환경을 유지한다`() = runBlocking {
        val uc = fx.graph()
        uc.tabs.openPreview(fx.file.path, null, emptyMap(), "test")
        uc.workspace.awaitBoardFilled()
        uc.boards.focus(0, true, "test", ScreenSize.Device(DeviceModel.GALAXY_S26))
        val device = ScreenSize.Device(DeviceModel.IPHONE_DUO, folded = true)
        fx.renderer.exceptions.add("인셋 적용 실패")
        val result = uc.live.resize(device, "test")!!
        assertFalse(result.ok)
        assertEquals("인셋 적용 실패", result.shot.out.message!!.text)
        val state = uc.status.read()
        assertFalse(state.last!!.ok)
        assertEquals(device, state.size)
        val insets = state.deviceInsets!!
        assertEquals(DeviceInsetInputs.of(device).values, insets.input.values)
        assertTrue(insets.input.approximate)
        assertEquals(BarLook.IOS, state.systemUi!!.bars!!.look)
    }
}
