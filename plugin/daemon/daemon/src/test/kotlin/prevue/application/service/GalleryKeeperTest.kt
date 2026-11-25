package prevue.application.service

import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.application.port.Clock
import prevue.daemon.fake.Fixture
import prevue.daemon.fake.awaitBoardFilled
import prevue.daemon.fake.awaitUntil

class GalleryKeeperTest {
    private val fx = Fixture(previews = 4)

    @AfterEach fun tearDown() = fx.close()

    private fun opened() = fx.graph(Clock(System::currentTimeMillis)).also {
        runBlocking { it.tabs.openPreview(fx.file.path, null, emptyMap(), "test") }
        it.workspace.awaitBoardFilled()
    }

    @Test fun `보드가 그린 앞 세 장만 남고 다시 띄운 데몬도 읽는다`() {
        val uc = opened()
        awaitUntil("앞 세 장이 남기") { uc.galleryShots.kept(fx.file)?.shots?.size == 3 }
        val kept = uc.galleryShots.kept(fx.file)!!
        assertEquals(4, kept.sheets)
        assertEquals(listOf("Card0", "Card1", "Card2"), kept.shots.map { it.name })

        val again = fx.graph().galleryShots.kept(fx.file)!!
        assertEquals(kept.shots.map { it.id to it.drawnAt }, again.shots.map { it.id to it.drawnAt })
        assertTrue(again.shots.all { fx.graph().galleryShots.image(it.id)?.isFile == true })
    }

    @Test fun `저장으로 보드를 다시 그리면 남은 그림의 그린 시각이 바뀐다`() {
        val uc = opened()
        awaitUntil("앞 세 장이 남기") { uc.galleryShots.kept(fx.file)?.shots?.size == 3 }
        val before = uc.galleryShots.kept(fx.file)!!.shots.first().drawnAt
        Thread.sleep(5)
        runBlocking { uc.hotReload.applySave(listOf(fx.file), "test") }
        uc.workspace.awaitBoardFilled()
        awaitUntil("첫 장이 다시 남기") { uc.galleryShots.kept(fx.file)!!.shots.first().drawnAt > before }
    }
}
