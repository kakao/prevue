package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import prevue.application.domain.model.ExternalResult
import prevue.application.domain.model.Phrase
import prevue.application.domain.model.PreviewSpec
import prevue.application.domain.model.Verbatim
import prevue.application.domain.model.phrase
import prevue.application.domain.rule.ExternalPolicy
import prevue.application.domain.rule.ExternalPolicy.Plan
import prevue.application.domain.rule.StaleReasons
import prevue.application.port.BuildChange
import prevue.application.port.Compiler
import prevue.application.port.FailureKind

@SingleIn(AppScope::class)
@Inject
class ExternalBuilds(
    private val ws: Workspace,
    private val engine: Engine,
    private val compiler: Compiler,
    private val literals: LiteralPatches,
    private val live: LiveShot,
    private val boards: Boards,
) {
    suspend fun applyBuild(change: BuildChange, done: Boolean): ExternalResult = ws.exclusive { ed ->
        if (change.resources.isNotEmpty()) ed.markStaleOnce(StaleReasons.RESOURCES, StaleReasons.resources(change.resources, ws.now.current?.file))
        if (change.buildFiles.isNotEmpty()) ed.markStaleOnce(StaleReasons.BUILD_FILES, StaleReasons.buildFiles(change.buildFiles))
        if (ws.now.current == null) return@exclusive ExternalResult.NoPreview

        val p = ws.now.let { it.board?.focusCard?.spec ?: it.current }
        val own = change.own.isNotEmpty()
        val rebuilt = ws.graph.builtBy(change.own)
        when (val plan = ExternalPolicy.plan(change, done, p != null, rebuilt)) {
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
        boards.fill("gradle", out.startedAtMs)
        return ExternalResult.Redrawn(out)
    }

    private fun pending(ed: WorkspaceEditor, change: BuildChange, preview: PreviewSpec, message: Phrase): ExternalResult {
        ed.markStale(StaleReasons.BUILD, StaleReasons.classPending(change.built, preview.file, message))
        ed.markHiddenTabsStale()
        return ExternalResult.BuildPending
    }
}
