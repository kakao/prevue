package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.Named
import dev.zacsweers.metro.SingleIn
import java.io.File
import java.time.Instant
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import prevue.application.domain.model.Aim
import prevue.application.domain.model.Card
import prevue.application.domain.model.CardResult
import prevue.application.domain.model.LiveFrame
import prevue.application.domain.model.Miss
import prevue.application.domain.model.Pointed
import prevue.application.domain.model.Postures
import prevue.application.domain.model.PreviewSpec
import prevue.application.domain.model.Resize
import prevue.application.domain.model.ScreenSize
import prevue.application.domain.model.ScrollResult
import prevue.application.domain.model.Selection
import prevue.application.domain.model.Settled
import prevue.application.domain.model.SettledShot
import prevue.application.domain.model.Shot
import prevue.application.domain.model.ShowResult
import prevue.application.domain.model.TouchResult
import prevue.application.domain.model.TypeResult
import prevue.application.domain.model.WorkspaceEvent
import prevue.application.domain.model.phrase
import prevue.application.domain.rule.Aiming
import prevue.application.domain.rule.NodeTarget
import prevue.application.domain.rule.ScrollPassed
import prevue.application.domain.rule.ScrollReport
import prevue.application.domain.rule.ScrollUntil
import prevue.application.domain.rule.Scrolling
import prevue.application.port.LiveSession
import prevue.application.port.RenderOutput
import prevue.application.port.SourceFileRepository

