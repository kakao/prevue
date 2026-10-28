package prevue.daemon.domain

import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeoutOrNull
import prevue.daemon.domain.model.VacantTab
import prevue.daemon.domain.model.WaitResult
import prevue.daemon.domain.policy.AwaitPolicy
import prevue.daemon.domain.policy.StaleReasons
import java.io.File
import prevue.daemon.domain.runtime.Workspace
import prevue.daemon.domain.runtime.WorkspaceState

class AwaitRenderUseCase(private val ws: Workspace) {
    suspend operator fun invoke(files: List<File>, timeoutMs: Long): WaitResult {
        val t0 = ws.nowMs()
        val started = System.nanoTime()
        val want = targets(files)
        val mtimes = want.associate { it.path to it.lastModified() }
        fun waited() = ws.nowMs() - t0
        fun left() = timeoutMs - (System.nanoTime() - started) / 1_000_000
        fun compiled(s: WorkspaceState) = mtimes.all { (p, m) -> AwaitPolicy.compiled(m, s.compiledMtime[p], s.openedAtMs, t0) }

        if (withTimeoutOrNull(left().coerceAtLeast(0)) { ws.state.first { compiled(it) || failed(it, want) } } == null)
            return timedOut(timeoutMs, waited(), "컴파일이 이 저장을 읽지 않았다 — 저장이 감시에 안 잡혔으면 reload 한다", includeBoard = false)
        failedOrVacant(want, waited())?.let { return it }
        val s = withTimeoutOrNull(left().coerceAtLeast(0)) { ws.state.first { answered(it) || failed(it, want) } }
            ?: return timedOut(timeoutMs, waited(), "보드를 다 그리지 못했다")
        failedOrVacant(want, waited())?.let { return it }
        return drawn(s, waited())
    }

    private fun failed(s: WorkspaceState, want: List<File>) = s.lastCompileFailure?.let {
        AwaitPolicy.failureApplies(it.compile.files, want, s.lastCompileFailureAtMs, s.openedAtMs)
    } == true

    private fun answered(s: WorkspaceState) = !s.buildPending && s.board.let { b ->
        b == null || AwaitPolicy.boardAnswered(b.cards.all { it.fresh(b.gen) }, s.interactive)
    }

    private fun timedOut(timeoutMs: Long, waited: Long, why: String, includeBoard: Boolean = true): WaitResult.TimedOut = ws.now.let { s ->
        val message = if (s.buildPending)
            "${timeoutMs}ms 동안 빌드 산출물 갱신을 기다렸다 — 빌드가 끝났는지 확인하고 wait를 다시 호출한다. 계속되면 stale.build의 message · remedy를 확인한다"
        else "${timeoutMs}ms 안에 $why"
        WaitResult.TimedOut(message, waited, s.stale, s.board?.view()?.takeIf { includeBoard || s.buildPending })
    }

    private fun targets(files: List<File>): List<File> {
        val want = files.ifEmpty { ws.now.let { s -> listOfNotNull(s.board?.file ?: s.current?.file ?: s.activeTabOrNull()?.file) } }.map { it.canonicalFile }
        require(want.isNotEmpty()) { "기다릴 파일이 없다 — 파일 경로로 show 한다" }
        want.firstOrNull { !it.isFile }?.let { error("파일이 없다: $it") }
        require(ws.watchRoots.isNotEmpty()) { "파일 감시가 꺼져 있다(--no-watch) — reload 로 다시 그린다" }
        val outside = AwaitPolicy.outside(want, ws.watchRoots)
        require(outside.isEmpty()) {
            "이 데몬이 감시하지 않는 파일이다 — 이 데몬이 그리는 모듈 밖이다(그 파일로 prevue show 하면 그 앱의 데몬을 찾거나 새로 띄운다): " +
                outside.joinToString { it.name }
        }
        return want
    }

    private fun failedOrVacant(want: List<File>, waited: Long): WaitResult? {
        val s = ws.now
        s.lastCompileFailure?.takeIf { AwaitPolicy.failureApplies(it.compile.files, want, s.lastCompileFailureAtMs, s.openedAtMs) }
            ?.let { return WaitResult.CompileFailed(it, waited, s.stale) }
        s.activeTabOrNull()?.takeIf { it.vacant != null && s.board == null && it.file?.canonicalFile in want }?.let { t ->
            s.stale[StaleReasons.COMPILE]?.let { error("${it.what.text} — ${it.message?.text.orEmpty()}") }
            throw VacantTab(t)
        }
        return null
    }

    private fun drawn(s: WorkspaceState, waited: Long): WaitResult {
        val b = s.board ?: return WaitResult.Single(s.lastResult, waited)
        val gen = b.gen
        return WaitResult.BoardDone(b.file, gen, b.cards.all { it.fresh(gen) }, waited, s.stale, b.cards.mapIndexed { i, c -> c.view(i, gen) },
            interactiveCard = b.focus.takeIf { s.interactive })
    }
}
