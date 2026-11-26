package prevue.application.service

import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.application.domain.model.CardOverride
import prevue.application.domain.model.ScreenSize
import prevue.application.domain.rule.StaleReasons
import prevue.application.port.Clock
import prevue.daemon.fake.Fixture
import prevue.daemon.fake.awaitBoardFilled
import prevue.daemon.fake.awaitUntil
import prevue.daemon.fake.onEvent

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

    @Test fun `보드가 못 그린 장은 실패로 남고 남기면 갤러리에 알린다`() {
        val events = java.util.concurrent.atomic.AtomicInteger()
        val uc = fx.graph(Clock(System::currentTimeMillis))
        val off = uc.workspace.onEvent { if (it == prevue.application.domain.model.WorkspaceEvent.GalleryShotsChanged) events.incrementAndGet() }
        fx.renderer.exceptions.add("가짜 실패")
        runBlocking { uc.tabs.openPreview(fx.file.path, null, emptyMap(), "test") }
        uc.workspace.awaitBoardFilled()
        awaitUntil("앞 장이 남기") { uc.galleryShots.kept(fx.file)?.let { it.shots.size == 3 && it.failedAt.keys == setOf(0) } == true }
        assertEquals(listOf(1, 2, 3), uc.galleryShots.kept(fx.file)!!.shots.map { it.index })
        awaitUntil("알림") { events.get() > 0 }
        off()
    }

    @Test fun `저장으로 보드를 다시 그리면 남은 그림을 다시 쓴다`() {
        val uc = opened()
        awaitUntil("앞 세 장이 남기") { uc.galleryShots.kept(fx.file)?.shots?.size == 3 }
        val first = uc.galleryShots.image(uc.galleryShots.kept(fx.file)!!.shots.first().id)!!
        first.delete()
        runBlocking { uc.hotReload.applySave(listOf(fx.file), "test") }
        uc.workspace.awaitBoardFilled()
        awaitUntil("첫 장이 다시 남기") { first.isFile }
    }

    @Test fun `보드가 낡았거나 덮어쓴 크기 · 조작 중인 장은 남기지 않는다`() {
        val s = opened().workspace.now
        val focus = s.board!!.focus
        assertEquals(listOf(0, 1, 2), GalleryKeeper.picks(s).map { it.index })
        assertEquals(emptyList<Int>(), GalleryKeeper.picks(s.copy(stale = mapOf("compile" to StaleReasons.compileFailed(listOf(fx.file), "x")))).map { it.index })
        val first = s.board!!.cards[0].spec
        assertEquals(emptyList<Int>(), GalleryKeeper.picks(s.copy(cardOverride = CardOverride(first.previewId, ScreenSize.BAR[1]))).map { it.index })
        assertEquals((0 until focus).toList(), GalleryKeeper.picks(s.copy(interactive = true)).map { it.index })
        val withParams = s.copy(tabs = s.tabs.map { it.copy(params = mapOf("uiMode" to "night")) })
        assertEquals(emptyList<Int>(), GalleryKeeper.picks(withParams).map { it.index })
    }
}
