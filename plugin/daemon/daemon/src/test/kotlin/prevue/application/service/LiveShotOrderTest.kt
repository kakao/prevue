package prevue.application.service

import java.util.concurrent.CopyOnWriteArrayList
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertSame
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import prevue.application.domain.model.CardResult
import prevue.application.domain.model.FocusResult
import prevue.application.domain.model.ReloadResult
import prevue.application.domain.model.ScreenSize
import prevue.application.domain.model.ShowResult
import prevue.application.domain.model.WorkspaceState
import prevue.application.port.WorkspaceStore
import prevue.daemon.fake.Fixture
import prevue.daemon.fake.TestGraph
import prevue.daemon.fake.awaitBoardFilled
import prevue.infrastructure.store.InMemoryWorkspaceStore

/** 한 장을 그린 뒤 적는 순서 — 보여 주는 프리뷰 → 결과 → 포커스 카드. 뷰어 · status는 쓰기 사이의 상태도 본다. */
class LiveShotOrderTest {
    private val fx = Fixture()

    @AfterEach fun tearDown() = fx.close()

    private class Recording(private val inner: WorkspaceStore = InMemoryWorkspaceStore()) : WorkspaceStore by inner {
        val writes = CopyOnWriteArrayList<WorkspaceState>()
        @Volatile var on = false
        override fun edit(f: (WorkspaceState) -> WorkspaceState): WorkspaceState = inner.edit(f).also { if (on) writes += it }
    }

    private val store = Recording()

    private fun opened(): TestGraph =
        fx.graph(store = store).also { runBlocking { it.tabs.openPreview(fx.file.path, null, emptyMap(), "test") }; it.workspace.awaitBoardFilled() }

    private fun firstShown(uc: TestGraph, block: () -> Unit): WorkspaceState {
        val prior = uc.workspace.now.lastShown
        store.writes.clear()
        store.on = true
        try { block() } finally { store.on = false }
        return store.writes.first { it.lastShown !== prior }
    }

    private fun focusShot(uc: TestGraph) = (uc.workspace.now.board!!.focusCard.result as CardResult.Drawn).shot

    // 채우기가 current를 마지막 카드로 옮겨 둔다 — 저장이 결과를 먼저 적으면 새 그림이 그 카드의 프리뷰와 짝지어 보인다
    @Test fun `저장한 결과가 처음 보이는 순간 current는 이미 그린 포커스 카드다`() {
        val uc = opened()
        val focus = uc.workspace.now.board!!.focusCard.spec
        assertNotEquals(focus.previewId, uc.workspace.now.current?.previewId)

        val first = firstShown(uc) { runBlocking { uc.hotReload.applySave(listOf(fx.file), "test") } }
        assertEquals(focus.previewId, first.current?.previewId)
    }

    @Test fun `다른 카드로 들어간 결과가 처음 보이는 순간 current는 그 카드다`() {
        val uc = opened()
        val card = uc.workspace.now.board!!.cards[1].spec
        assertNotEquals(card.previewId, uc.workspace.now.current?.previewId)

        val first = firstShown(uc) { runBlocking { uc.boards.focus(1, on = true, by = "test") } }
        assertEquals(card.previewId, first.current?.previewId)
        assertSame((first.lastShown as ShowResult).shot, focusShot(uc))
    }

    @Test fun `render --fresh는 current가 포커스 카드일 때만 그 카드에 적는다`() {
        val uc = opened()
        val before = uc.workspace.now.board!!.focusCard.result
        runBlocking { uc.tabs.showPreview("test") }
        assertSame(before, uc.workspace.now.board!!.focusCard.result)

        runBlocking { uc.boards.focus(0, on = true, by = "test") }
        val r = runBlocking { uc.tabs.showPreview("test") }
        assertSame(r.shot, focusShot(uc))
    }

    @Test fun `덮을 것이 없어 다시 그린 포커스 카드도 카드에 적고 스트림 주소는 그대로다`() {
        val uc = opened()
        val size = ScreenSize.Dp(320, 640)
        runBlocking { uc.boards.focus(0, on = true, by = "test", size = size) }
        fx.compiler.ok = false
        assertTrue(runBlocking { uc.hotReload.applySave(listOf(fx.file), "test") } is ReloadResult.CompileFailed)
        fx.compiler.ok = true
        val attached = uc.workspace.now.focusAttachedAt

        val r = runBlocking { uc.boards.focus(0, on = true, by = "test", size = size) } as FocusResult.On
        assertSame(r.result.shot, focusShot(uc))
        assertEquals(attached, uc.workspace.now.focusAttachedAt)
    }
}
