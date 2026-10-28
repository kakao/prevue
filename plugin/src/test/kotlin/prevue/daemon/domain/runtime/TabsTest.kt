package prevue.daemon.domain.runtime

import app.cash.turbine.test
import kotlinx.coroutines.flow.filterIsInstance
import prevue.daemon.fake.onEvent
import prevue.daemon.domain.model.Pointed
import java.util.concurrent.CompletableFuture
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.daemon.fake.Fixture
import prevue.daemon.fake.awaitBoardFilled
import prevue.daemon.fake.workspace
import prevue.daemon.domain.model.CardResult
import prevue.daemon.domain.model.TabMove
import prevue.daemon.domain.model.WorkspaceEvent
import prevue.daemon.domain.model.VacantTab
import prevue.daemon.domain.model.Vacancy
import prevue.daemon.domain.model.ReloadResult
import prevue.daemon.domain.model.WaitResult
import prevue.daemon.domain.policy.TabPolicy

/** 뷰어 탭(D-54) — `show`는 탭을 열고 바꿔 끼우지 않는다 · 저장은 지금 보는 탭만 그린다 · 상한 10. */
class TabsTest {
    private val fx = Fixture()
    private val uc = fx.useCases()
    private val ws = uc.workspace

    @AfterEach fun tearDown() = fx.close()

    private fun show(f: java.io.File, index: Int? = null, params: Map<String, String> = emptyMap()) =
        runBlocking { uc.openPreview(f.path, index, params, "test") }.also { ws.awaitBoardFilled() }

    @Test fun `다른 파일을 show 하면 새 탭이 열리고 앞 탭은 남는다`() {
        val screen = fx.file
        val card = fx.previewFile("NewsCard")
        assertEquals(TabMove.OPENED, show(screen).tab)
        assertEquals(TabMove.OPENED, show(card).tab)
        assertEquals(listOf(screen.canonicalPath, card.canonicalPath), ws.now.tabs.map { it.key })
        assertEquals(card.canonicalPath, ws.now.activeTab)
        assertEquals(card.canonicalFile, ws.now.board!!.file)

        assertEquals(TabMove.SWITCHED, show(screen).tab)
        assertEquals(screen.canonicalFile, ws.now.board!!.file)
        assertEquals(2, ws.now.tabs.size)
    }

    @Test fun `돌아가는 경로로 열어도 정규 경로의 탭 하나다`() {
        val screen = fx.file
        val roundabout = java.io.File(screen.parentFile, "../${screen.parentFile.name}/${screen.name}")
        show(roundabout)
        assertEquals(screen.canonicalFile, ws.now.board!!.file)
        show(screen)
        assertEquals(listOf(screen.canonicalPath), ws.now.tabs.map { it.key })
        assertEquals(screen.canonicalPath, ws.now.activeTab)
        assertEquals(screen.canonicalFile, ws.now.board!!.file)
    }

    @Test fun `낡지 않은 탭을 되살릴 때는 파일을 읽지 않는다`() {
        val screen = fx.file
        show(screen)
        val epoch = ws.now.board!!.epoch
        show(fx.previewFile("NewsCard"))
        screen.writeText("package com.example\n")

        show(screen)
        assertEquals(epoch, ws.now.board!!.epoch)
        assertEquals(null, ws.now.tabs.single { it.key == screen.canonicalPath }.vacant)
    }

    @Test fun `되살릴 때는 화면부터 옮기고 한 장을 그린다`() {
        val screen = fx.file
        show(screen)
        show(fx.previewFile("NewsCard"))
        val shownAtRender = java.util.concurrent.CopyOnWriteArrayList<java.io.File?>()
        val stop = ws.onEvent { if (it == WorkspaceEvent.NewTask) shownAtRender += ws.now.board?.file }

        show(screen)
        stop()
        assertEquals(listOf(screen.canonicalFile), shownAtRender, "화면을 옮기기 전에 그렸다")
        assertEquals(ws.now.board!!.focusCard.spec, ws.now.current)
    }

