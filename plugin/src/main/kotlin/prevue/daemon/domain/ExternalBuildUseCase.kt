package prevue.daemon.domain

import prevue.daemon.entity.Phrase
import prevue.daemon.entity.Verbatim
import prevue.daemon.entity.phrase
import prevue.daemon.domain.port.BuildChange
import prevue.daemon.domain.model.ExternalResult
import prevue.daemon.domain.policy.ExternalPolicy
import prevue.daemon.domain.policy.ExternalPolicy.Plan
import prevue.daemon.domain.policy.StaleReasons
import prevue.daemon.domain.port.Compiler
import prevue.daemon.domain.port.FailureKind
import prevue.daemon.domain.runtime.WorkspaceEditor
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.domain.runtime.EngineActor
import prevue.daemon.domain.runtime.LiteralPatches
import prevue.daemon.domain.runtime.LiveShot
import prevue.daemon.domain.runtime.Workspace

/**
 * 소스 밖의 변화가 그림을 낡게 했다. 닫을 수 있는 것(밖에서 돈 Gradle의 산출물)은 스스로 닫고, 못 닫는 것(리소스 · 빌드 파일)은
 * 낡음으로 세워 사람에게 할 일을 말한다 — 판정은 [ExternalPolicy]가 한다.
 */
class ExternalBuildUseCase(
    private val ws: Workspace,
    private val engine: EngineActor,
    private val compiler: Compiler,
    private val literals: LiteralPatches,
    private val live: LiveShot,
    private val fillBoard: FillBoardUseCase,
) {
    suspend operator fun invoke(change: BuildChange, done: Boolean): ExternalResult = ws.exclusive { ed ->
        if (change.resources.isNotEmpty()) ed.markStaleOnce(StaleReasons.RESOURCES, StaleReasons.resources(change.resources, ws.now.current?.file))
        if (change.buildFiles.isNotEmpty()) ed.markStaleOnce(StaleReasons.BUILD_FILES, StaleReasons.buildFiles(change.buildFiles))
        if (ws.now.current == null) return@exclusive ExternalResult.NoPreview

        val p = ws.now.let { it.board?.focusCard?.spec ?: it.current }
        val own = change.own.isNotEmpty()
        val rebuilt = ws.graph.builtBy(change.own)
        when (val plan = ExternalPolicy.plan(change, done, p != null, change.built.any { it.exists() }, rebuilt)) {
            Plan.Noted -> ExternalResult.Noted(ws.now.stale)
            Plan.NoPreview -> ExternalResult.NoPreview
            Plan.OutputsGone -> { ed.markStale(StaleReasons.BUILD, StaleReasons.outputsGone(change.built)); ExternalResult.OutputsGone }
            Plan.BuildPending -> { ed.markStale(StaleReasons.BUILD, StaleReasons.buildPending(change.built, own)); ExternalResult.BuildPending }
            is Plan.Redraw -> redraw(ed, change, p!!, plan.clear)
        }
    }

    private suspend fun redraw(ed: WorkspaceEditor, change: BuildChange, preview: PreviewSpec, clear: List<String>): ExternalResult {
        clear.forEach { compiler.clearOverlay(it) }
        literals.externalBuild(clear)
        engine.buildChanged()
        val owner = preview.file?.let(ws.graph::ownerOf) ?: ws.graph.home
        val className = preview.fqn.substringBeforeLast('.')
        if (!compiler.hasClass(owner, className))
            return pending(ed, change, preview, phrase("stale.classMissing", "class" to className))
        val r = live.show(ed, preview, "gradle", deferMissing = true)
        if (r.shot.out.failure == FailureKind.NOT_FOUND)
            return pending(ed, change, preview, r.shot.out.message ?: Verbatim(""))
        ed.markStale(StaleReasons.BUILD, if (r.ok) null else StaleReasons.redrawFailed(change.built, change.own.isNotEmpty()))
        if (r.ok) ed.markStale(StaleReasons.EXPECT_ACTUAL, null)
        val out = r.copy(stale = ws.now.stale)
        ed.update { s -> s.copy(lastResult = out, board = s.board?.advance()) }
        ed.markHiddenTabsStale()
        live.recordFocus(ed, out.shot)
        fillBoard("gradle", out.startedAtMs)
        return ExternalResult.Redrawn(out)
    }

    private fun pending(ed: WorkspaceEditor, change: BuildChange, preview: PreviewSpec, message: Phrase): ExternalResult {
        ed.markStale(StaleReasons.BUILD, StaleReasons.classPending(change.built, preview.file, message))
        ed.markHiddenTabsStale()
        return ExternalResult.BuildPending
    }
}
