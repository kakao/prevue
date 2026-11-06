package prevue.application.domain.rule

import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.roundToInt
import prevue.application.domain.model.Container
import prevue.application.domain.model.LiveTree
import prevue.application.domain.model.Miss
import prevue.application.domain.model.SeenItem
import prevue.application.domain.model.ViewNode
import prevue.application.port.LiveSession
import prevue.application.port.ScrollRider

object Scrolling {
    const val PAGE = 0.8
    const val WHEEL = 200
    const val MAX_SCREENS = 10.0

    fun screens(asked: Double?, seeking: Boolean): Double = asked ?: if (seeking) MAX_SCREENS else 1.0

    sealed interface Target {
        data class Found(val container: Container, val frame: List<Int> = container.box) : Target
        data class Missed(val miss: Miss) : Target
    }

    fun target(at: String?, spec: NodeTarget.Spec?, horizontal: Boolean, tree: LiveTree): Target {
        val axis = if (horizontal) "horizontal" else "vertical"
        if (at == null || spec == null) return Target.Found(Container(null, listOf(0, 0, tree.width, tree.height), axis))
        val all = NodeTarget.candidates(tree.nodes, spec)
        val seen = all.filter { NodeTarget.visible(it, tree) }
        return when (val pick = NodeTarget.pick(seen, spec.nth)) {
            is NodeTarget.Pick.Hit -> Target.Found(Container(spec.toString(), NodeTarget.visibleBox(pick.node, tree), axis), pick.node.sameBox)
            is NodeTarget.Pick.Choose -> Target.Missed(Miss.Choose(at, pick.numbered))
            is NodeTarget.Pick.NoSuch -> Target.Missed(Miss.NoSuch(at, pick.nth, pick.numbered))
            is NodeTarget.Pick.Away, NodeTarget.Pick.Missing ->
                Target.Missed(if (all.isEmpty()) Miss.Missing(at) else Miss.OffScreen(at, NodeTarget.inReadingOrder(all)))
        }
    }

    data class Roll(val x: Int, val y: Int, val dx: Float, val dy: Float, val pieces: Int)

    fun roll(box: List<Int>, amount: Double, horizontal: Boolean): Roll {
        val (l, top, r, b) = box
        val d = (amount.coerceIn(-MAX_SCREENS, MAX_SCREENS) * (if (horizontal) r - l else b - top) * PAGE).roundToInt()
        val (dx, dy) = if (horizontal) d.toFloat() to 0f else 0f to d.toFloat()
        return Roll((l + r) / 2, (top + b) / 2, dx, dy, piecesOf(abs(d).toDouble()))
    }

    fun piecesOf(px: Double): Int = maxOf(1, ceil(px / WHEEL).toInt())

    fun moved(before: LiveTree, after: LiveTree, box: List<Int>): Boolean = signature(before, box) != signature(after, box)

    private fun signature(tree: LiveTree, box: List<Int>): Int {
        val (l, top, r, b) = box
        return tree.nodes.filter { it.right > l && it.left < r && it.bottom > top && it.top < b }.map(ViewNode::sameBox).hashCode()
    }

    class Seek(target: ScrollUntil.Target, before: LiveTree, pane: ScrollReport.Pane) {
        internal val watch = ScrollUntil.watch(target, before, pane)
        private val whole = ScrollUntil.whole(target, pane)

        suspend fun whole(tree: LiveTree): Boolean = whole.sight(ScrollUntil.Still(tree)) == ScrollUntil.Sight.WHOLE
        suspend fun near(tree: LiveTree): Boolean = watch.sight(ScrollUntil.Still(tree)) == ScrollUntil.Sight.NEAR
        fun found(after: LiveTree, ours: (String) -> Boolean): SeenItem? = watch.found(after, ours) ?: whole.found(after, ours)
    }

    class Seeker(private val passage: ScrollPassed, seek: Seek?, private var near: Boolean) : ScrollRider {
        private val watch = seek?.watch
        private val screen = watch?.let { piecesOf(it.span * PAGE) } ?: 1
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

    private class Probe(private val s: LiveSession) : ScrollUntil.Probe {
        private val lists by lazy { s.lists() }
        private val semantics by lazy { s.semantics() }
        override fun lists() = lists
        override fun semantics() = semantics
        override suspend fun look() = s.look().tree
    }
}