    @Test fun `낡지 않은 탭으로 옮기면 보드를 되살리고 한 장만 그린다`() {
        val screen = fx.file
        show(screen, index = 1)
        val epoch = ws.now.board!!.epoch
        show(fx.previewFile("NewsCard"))
        fx.renderer.shown.clear()

        show(screen)
        assertEquals(epoch, ws.now.board!!.epoch, "되살린 보드가 아니라 새로 연 보드다")
        assertEquals(1, ws.now.board!!.focus, "보던 자리가 남아야 한다")
        assertEquals(listOf(ws.now.board!!.focusCard.spec), fx.renderer.shown.toList())   // 라이브 한 장뿐 — 나머지는 그림이 있다
    }

    @Test fun `저장은 지금 보는 탭만 그리고 숨은 탭은 낡음 점을 찍는다`() {
        val screen = fx.file
        val card = fx.previewFile("NewsCard")
        show(screen); show(card)
        fx.renderer.shown.clear()

        runBlocking { uc.applySave(listOf(card), "test") }; ws.awaitBoardFilled()
        assertEquals(setOf("NewsCard0", "NewsCard1"), fx.renderer.shown.map { it.functionName }.toSet())
        assertEquals(listOf(true, false), ws.now.tabViews(ws.graph).map { it.stale })

        // 옮기면 다시 읽고 전부 다시 그린다 — 숨은 사이에 프리뷰가 늘었을 수 있다
        screen.appendText("@Preview\nfun Card3() {}\n")
        fx.renderer.shown.clear()
        show(screen)
        assertEquals(4, ws.now.board!!.cards.size)
        assertEquals(setOf("Card0", "Card1", "Card2", "Card3"), fx.renderer.shown.map { it.functionName }.toSet())
        assertEquals(listOf(false, false), ws.now.tabViews(ws.graph).map { it.stale })
    }

    @Test fun `기다림은 지금 보는 탭을 답한다`() {
        val screen = fx.file
        val card = fx.previewFile("NewsCard")
        show(card); show(screen)
        runBlocking { uc.applySave(listOf(card), "test") }
        val r = runBlocking { uc.awaitRender(listOf(card), 2_000) }
        assertTrue(r is WaitResult.BoardDone, "$r")
        assertEquals(screen.canonicalFile, (r as WaitResult.BoardDone).file)
    }

    @Test fun `상한을 넘으면 가장 오래 안 본 탭을 닫는다`() {
        val files = (0 until TabPolicy.LIMIT).map { fx.previewFile("F$it", 1) }
        files.forEach { show(it) }
        show(files[0])                                        // F0을 다시 봤다 — 가장 오래 안 본 것은 F1
        val r = show(fx.previewFile("F10", 1))
        assertEquals(files[1].canonicalPath, r.closedTab)
        assertEquals(TabPolicy.LIMIT, ws.now.tabs.size)
        assertFalse(ws.now.tabs.any { it.key == files[1].canonicalPath })
    }

    @Test fun `지금 탭을 닫으면 직전에 보던 탭으로 가고 마지막 탭을 닫으면 빈 화면이다`() {
        val a = fx.file
        val b = fx.previewFile("B")
        val c = fx.previewFile("C")
        show(a); show(b); show(c); show(a)

        val r = runBlocking { uc.closeTab(a.path, "test") }
        assertEquals(c.canonicalPath, r.active)                               // 직전에 보던 탭
        assertEquals(c.canonicalFile, ws.now.board!!.file)
        runBlocking { uc.closeTab(b.path, "test") }                           // 숨은 탭은 닫아도 화면이 그대로다
        assertEquals(c.canonicalFile, ws.now.board!!.file)
        runBlocking { uc.closeTab(c.path, "test") }
        assertNull(ws.now.board); assertNull(ws.now.current); assertNull(ws.now.activeTab)
    }

