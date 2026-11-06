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

object Scrolling {
    const val PAGE = 0.8
    const val WHEEL = 200
    const val MAX_SCREENS = 10.0

    fun screens(asked: Double?, seeking: Boolean): Double = asked ?: if (seeking) MAX_SCREENS else 1.0

    interface Rider {
        fun frame(s: LiveSession)
        suspend fun stop(s: LiveSession, catchUp: suspend () -> Unit): Boolean
    }

    sealed interface Picked {
        data class Found(val container: Container, val frame: List<Int> = container.box) : Picked
        data class Missed(val miss: Miss) : Picked
    }

    fun pick(at: String?, spec: NodeTarget.Spec?, horizontal: Boolean, tree: LiveTree): Picked {
        val axis = if (horizontal) "horizontal" else "vertical"
        if (at == null || spec == null) return Picked.Found(Container(null, listOf(0, 0, tree.width, tree.height), axis))
        val all = NodeTarget.candidates(tree.nodes, spec)
        val seen = all.filter { NodeTarget.visible(it, tree) }
        return when (val pick = NodeTarget.pick(seen, spec.nth)) {
            is NodeTarget.Pick.Hit -> Picked.Found(Container(spec.toString(), NodeTarget.visibleBox(pick.node, tree), axis), pick.node.sameBox)
            is NodeTarget.Pick.Choose -> Picked.Missed(Miss.Choose(at, pick.numbered))
            is NodeTarget.Pick.NoSuch -> Picked.Missed(Miss.NoSuch(at, pick.nth, pick.numbered))
            is NodeTarget.Pick.Away, NodeTarget.Pick.Missing ->
                Picked.Missed(if (all.isEmpty()) Miss.Missing(at) else Miss.OffScreen(at, NodeTarget.inReadingOrder(all)))
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

    fun moved(before: LiveTree, after: LiveTree, box: List<Int>): Boolean = boxesIn(before, box) != boxesIn(after, box)

    private fun boxesIn(tree: LiveTree, box: List<Int>): List<List<Int>> {
        val (l, top, r, b) = box
        return tree.nodes.filter { it.right > l && it.left < r && it.bottom > top && it.top < b }.map(ViewNode::sameBox)
    }

    class Seek(target: ScrollUntil.Target, before: LiveTree, pane: ScrollReport.Pane) {
        private val watch = ScrollUntil.watch(target, before, pane)
        private val full = ScrollUntil.whole(target, pane)
        val screen: Int = piecesOf(watch.span * PAGE)

        suspend fun sight(p: ScrollUntil.Probe): ScrollUntil.Sight = watch.sight(p)
        suspend fun whole(tree: LiveTree): Boolean = full.sight(ScrollUntil.Still(tree)) == ScrollUntil.Sight.WHOLE
        suspend fun near(tree: LiveTree): Boolean = sight(ScrollUntil.Still(tree)) == ScrollUntil.Sight.NEAR
        fun found(after: LiveTree, ours: (String) -> Boolean): SeenItem? = watch.found(after, ours) ?: full.found(after, ours)
    }

    class Seeker(private val passage: ScrollPassed, private val seek: Seek?, private var near: Boolean) : Rider {
        private var piece = 0

        override fun frame(s: LiveSession) = passage.sample(Probe(s))

        override suspend fun stop(s: LiveSession, catchUp: suspend () -> Unit): Boolean {
            val seek = seek ?: return false
            piece++
            if (!near && piece % seek.screen != 0) return false
            catchUp()
            return when (seek.sight(Probe(s))) {
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
