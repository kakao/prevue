package prevue.daemon.domain

import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.daemon.domain.model.DeviceModel
import prevue.daemon.domain.model.ScreenSize
import prevue.daemon.domain.port.Clock
import prevue.daemon.fake.Fixture
import prevue.daemon.fake.awaitBoardFilled
import prevue.daemon.fake.awaitUntil
import prevue.daemon.fake.workspace

/** 자세별 그림 미리 그리기 — 지금 기기의 다른 자세와 크기 막대의 칸을 라이브 옆 태스크로 그려 뷰어 상태에 싣는다. */
class DrawPosturesTest {
    private val fx = Fixture()

    @AfterEach fun tearDown() = fx.close()

    private val fold8 = ScreenSize.Device(DeviceModel.GALAXY_Z_FOLD8)
    private val bar = listOf("original", "narrow", "foldable", "s26", "pixel9", "ip17", "ipair", "ip17pm", "duo", "fold8", "ultra", "pixelfold", "tablet")

    private fun opened(quietMs: Long = 0): UseCases =
        fx.useCases(Clock(System::currentTimeMillis), postureQuietMs = quietMs).also {
            runBlocking { it.openPreview(fx.file.path, null, emptyMap(), "test") }
            it.workspace.awaitBoardFilled()
        }

    private fun UseCases.pick(size: ScreenSize?) = runBlocking { focusCard(0, on = true, by = "test", size = size) }

    private fun UseCases.drawn(): Map<ScreenSize, String> = readStatus().postures.mapValues { it.value.out.preview.previewId }

    private fun UseCases.awaitDrawn(n: Int) = awaitUntil("자세별 그림 ${n}장 — 지금 ${drawn().keys}") { drawn().size == n }

    private fun UseCases.id() = workspace.now.board!!.focusCard.spec.previewId

    private fun asideKeys(): List<String> = fx.renderer.asides.map { it.previewId.substringAfter('@') }

    @Test fun `폴더블을 고르면 다른 자세 셋을 먼저, 그다음 막대 칸을 왼쪽부터 옆 태스크에 그린다`() {
        val uc = opened()
        uc.pick(fold8)
        uc.awaitDrawn(15)
        val id = uc.id()
        assertEquals(listOf("fold8-folded", "fold8-land", "fold8-folded-land") + (bar - "fold8"), asideKeys())
        assertEquals("spec:width=1248px,height=1972px,dpi=420", fx.renderer.asides[0].params["device"])
        assertEquals("spec:width=1848px,height=2448px,dpi=420", fx.renderer.asides[1].params["device"])
        assertEquals(listOf(id to "$id@fold8"), fx.renderer.copies)
        assertTrue(fold8 !in uc.drawn(), "지금 자세는 싣지 않는다 — ${uc.drawn()}")
        assertTrue(uc.workspace.now.keepIds().containsAll((listOf("fold8-folded", "fold8-land", "fold8-folded-land") + bar).map { "$id@$it" }))
    }

    @Test fun `막대 칸은 원래 크기 · 프리셋 · 기기의 펼친 세로 자세로 그린다`() {
        val uc = opened()
        uc.pick(fold8)
        uc.awaitDrawn(15)
        val byKey = fx.renderer.asides.associateBy { it.previewId.substringAfter('@') }
        val base = uc.workspace.now.board!!.focusCard.spec
        assertEquals(base.params, byKey.getValue("original").params)
        assertEquals("320" to "640", byKey.getValue("narrow").params["widthDp"] to byKey.getValue("narrow").params["heightDp"])
        assertEquals("spec:width=1080px,height=2340px,dpi=480", byKey.getValue("s26").params["device"])
        assertEquals("spec:width=2670px,height=1878px,dpi=480,orientation=landscape", byKey.getValue("duo").params["device"])
    }

    @Test fun `폰은 돌린 자세 하나 뒤에 막대 칸을 그린다`() {
        val uc = opened()
        uc.pick(ScreenSize.Device(DeviceModel.GALAXY_S26))
        uc.awaitDrawn(13)
        assertEquals(listOf("s26-land") + (bar - "s26"), asideKeys())
    }

    @Test fun `인터랙티브를 켜기만 해도 원래 크기를 빼고 막대 칸을 그린다`() {
        val uc = opened()
        uc.pick(null)
        uc.awaitDrawn(12)
        val id = uc.id()
        assertEquals(bar - "original", asideKeys())
        assertEquals(listOf(id to "$id@original"), fx.renderer.copies)
        assertTrue(ScreenSize.Original !in uc.drawn())
    }

    @Test fun `프리셋을 고르면 그 칸을 빼고 그린다`() {
        val uc = opened()
        uc.pick(ScreenSize.PRESETS[0])
        uc.awaitDrawn(12)
        assertEquals(bar - "narrow", asideKeys())
    }