    @Test fun `선택은 탭을 옮겨도 남고 그 탭을 닫을 때만 지운다`() {
        val a = fx.file
        val b = fx.previewFile("B")
        show(a)
        runBlocking { uc.select(a.path, 3, Pointed("Text", listOf("Text"), null, "Card0"), "viewer") }
        show(b)
        assertEquals(a.path, ws.now.selection?.file)
        runBlocking { uc.closeTab(b.path, "test") }
        assertEquals(a.path, ws.now.selection?.file)
        runBlocking { uc.closeTab(a.path, "test") }
        assertNull(ws.now.selection)
    }

    @Test fun `탭을 옮기면 인터랙티브가 끝난다`() {
        show(fx.file)
        runBlocking { uc.focusCard(0, on = true, by = "test") }
        show(fx.previewFile("B"))
        assertFalse(ws.now.interactive)
    }

    // 숨은 사이에 끝난 쓰기는 회차가 안 맞아 못 적었다. 되살릴 때 적지 않으면 카드가 영영 "쓰는 중"이라 기다림이 안 끝난다.
    @Test fun `숨은 사이에 끝난 쓰기는 되살릴 때 적는다`() {
        val a = fx.file
        show(a)
        val gate = CountDownLatch(1)
        fx.renderer.writeHold = ws.now.board!!.cards[1].spec.previewId to gate
        val pending = CompletableFuture.supplyAsync { runBlocking { uc.drawCard(1, force = true, by = "held") } }
        assertTrue(fx.renderer.writeEntered.tryAcquire(5, TimeUnit.SECONDS))
        show(fx.previewFile("B"))
        gate.countDown()
        assertEquals("held", (pending.get(5, TimeUnit.SECONDS) as CardResult.Drawn).shot.by)

        show(a)
        assertEquals("held", (ws.now.board!!.cards[1].result as CardResult.Drawn).shot.by)
        assertNull(ws.now.board!!.cards[1].pending)
    }

    // 산출물 보호(keepIds)는 지금 탭만이다 — 숨은 탭의 그림이 상한에 지워졌으면 옮길 때 그 장만 다시 그린다.
    @Test fun `숨은 사이에 지워진 그림만 다시 그린다`() {
        val a = fx.file
        show(a)
        val gone = ws.now.board!!.cards[2]
        show(fx.previewFile("B"))
        assertFalse(gone.spec.previewId in ws.now.keepIds())
        (gone.result as CardResult.Drawn).shot.out.image!!.delete()
        fx.renderer.shown.clear()

        show(a)
        assertEquals(listOf(ws.now.board!!.focusCard.spec, gone.spec), fx.renderer.shown.toList())
    }

    // 감시는 생성을 저장으로 보지 않고(D-56) 시작 전의 변경은 못 본다 — 그대로 열면 새 파일은 빈 그림, 시작 전에 고친 파일은 옛 그림이었다.
    @Test fun `Gradle 산출물보다 새 파일은 그리기 전에 컴파일한다 — 숨은 탭은 낡고 같은 내용은 다시 안 한다`() {
        val screen = fx.file.apply { setLastModified(1_000_000) }
        val card = fx.previewFile("NewsCard").apply { setLastModified(3_000_000) }
        fx.compiler.built = mapOf(":app" to 2_000_000L)
        show(screen)
        assertTrue(fx.compiler.compiled.isEmpty(), "Gradle이 구운 내용은 컴파일하지 않는다")

        show(card)
        assertEquals(listOf(listOf(card.canonicalFile)), fx.compiler.compiled.toList())
        assertEquals(listOf(true, false), ws.now.tabViews(ws.graph).map { it.stale })

        show(screen); show(card)
        assertEquals(1, fx.compiler.compiled.size, "같은 내용은 다시 컴파일하지 않는다")
    }

