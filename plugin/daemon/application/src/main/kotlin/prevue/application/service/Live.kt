package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import java.io.File
import java.time.Instant
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.roundToInt
import kotlinx.coroutines.flow.StateFlow
import prevue.application.domain.model.Aim
import prevue.application.domain.model.Card
import prevue.application.domain.model.CardResult
import prevue.application.domain.model.Container
import prevue.application.domain.model.LiveFrame
import prevue.application.domain.model.LiveTree
import prevue.application.domain.model.Miss
import prevue.application.domain.model.Pointed
import prevue.application.domain.model.PreviewSpec
import prevue.application.domain.model.Resize
import prevue.application.domain.model.ScreenSize
import prevue.application.domain.model.ScrollResult
import prevue.application.domain.model.Selection
import prevue.application.domain.model.Settled
import prevue.application.domain.model.SettledShot
import prevue.application.domain.model.ShowResult
import prevue.application.domain.model.TouchResult
import prevue.application.domain.model.TypeResult
import prevue.application.domain.model.ViewNode
import prevue.application.domain.model.WorkspaceEvent
import prevue.application.domain.rule.Aiming
import prevue.application.domain.rule.NodeTarget
import prevue.application.domain.rule.ScrollPassed
import prevue.application.domain.rule.ScrollReport
import prevue.application.domain.rule.ScrollUntil
import prevue.application.port.LiveSession
import prevue.application.port.SourceFileRepository
import prevue.application.port.Workspace
import prevue.application.port.WorkspaceEditor

