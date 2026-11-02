package prevue.daemon.domain

import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.roundToInt
import prevue.daemon.entity.LiveTree
import prevue.daemon.entity.ViewNode
import prevue.daemon.domain.port.LiveSession
import prevue.daemon.domain.port.SourceFileRepository
import prevue.daemon.domain.model.Container
import prevue.daemon.domain.model.Miss
import prevue.daemon.domain.model.ScrollResult
import prevue.daemon.domain.model.ShowResult
import prevue.daemon.domain.model.WorkspaceEvent
import prevue.daemon.domain.policy.NodeTarget
import prevue.daemon.domain.policy.ScrollPassed
import prevue.daemon.domain.policy.ScrollReport
import prevue.daemon.domain.policy.ScrollUntil
import prevue.daemon.domain.runtime.EngineActor
import prevue.daemon.domain.runtime.LiveLoop
import prevue.daemon.domain.runtime.LiveShot
import prevue.daemon.domain.runtime.Workspace

class ScrollUseCase(
    private val ws: Workspace,
    private val engine: EngineActor,
    private val live: LiveShot,
    private val sources: SourceFileRepository,
) {
    suspend operator fun invoke(x: Int, y: Int, dx: Float, dy: Float, by: String): Boolean = ws.exclusive { ed ->
        if (live.session(ed, System.nanoTime(), by) != null) return@exclusive false
        engine.wheel(x, y, dx, dy).second.also { if (it) ws.emit(WorkspaceEvent.Touched("wheel", by)) }
    }

    suspend fun screens(amount: Double, horizontal: Boolean, at: String?, by: String, until: String? = null): ScrollResult = ws.exclusive { ed ->
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

    companion object {
        const val PAGE = 0.8
        const val WHEEL = 200
        const val MAX_SCREENS = 10.0
    }
}