    // 데모 녹화: 소스를 git으로 되돌리고 시각을 빌드 전으로 돌렸더니 산출물은 다른 내용의 것이라 `MainActivityKt`가 없었다 — 빈 이미지로 끝났다.
    @Test fun `Gradle 산출물이 소스보다 새로워도 프리뷰 클래스가 거기 없으면 그리기 전에 컴파일한다`() {
        val card = fx.previewFile("NewsCard").apply { setLastModified(1_000_000) }
        fx.compiler.built = mapOf(":app" to 2_000_000L)
        fx.compiler.unbuilt = setOf("demo.NewsCardKt")
        show(card)
        assertEquals(listOf(listOf(card.canonicalFile)), fx.compiler.compiled.toList())

        show(fx.file.apply { setLastModified(1_000_000) }); show(card)
        assertEquals(1, fx.compiler.compiled.size, "산출물에 있는 파일 · 이미 읽은 내용은 컴파일하지 않는다")
    }

    @Test fun `감시가 알린 새 파일은 산출물 시각을 몰라도 열 때 컴파일한다`() {
        show(fx.file)
        val card = fx.previewFile("NewsCard")
        ws.noteCreated(listOf(card), emptyList())
        show(card)
        assertEquals(listOf(listOf(card.canonicalFile)), fx.compiler.compiled.toList())
        assertTrue(ws.now.newFiles.isEmpty())
    }

    @Test fun `열기 전 컴파일이 실패하면 기다림이 빈 그림 대신 컴파일 오류로 답한다`() {
        show(fx.file)
        val card = fx.previewFile("NewsCard")
        ws.noteCreated(listOf(card), emptyList())
        fx.compiler.ok = false
        show(card)
        val r = runBlocking { uc.awaitRender(listOf(card), 2_000) }
        assertTrue(r is WaitResult.CompileFailed, "$r")
        assertEquals(setOf(card.canonicalPath), ws.now.newFiles, "남의 탓일 수 있는 실패면 다음 컴파일이 다시 싣는다")

        // 다시 열어 컴파일이 성공하면 그 파일의 실패는 풀렸다 — 저장의 성공이 지우는 것과 같다
        fx.compiler.ok = true
        show(card)
        assertNull(ws.now.lastCompileFailure)
        assertFalse("compile" in ws.now.stale)
    }
    // 빈 탭 — 파일이 프리뷰를 잃거나 지워지면 옛 카드를 두지 않고 빈 화면 · 알림 한 번. 돌아오면 그 저장이 다시 연다.
    @Test fun `지금 탭의 파일이 프리뷰를 잃으면 빈 탭이 되고 되살리면 다시 연다`() {
        val card = fx.previewFile("NewsCard")
        show(card)
        fx.renderer.shown.clear()
        runBlocking {
            ws.events.filterIsInstance<WorkspaceEvent.TabVacated>().test {
                card.writeText("package demo\nfun NewsCard0() {}\n")
                assertEquals(ReloadResult.NothingShown, uc.applySave(listOf(card), "test"))
                assertNull(ws.now.board)
                assertEquals(Vacancy.NO_PREVIEWS, ws.now.tabViews(ws.graph).single().vacant)
                assertTrue(fx.renderer.shown.isEmpty(), "옛 함수로 그리지 않는다")
                awaitItem()
                uc.applySave(listOf(card), "test")                         // 다시 저장해도 알림은 한 번
                expectNoEvents()
            }
        }

        card.writeText("package demo\nimport androidx.compose.ui.tooling.preview.Preview\n@Preview\nfun NewsCard0() {}\n")
        assertTrue(runBlocking { uc.applySave(listOf(card), "test") } is ReloadResult.Rendered)
        ws.awaitBoardFilled()
        assertEquals(1, ws.now.board!!.cards.size)
        assertNull(ws.now.tabViews(ws.graph).single().vacant)
    }

    @Test fun `지금 탭의 파일이 지워지면 빈 탭이고 다시 생기면 다시 연다`() {
        val card = fx.previewFile("NewsCard")
        show(card)
        val text = card.readText()
        card.delete()
        runBlocking { uc.trackTabFiles(emptyList(), listOf(card)) }
        assertNull(ws.now.board)
        assertEquals(Vacancy.DELETED, ws.now.tabViews(ws.graph).single().vacant)
        card.writeText(text)
        runBlocking { uc.trackTabFiles(listOf(card), emptyList()) }
        ws.awaitBoardFilled()
        assertEquals(2, ws.now.board!!.cards.size)
        assertNull(ws.now.tabViews(ws.graph).single().vacant)
    }

