package prevue.application.service

import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import prevue.application.domain.model.*
import prevue.daemon.fake.Fixture
import prevue.daemon.fake.awaitBoardFilled

class DeviceInsetChoiceTest {
    private val fx = Fixture()

    @AfterEach fun down() = fx.close()

    @Test fun `선택은 모든 자세 기기 원본 커스텀 저장을 거쳐 유지되고 종료하면 초기화된다`() = runBlocking {
        val uc = fx.graph()
        uc.tabs.openPreview(fx.file.path, null, emptyMap(), "test")
        uc.workspace.awaitBoardFilled()
        val first = ScreenSize.Device(DeviceModel.GALAXY_S26)
        uc.boards.focus(0, true, "test", first)
        assertEquals(DeviceInsetChoice.ON, uc.status.read().deviceInsets!!.choice)
        uc.live.setDeviceInsets(DeviceInsetChoice.OFF, "test")
        for (d in DeviceModel.entries.flatMap { it.postures }) {
            uc.live.resize(d, "test")
            val state = uc.status.read()
            assertEquals(d, state.size)
            assertEquals(DeviceInsetChoice.OFF, state.deviceInsets!!.choice)
            assertEquals(AppInsets.NONE, fx.renderer.opened.last().appInsets)
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
        assertEquals(DeviceInsetChoice.OFF, uc.status.read().deviceInsets!!.choice)
        assertEquals(AppInsets.NONE, fx.renderer.opened.last().appInsets)
        uc.boards.focus(0, false, "test")
        uc.boards.focus(0, true, "test", first)
        assertEquals(DeviceInsetChoice.ON, uc.status.read().deviceInsets!!.choice)
    }

    @Test fun `기기의 시스템 UI 변경은 상태를 바꾸지 않고 거절하며 이전 비기기 선택은 복원된다`() = runBlocking {
        val uc = fx.graph()
        uc.tabs.openPreview(fx.file.path, null, emptyMap(), "test")
        uc.workspace.awaitBoardFilled()
        uc.boards.focus(0, true, "test", systemUi = SystemUi.OFF)
        uc.live.resize(ScreenSize.Device(DeviceModel.IPHONE_DUO), "test")
        val before = uc.workspace.now.cardOverride
        assertThrows<IllegalArgumentException> { uc.live.setSystemUi(SystemUi.OFF, "test") }
        assertEquals(before, uc.workspace.now.cardOverride)
        assertTrue(uc.status.read().systemUi!!.shown)
        assertEquals(SystemUi.OFF, uc.status.read().systemUi!!.choice)
        uc.live.setDeviceInsets(DeviceInsetChoice.OFF, "test")
        uc.live.resize(ScreenSize.Original, "test")
        assertFalse(uc.status.read().systemUi!!.shown)
        val other = fx.previewFile("Other")
        uc.tabs.openPreview(other.path, null, emptyMap(), "test")
        assertNull(uc.workspace.now.cardOverride)
        uc.boards.focus(0, true, "test", ScreenSize.Device(DeviceModel.GALAXY_S26))
        assertEquals(DeviceInsetChoice.ON, uc.status.read().deviceInsets!!.choice)
    }
}