@SingleIn(AppScope::class)
@Inject
class Live(
    private val ws: Workspace,
    private val engine: Engine,
    private val live: LiveShot,
    private val sources: SourceFileRepository,
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

    suspend fun scroll(amount: Double, horizontal: Boolean, at: String?, by: String, until: String? = null): ScrollResult = ws.exclusive { ed ->
        val spec = at?.let { NodeTarget.parse(it) ?: return@exclusive ScrollResult.Missed(Miss.BadAt(it)) }
        val target = until?.takeIf { it.isNotBlank() }?.let(ScrollUntil::parse)
        val t = System.nanoTime()
        live.session(ed, t, by)?.let { return@exclusive ScrollResult.Settled(it, null, moved = false) }
        val before = engine.look(semantics = true)
        if (!before.out.ok) return@exclusive ScrollResult.Settled(live.finish(ed, before.out, null, t, by), null, moved = false)
        val found = when (val p = pane(at, spec, horizontal, before.tree)) {
            is Pane.Missed -> return@exclusive ScrollResult.Missed(p.miss)
            is Pane.Found -> p
        }
        val pane = found.container
        val side = ScrollReport.Pane(pane.box, !horizontal, amount > 0, found.frame)
        val seek = target?.let { Seek(ScrollUntil.watch(it, before.tree, side), ScrollUntil.whole(it, side)) }
        val passage = ScrollPassed(before.tree, side)
        if (seek != null && seek.whole.sight(ScrollUntil.Still(before.tree)) == ScrollUntil.Sight.WHOLE) {
            val shot = engine.settledLatest(semantics = true)
            return@exclusive reported(live.settled(ed, shot, t, by), passage, shot.look, found, side.copy(moved = false), seek)
        }
        val near = seek?.watch?.sight(ScrollUntil.Still(before.tree)) == ScrollUntil.Sight.NEAR
        val seeker = Seeker(passage, seek?.watch, seek?.let { piecesOf(it.watch.span * PAGE) } ?: 1, near)
        val (seq, rolled) = roll(pane, amount.coerceIn(-MAX_SCREENS, MAX_SCREENS), horizontal, seeker)
        if (!rolled) return@exclusive ScrollResult.Missed(Miss.Broken(at ?: ""))
        val shot = engine.settled(seq, semantics = true)
        val after = shot.look
        val moved = signature(before.tree, pane) != signature(after.tree, pane)
        reported(live.settled(ed, shot, t, by), passage, after, found, side.copy(moved = moved), seek)
    }

    private class Seek(val watch: ScrollUntil.Watch, val whole: ScrollUntil.Watch) {
        fun found(after: LiveTree, ours: (String) -> Boolean) = watch.found(after, ours) ?: whole.found(after, ours)
    }

    private class Probe(private val s: LiveSession) : ScrollUntil.Probe {
        private val lists by lazy { s.lists() }
        private val semantics by lazy { s.semantics() }
        override fun lists() = lists
        override fun semantics() = semantics
        override suspend fun look() = s.look().tree
    }

    private class Seeker(
        private val passage: ScrollPassed, private val watch: ScrollUntil.Watch?, private val screen: Int, private var near: Boolean,
    ) : LiveLoop.Rider {
        private var piece = 0

        override fun frame(s: LiveSession) = passage.sample(Probe(s))

        override suspend fun stop(s: LiveSession, catchUp: suspend () -> Unit): Boolean {
            val watch = watch ?: return false
            piece++
            if (!near && piece % screen != 0) return false
            catchUp()
            return when (watch.sight(Probe(s))) {
                ScrollUntil.Sight.WHOLE -> true
                ScrollUntil.Sight.NEAR -> false.also { near = true }
                ScrollUntil.Sight.NONE -> false
            }
        }
    }

    private fun reported(
        shot: ShowResult, passage: ScrollPassed, after: LiveSession.Look, found: Pane.Found, pane: ScrollReport.Pane, seek: Seek?,
    ): ScrollResult {
        if (!after.out.ok) return ScrollResult.Settled(shot, found.container, pane.moved, sought = seek != null)
        val ours = { file: String -> sources.candidates(file).isNotEmpty() }
        val report = ScrollReport.of(passage.before, after.tree, pane, ours, passage)
        return ScrollResult.Settled(
            shot, found.container.copy(list = report.list), pane.moved, report.appeared, report.disappeared,
            sought = seek != null, found = seek?.found(after.tree, ours), passed = report.passed,
        )
    }

    private sealed interface Pane {
        data class Found(val container: Container, val frame: List<Int> = container.box) : Pane
        data class Missed(val miss: Miss) : Pane
    }

    private fun pane(at: String?, spec: NodeTarget.Spec?, horizontal: Boolean, tree: LiveTree): Pane {
        val axis = if (horizontal) "horizontal" else "vertical"
        if (at == null || spec == null) return Pane.Found(Container(null, listOf(0, 0, tree.width, tree.height), axis))
        val all = NodeTarget.candidates(tree.nodes, spec)
        val seen = all.filter { NodeTarget.visible(it, tree) }
        return when (val pick = NodeTarget.pick(seen, spec.nth)) {
            is NodeTarget.Pick.Hit -> Pane.Found(Container(spec.toString(), NodeTarget.visibleBox(pick.node, tree), axis), pick.node.sameBox)
            is NodeTarget.Pick.Choose -> Pane.Missed(Miss.Choose(at, pick.numbered))
            is NodeTarget.Pick.NoSuch -> Pane.Missed(Miss.NoSuch(at, pick.nth, pick.numbered))
            is NodeTarget.Pick.Away, NodeTarget.Pick.Missing ->
                Pane.Missed(if (all.isEmpty()) Miss.Missing(at) else Miss.OffScreen(at, NodeTarget.inReadingOrder(all)))
        }
    }

    private suspend fun roll(
        pane: Container, amount: Double, horizontal: Boolean, rider: LiveLoop.Rider,
    ): Pair<Long, Boolean> {
        val (l, top, r, b) = pane.box
        val d = (amount * (if (horizontal) r - l else b - top) * PAGE).roundToInt()
        val n = piecesOf(abs(d).toDouble())
        val (dx, dy) = if (horizontal) d.toFloat() to 0f else 0f to d.toFloat()
        return engine.seek((l + r) / 2, (top + b) / 2, dx, dy, n, rider)
    }

    private fun piecesOf(px: Double) = maxOf(1, ceil(px / WHEEL).toInt())

    private fun signature(tree: LiveTree, pane: Container): Int {
        val (l, top, r, b) = pane.box
        return tree.nodes.filter { it.right > l && it.left < r && it.bottom > top && it.top < b }.map(ViewNode::sameBox).hashCode()
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

    suspend fun resize(size: ScreenSize, by: String): ShowResult? = ws.exclusive { ed -> resize(ed, size, by) }

    suspend fun resize(ed: WorkspaceEditor, size: ScreenSize, by: String): ShowResult? {
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
        val b = s.board
        if (b != null) {
            require(s.interactive) { "인터랙티브 카드에서만 크기를 바꾼다 — prevue focus <index> --on" }
            return b.focusCard.spec
        }
        return s.activeTabOrNull()?.spec ?: error("보여 주는 프리뷰가 없다 — 먼저 show")
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

    companion object {
        const val PAGE = 0.8
        const val WHEEL = 200
        const val MAX_SCREENS = 10.0
    }
}