    @Test fun `보기 모드에서는 그리지 않는다`() {
        val uc = opened()
        assertEquals(null, uc.workspace.now.livePostures())
        assertEquals(null, uc.workspace.now.postures)
        assertEquals(emptyList<Any>(), fx.renderer.asides)
    }

    @Test fun `같은 기기 안에서 접으면 다시 그리지 않고 펼친 첫 장까지 바로 싣는다`() {
        val uc = opened()
        uc.pick(fold8)
        uc.awaitDrawn(15)
        val round = uc.workspace.now.postures!!.round
        runBlocking { uc.resize(fold8.copy(folded = true), "viewer") }
        assertEquals(round, uc.workspace.now.postures!!.round)
        assertTrue(fold8 in uc.drawn() && fold8.copy(folded = true) !in uc.drawn(), "${uc.drawn().keys}")
        assertEquals(15, uc.drawn().size)
        assertEquals(15, fx.renderer.asides.size)
    }

    @Test fun `다른 칸으로 바꾸면 새 회차로 옛 그림을 빼고 다시 그린다`() {
        val uc = opened()
        uc.pick(fold8)
        uc.awaitDrawn(15)
        val round = uc.workspace.now.postures!!.round
        runBlocking { uc.resize(ScreenSize.PRESETS[1], "viewer") }
        assertTrue(uc.workspace.now.postures!!.round > round)
        uc.awaitDrawn(12)
        assertEquals(bar - "foldable", asideKeys().drop(15))
    }

    @Test fun `저장하면 낡은 그림을 바로 빼고 새 코드로 다시 그린다`() {
        val uc = opened()
        uc.pick(fold8)
        uc.awaitDrawn(15)
        val round = uc.workspace.now.postures!!.round
        val gate = CountDownLatch(1)
        fx.renderer.asideGate = gate
        runBlocking { uc.applySave(listOf(fx.file), "test") }
        try {
            assertTrue(uc.workspace.now.postures!!.round > round)
            assertEquals(emptyMap<ScreenSize, String>(), uc.drawn(), "저장 직후에 옛 그림이 실렸다")
        } finally {
            gate.countDown()
            fx.renderer.asideGate = null
        }
        uc.awaitDrawn(15)
        assertEquals(30, fx.renderer.asides.size)
    }

    @Test fun `그리는 도중에 크기를 바꾸면 그 그림을 싣지 않는다`() {
        val uc = opened()
        val gate = CountDownLatch(1)
        fx.renderer.asideGate = gate
        uc.pick(fold8)
        assertTrue(fx.renderer.asideEntered.tryAcquire(5, TimeUnit.SECONDS), "옆 태스크가 시작하지 않았다")
        val resized = fx.scope.async { uc.resize(ScreenSize.Original, "viewer") }
        gate.countDown()
        fx.renderer.asideGate = null
        runBlocking { resized.await() }
        uc.awaitDrawn(12)
        assertEquals(bar - "original", uc.drawn().keys.map { it.key })
        assertEquals(listOf("fold8-folded") + (bar - "original"), asideKeys())
    }

    @Test fun `기기를 고른 뒤 잠잠해지기 전에는 그리지 않는다`() {
        val uc = opened(quietMs = 300)
        val t = System.currentTimeMillis()
        uc.pick(fold8)
        assertEquals(0, fx.renderer.asides.size)
        uc.awaitDrawn(15)
        assertTrue(System.currentTimeMillis() - t >= 300, "잠잠해지기 전에 그렸다")
    }

    @Test fun `그리지 못한 칸은 싣지 않고 다시 그리지 않는다`() {
        val uc = opened()
        fx.renderer.asideFails = "렌더 예외"
        uc.pick(fold8)
        awaitUntil("옆 태스크 열다섯 번") { fx.renderer.asides.size == 15 }
        awaitUntil("실패한 칸 열다섯을 적었다") { uc.workspace.now.postures!!.shots.size == 16 }
        assertEquals(emptyMap<ScreenSize, String>(), uc.drawn())
        assertEquals(15, fx.renderer.asides.size)
    }

    @Test fun `저장한 코드로 라이브를 못 그리면 회차를 열지 않아 옆 태스크도 돌지 않는다`() {
        val uc = opened()
        uc.pick(fold8)
        uc.awaitDrawn(15)
        fx.renderer.exceptions += "렌더 예외"
        runBlocking { uc.applySave(listOf(fx.file), "test") }
        assertEquals(null, uc.workspace.now.postures)
        assertEquals(emptyMap<ScreenSize, String>(), uc.drawn())
        assertEquals(15, fx.renderer.asides.size)
    }
}
