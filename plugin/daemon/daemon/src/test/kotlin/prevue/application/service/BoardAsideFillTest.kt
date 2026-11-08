package prevue.application.service

import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.application.domain.model.CardResult
import prevue.application.domain.model.DeviceModel
import prevue.application.domain.model.ScreenSize
import prevue.application.domain.model.SkipReason
import prevue.application.port.Clock
import prevue.daemon.fake.Fixture
import prevue.daemon.fake.TestGraph
import prevue.daemon.fake.awaitBoardFilled
import prevue.daemon.fake.awaitUntil

/** 조작 중 잠잠할 때 보드의 다른 카드를 라이브 옆 태스크로 그린다(D-155 ③) — 돌아가면 보드가 이미 새것이다. */
class BoardAsideFillTest {
    private val fx = Fixture()

    @AfterEach fun tearDown() = fx.close()

    private fun opened(quietMs: Long = 0): TestGraph =
        fx.graph(Clock(System::currentTimeMillis), postureQuietMs = quietMs).also {
            runBlocking { it.tabs.openPreview(fx.file.path, null, emptyMap(), "test") }
            it.workspace.awaitBoardFilled()
        }

    private fun TestGraph.focus(size: ScreenSize? = null) = runBlocking { boards.focus(0, on = true, by = "test", size = size) }

    private fun TestGraph.save() = runBlocking { hotReload.applySave(listOf(fx.file), "test") }

    private fun TestGraph.cardSpecs() = workspace.now.board!!.cards.map { it.spec }

    private fun cardAsides() = fx.renderer.asides.filter { '@' !in it.previewId }

    @Test fun `조작 중 저장하면 잠잠할 때 다른 카드를 옆 태스크로 다시 그리고 라이브는 그대로다`() {
        val uc = opened()
        uc.focus()
        fx.renderer.shown.clear()

        uc.save()
        val closes = fx.renderer.closes.get()
        uc.workspace.awaitBoardFilled()

        val cards = uc.cardSpecs()
        assertEquals(listOf(cards[0]), fx.renderer.shown.toList(), "다른 카드를 라이브 태스크로 그렸다")
        assertEquals(cards.drop(1), cardAsides())
        assertEquals(cards.drop(1), fx.renderer.treeAsides.toList(), "카드는 가리키기에 쓸 트리를 남긴다")
        assertEquals(closes, fx.renderer.closes.get(), "카드를 그리느라 라이브를 닫았다")
        assertTrue(uc.workspace.now.interactive)
        assertEquals(cards[0], uc.workspace.now.current)
        val b = uc.workspace.now.board!!
        assertTrue(b.cards.drop(1).all { (it.result as CardResult.Drawn).shot.by == QuietFill.QUIET_BY })
    }

    @Test fun `입력이 잠잠하지 않으면 그리지 않고 나갈 때 채우기가 그린다`() {
        val uc = opened(quietMs = 60_000)
        uc.focus()
        uc.save()
        Thread.sleep(200)                                    // 부정 확인 — 잠잠함을 기다리는 동안 옆 태스크가 돌지 않는다
        assertEquals(emptyList<Any>(), cardAsides())
        val b = uc.workspace.now.board!!
        assertFalse(b.cards[1].fresh(b.gen))

        runBlocking { uc.boards.unfocus("test") }
        uc.workspace.awaitBoardFilled()
        assertEquals(emptyList<Any>(), cardAsides())
    }

    @Test fun `지금 기기의 자세 · 크기 칸을 다 그린 뒤에 보드 카드를 그린다`() {
        val uc = opened()
        uc.focus(ScreenSize.Device(DeviceModel.GALAXY_Z_FOLD8))
        awaitUntil("자세 칸 열다섯") { fx.renderer.asides.size >= 15 }
        val before = fx.renderer.asides.size
        uc.save()
        uc.workspace.awaitBoardFilled()
        awaitUntil("자세 칸 서른") { fx.renderer.asides.count { '@' in it.previewId } == 30 }
        val after = fx.renderer.asides.drop(before)
        val firstCard = after.indexOfFirst { '@' !in it.previewId }
        assertEquals(15, firstCard, "보드 카드가 자세 칸보다 먼저 그려졌다 — $after")
        assertEquals(uc.cardSpecs().drop(1), after.drop(firstCard))
    }

    @Test fun `자세 칸이 예외로 멈춰도 보드 카드는 그린다`() {
        val uc = opened()
        fx.renderer.asideThrows = { '@' in it.previewId }
        uc.focus(ScreenSize.Device(DeviceModel.GALAXY_Z_FOLD8))
        uc.save()
        uc.workspace.awaitBoardFilled()
        assertEquals(uc.cardSpecs().drop(1), cardAsides())
        val tried = fx.renderer.asides.count { '@' in it.previewId }
        assertTrue(tried in 1..2, "회차마다 자세를 한 번 던지면 접는다 — ${tried}번")
    }

    @Test fun `저장 뒤 이미 새로 그린 카드는 나갈 때 다시 그리지 않는다`() {
        val uc = opened()
        uc.focus()
        uc.save()
        uc.workspace.awaitBoardFilled()
        fx.renderer.shown.clear()

        runBlocking { uc.boards.unfocus("test") }
        uc.workspace.awaitBoardFilled()
        assertEquals(listOf(uc.cardSpecs()[0]), fx.renderer.shown.toList(), "나갈 때 첫 화면만 다시 그린다")
    }

    @Test fun `옆 그림이 옛 호출자의 링크 오류면 적지 않고 비워 나갈 때 고쳐 그리게 둔다`() {
        val uc = opened(quietMs = 60_000)
        uc.focus()
        fx.compiler.overlay = setOf("demo.CardsKt")
        fx.renderer.asideFails = "java.lang.NoSuchMethodError: 'void demo.CardsKt.Shape(int)'"

        val r = runBlocking { uc.boards.drawCard(1, force = true, by = "test") }

        assertEquals(CardResult.Skipped(1, SkipReason.INTERACTIVE), r)
        assertEquals(null, uc.workspace.now.board!!.cards[1].result)
        assertTrue(uc.workspace.now.interactive)
    }

    @Test fun `앱 자신의 링크 오류는 오버레이 탓이 아니라 그대로 실패로 적는다`() {
        val uc = opened(quietMs = 60_000)
        uc.focus()
        fx.renderer.asideFails = "java.lang.NoSuchMethodError: 'void lib.Outside.call(int)'"

        val r = runBlocking { uc.boards.drawCard(1, force = true, by = "test") }

        assertTrue(r is CardResult.Drawn && !r.shot.ok, "$r")
        assertTrue(uc.workspace.now.interactive)
    }
}