    // 숨은 탭의 파일이 지워진 뒤 옮기면 옛 보드를 되살리지 않는다 — 낡았으면 지운 경로가 FQN으로 읽혀 `kt` 탭이 됐다.
    @Test fun `숨은 탭의 파일이 지워진 뒤 옮기면 빈 탭이다`() {
        val screen = fx.file
        val card = fx.previewFile("NewsCard")
        show(screen); show(card)
        runBlocking { uc.applySave(listOf(card), "test") }; ws.awaitBoardFilled()   // 숨은 screen 이 낡는다
        screen.delete()
        val e = runCatching { runBlocking { uc.openPreview(screen.path, null, emptyMap(), "viewer") } }.exceptionOrNull()
        assertTrue(e is VacantTab, "빈 탭은 VacantTab 으로 답한다: $e")
        assertEquals(screen.canonicalPath, ws.now.activeTab)
        assertNull(ws.now.board); assertNull(ws.now.current)
        assertEquals(Vacancy.DELETED, ws.now.tabViews(ws.graph).first { it.active }.vacant)
        assertEquals(listOf(screen.canonicalPath, card.canonicalPath), ws.now.tabs.map { it.key })   // 닫지도 바꿔 끼우지도 않는다
    }

    @Test fun `빈 탭으로 옮겨 가며 닫으면 빈 화면으로 끝난다`() {
        val screen = fx.file
        val card = fx.previewFile("NewsCard")
        show(screen); show(card)
        screen.delete()
        runBlocking { uc.closeTab(card.path, "viewer") }
        assertEquals(screen.canonicalPath, ws.now.activeTab)
        assertEquals(Vacancy.DELETED, ws.now.tabViews(ws.graph).single().vacant)
    }
    // 리뷰 — 되살리면 보던 카드로 · `reload`(파일 없이)도 되살린다 · 빈 탭의 컴파일 실패는 낡음으로 · wait 는 지난 그림으로 답하지 않는다
    @Test fun `빈 탭을 되살리면 보던 카드로 가고 파일 없는 reload 도 되살린다`() {
        val card = fx.previewFile("NewsCard", n = 3)
        show(card, index = 2)
        card.writeText("package demo\nfun NewsCard0() {}\n")
        runBlocking { uc.applySave(listOf(card), "test") }
        assertNull(ws.now.board)
        fx.previewFile("NewsCard", n = 3)                                   // @Preview 를 되살렸다
        assertTrue(runBlocking { uc.applySave(emptyList(), "reload") } is ReloadResult.Rendered)
        ws.awaitBoardFilled()
        assertEquals(2, ws.now.board!!.focus, "보던 카드로 돌아와야 한다")
    }

    @Test fun `빈 탭의 저장이 컴파일에 실패하면 낡음이 남고 wait 가 그것으로 답한다`() {
        val card = fx.previewFile("NewsCard")
        show(card)
        card.writeText("package demo\nfun NewsCard0() {}\n")
        runBlocking { uc.applySave(listOf(card), "test") }
        val vacant = runCatching { runBlocking { uc.awaitRender(listOf(card), 2_000) } }.exceptionOrNull()
        assertTrue(vacant is VacantTab, "빈 탭은 지난 그림이 아니라 그 까닭으로 답한다: $vacant")

        fx.compiler.ok = false
        card.writeText("package demo\nimport androidx.compose.ui.tooling.preview.Preview\n@Preview\nfun NewsCard0() { oops }\n")
        assertEquals(ReloadResult.NothingShown, runBlocking { uc.applySave(listOf(card), "test") })
        assertTrue("compile" in ws.now.stale)
        assertNull(ws.now.board)
        val failed = runCatching { runBlocking { uc.awaitRender(listOf(card), 2_000) } }.exceptionOrNull()
        assertTrue(failed != null && failed !is VacantTab, "컴파일 실패로 답한다: $failed")
    }
}