@SingleIn(AppScope::class)
@Inject
class Live(
    private val ws: Workspace,
    private val engine: Engine,
    private val live: LiveShot,
    private val sources: SourceFileRepository,
    private val scope: CoroutineScope,
    @Named(QUIET) private val quietMs: Long = QUIET_MS,
) {
    val screen: StateFlow<LiveFrame?> get() = engine.screen
    val frames: StateFlow<LiveLoop.Report> get() = engine.frames
    val watching: StateFlow<Boolean> get() = engine.watching

    suspend fun watch(on: Boolean) = engine.watch(on)

    suspend fun touch(type: String, x: Int, y: Int, by: String, settle: Boolean): TouchResult = ws.exclusive { ed ->
        val t = System.nanoTime()
        live.session(ed, t, by)?.let { return@exclusive TouchResult.Settled(it) }
        press(ed, Press(type, x, y, by, settle, t), aim = null)
    }

    suspend fun touchAt(at: String, type: String, by: String, settle: Boolean): TouchResult = ws.exclusive { ed ->
        val spec = NodeTarget.parse(at) ?: return@exclusive TouchResult.Missed(Miss.BadAt(at))
        val t = System.nanoTime()
        live.session(ed, t, by)?.let { return@exclusive TouchResult.Settled(it) }
        val look = engine.look()
        if (!look.out.ok) return@exclusive TouchResult.Settled(live.finish(ed, look.out, null, t, by))
        when (val target = Aiming.aim(at, spec, look.tree)) {
            is Aiming.Target.Missed -> TouchResult.Missed(target.miss)
            is Aiming.Target.Hit -> press(ed, Press(type, target.aim.x, target.aim.y, by, settle, t), target.aim)
        }
    }

    private class Press(val type: String, val x: Int, val y: Int, val by: String, val settle: Boolean, val t: Long)

    private suspend fun press(ed: WorkspaceEditor, p: Press, aim: Aim?): TouchResult {
        val seq = engine.touch(p.type, p.x, p.y)
        if (!p.settle) return TouchResult.Sent(p.type, p.x, p.y, p.by).also { ws.emit(WorkspaceEvent.Touched(p.type, p.by)) }
        return TouchResult.Settled(live.settled(ed, engine.settled(seq), p.t, p.by), aim)
    }

    suspend fun type(text: String, by: String): TypeResult = ws.exclusive { ed ->
        val t = System.nanoTime()
        live.session(ed, t, by)?.let { return@exclusive TypeResult.Settled(it) }
        val (seq, why) = engine.type(text)
        why?.let { return@exclusive TypeResult.NoField(it) }
        TypeResult.Settled(live.settled(ed, engine.settled(seq), t, by))
    }

    suspend fun wheel(x: Int, y: Int, dx: Float, dy: Float, by: String): Boolean = ws.exclusive { ed ->
        if (live.session(ed, System.nanoTime(), by) != null) return@exclusive false
        engine.wheel(x, y, dx, dy).second.also { if (it) ws.emit(WorkspaceEvent.Touched("wheel", by)) }
    }

    suspend fun scroll(screens: Double?, horizontal: Boolean, at: String?, by: String, until: String? = null): ScrollResult = ws.exclusive { ed ->
        val spec = at?.let { NodeTarget.parse(it) ?: return@exclusive ScrollResult.Missed(Miss.BadAt(it)) }
        val target = until?.takeIf { it.isNotBlank() }?.let(ScrollUntil::parse)
        val t = System.nanoTime()
        live.session(ed, t, by)?.let { return@exclusive ScrollResult.Settled(it, null, moved = false) }
        val before = engine.look(semantics = true)
        if (!before.out.ok) return@exclusive ScrollResult.Settled(live.finish(ed, before.out, null, t, by), null, moved = false)
        val found = when (val p = Scrolling.pick(at, spec, horizontal, before.tree)) {
            is Scrolling.Picked.Missed -> return@exclusive ScrollResult.Missed(p.miss)
            is Scrolling.Picked.Found -> p
        }
        val box = found.container.box
        val amount = Scrolling.screens(screens, until != null)
        val side = ScrollReport.Pane(box, !horizontal, amount > 0, found.frame)
        val seek = target?.let { Scrolling.Seek(it, before.tree, side) }
        val passage = ScrollPassed(before.tree, side)
        if (seek != null && seek.whole(before.tree)) {
            val shot = engine.settledLatest(semantics = true)
            return@exclusive reported(live.settled(ed, shot, t, by), passage, shot.look, found, side.copy(moved = false), seek)
        }
        val seeker = Scrolling.Seeker(passage, seek, near = seek?.near(before.tree) == true)
        val roll = Scrolling.roll(box, amount, horizontal)
        val (seq, rolled) = engine.seek(roll.x, roll.y, roll.dx, roll.dy, roll.pieces, seeker)
        if (!rolled) return@exclusive ScrollResult.Missed(Miss.Broken(at ?: ""))
        val shot = engine.settled(seq, semantics = true)
        val after = shot.look
        reported(live.settled(ed, shot, t, by), passage, after, found, side.copy(moved = Scrolling.moved(before.tree, after.tree, box)), seek)
    }

    private fun reported(
        shot: ShowResult, passage: ScrollPassed, after: LiveSession.Look, found: Scrolling.Picked.Found, pane: ScrollReport.Pane, seek: Scrolling.Seek?,
    ): ScrollResult {
        if (!after.out.ok) return ScrollResult.Settled(shot, found.container, pane.moved, sought = seek != null)
        val ours = { file: String -> sources.candidates(file).isNotEmpty() }
        val report = ScrollReport.of(passage.before, after.tree, pane, ours, passage)
        return ScrollResult.Settled(
            shot, found.container.copy(list = report.list), pane.moved, report.appeared, report.disappeared,
            sought = seek != null, found = seek?.found(after.tree, ours), passed = report.passed,
        )
    }

    suspend fun settle(settled: SettledShot): Unit = ws.exclusive { ed ->
        val current = ws.now.current ?: return@exclusive
        val out = settled.out
        if (out.preview.previewId != current.previewId || !engine.isLatest(settled)) return@exclusive
        val body = Settled(live.shot(out, null, System.nanoTime() - out.renderMs * 1_000_000, "interactive"), ws.now.stale, settled.stats)
        ed.update { it.copy(lastResult = body) }
        if (!ws.now.interactive && out.ok) {
            ed.updateBoard { b ->
                val i = b.cards.indexOfFirst { it.spec.previewId == current.previewId }
                if (i < 0) b else {
                    val shot = (b.cards[i].result as? CardResult.Drawn)?.shot ?: body.shot
                    b.record(i, b.gen, CardResult.Drawn(i, live.restamped(shot)))
                }
            }
        }
    }

    suspend fun renderAt(ms: Long, by: String): ShowResult = ws.exclusive { ed ->
        val p = ws.now.current ?: error("보여 주는 프리뷰가 없다 — 먼저 show")
        val t = System.nanoTime()
        live.rendering(ed, p, by)
        val out = engine.renderAt(p, ms)
        live.finish(ed, out, null, t, by) { if (out.ok) it.copy(atMs = ms) else it }
    }

    suspend fun rerender(by: String): ShowResult = ws.exclusive { ed ->
        val p = ws.now.current ?: error("보여 주는 프리뷰가 없다 — 먼저 show")
        val t = System.nanoTime()
        live.finish(ed, engine.rerender(p), null, t, by).also { ed.update { it.copy(current = p) } }
    }

    suspend fun resize(size: ScreenSize, by: String): ShowResult? = ws.exclusive { ed -> resizeWithin(ed, size, by) }

    suspend fun resizeWithin(ed: WorkspaceEditor, size: ScreenSize, by: String): ShowResult? {
        if (size == ScreenSize.Original && ws.now.resize == null) return null
        val target = resizeTarget()
        val next = size.takeUnless { it == ScreenSize.Original }?.let { Resize(target.previewId, it) }
        if (next == ws.now.resize) return null
        ed.update { it.copy(resize = next) }
        val onBoard = ws.now.board != null
        val r = try {
            live.show(ed, target, by, keepPostures = true)
        } finally {
            if (onBoard) {
                val at = ws.nowMs()
                ed.update { it.copy(focusAttachedAt = at) }
            }
        }
        live.recordFocus(ed, r.shot)
        return r
    }

    private fun resizeTarget(): PreviewSpec {
        val s = ws.now
        val b = s.board ?: error("보여 주는 프리뷰가 없다 — 먼저 show")
        require(s.interactive) { "인터랙티브 카드에서만 크기를 바꾼다 — prevue focus <index> --on" }
        return b.focusCard.spec
    }

    suspend fun select(file: String, line: Int, at: Pointed, by: String): Selection = ws.exclusive { ed ->
        val onLive = (ws.now.interactive || ws.now.board == null) && (at.previewId == null || at.previewId == ws.now.current?.previewId)
        if (onLive) live.catchUp(ed, by)
        val card = if (onLive) null else ws.now.board?.cards?.firstOrNull { it.spec.previewId == at.previewId }
        val (image, tree) = pictureOf(card)
        val sel = Selection(
            ref = "@$file#L$line", file = file, line = line, node = at.node, chain = at.chain, userChain = at.userChain ?: at.chain,
            bounds = at.bounds, preview = card?.spec ?: ws.now.current, image = image?.absolutePath, tree = tree?.absolutePath,
            interactive = ws.now.interactive, by = by, at = Instant.now().toString(),
        )
        ed.update { it.copy(selection = sel, selectionTab = it.activeTab) }
        sel
    }

    private fun pictureOf(card: Card?): Pair<File?, File?> {
        val result = card?.result ?: return ws.now.lastResult?.image to ws.now.lastResult?.tree
        val out = (result as? CardResult.Drawn)?.shot?.out
        return out?.image to out?.tree
    }

    fun startPostures() {
        scope.launch {
            ws.state.map { it.livePostures()?.round }.distinctUntilChanged().collectLatest { round ->
                if (round == null) return@collectLatest
                try { fillPostures(round) } catch (e: Exception) {
                    if (e is CancellationException) throw e
                    System.err.println("[prevue] 자세별 그림을 그리지 못했다: $e")
                }
            }
        }
    }

    private sealed interface PostureStep {
        data object Done : PostureStep
        data object Later : PostureStep
        class Drawn(val d: ScreenSize, val out: RenderOutput, val t: Long) : PostureStep
    }

    private suspend fun fillPostures(round: Long) {
        while (true) {
            val ps = ws.now.livePostures()?.takeIf { it.round == round } ?: return
            val wait = quietMs - quietFor(ps)
            if (wait > 0) { delay(wait); continue }
            when (val s = postureStep(round)) {
                PostureStep.Done -> return
                PostureStep.Later -> delay(quietMs)
                is PostureStep.Drawn -> ws.recordPosture(round, s.d, postureShot(s))
            }
        }
    }

    private suspend fun postureStep(round: Long): PostureStep = ws.exclusive {
        val ps = ws.now.livePostures()?.takeIf { it.round == round } ?: return@exclusive PostureStep.Done
        val (_, shown) = ws.now.shownTarget() ?: return@exclusive PostureStep.Done
        if (ws.reloadPending || quietFor(ps) < quietMs) return@exclusive PostureStep.Later
        val d = ps.next(shown) ?: return@exclusive PostureStep.Done
        val t = System.nanoTime()
        val out = engine.showAside(ps.specOf(d))
        val failed = if (out.ok) "" else " 실패: ${out.message?.text}"
        println("[prevue] 자세 ${d.key} 미리 그림 ${(System.nanoTime() - t) / 1_000_000}ms ${out.width}x${out.height}$failed")
        PostureStep.Drawn(d, out, t)
    }

    private suspend fun postureShot(s: PostureStep.Drawn): Shot = try {
        live.shot(s.out, null, s.t, LiveShot.POSTURE)
    } catch (e: Exception) {
        if (e is CancellationException) throw e
        Shot(s.out.copy(ok = false, message = phrase("render.writeFailed", "why" to e)), null, 0, LiveShot.POSTURE, 0)
    }

    private fun quietFor(ps: Postures): Long = minOf(engine.msSinceInput(), ws.nowMs() - ps.seededAtMs)

    companion object {
        const val QUIET_MS = 1_000L
        const val QUIET = "postureQuietMs"
    }
}
