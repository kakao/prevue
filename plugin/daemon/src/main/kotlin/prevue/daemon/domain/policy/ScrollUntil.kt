package prevue.daemon.domain.policy

import kotlin.math.roundToInt
import prevue.daemon.entity.LazyList
import prevue.daemon.entity.ListItem
import prevue.daemon.entity.ListState
import prevue.daemon.entity.LiveTree
import prevue.daemon.entity.SemanticNode
import prevue.daemon.entity.Semantics
import prevue.daemon.domain.model.SeenItem

object ScrollUntil {
    sealed interface Target {
        data class Line(val spec: NodeTarget.Spec) : Target
        data class Text(val text: String) : Target
    }

    enum class Sight { NONE, NEAR, WHOLE }

    fun parse(arg: String): Target? = when {
        arg.isBlank() -> null
        else -> NodeTarget.parse(arg)?.let { Target.Line(it) } ?: Target.Text(arg)
    }

    fun says(s: Semantics?, text: String): Boolean = s != null && listOfNotNull(s.text, s.contentDescription).any { text in it }

    fun whole(shown: Double, size: Int, viewport: Int): Boolean = size > 0 && shown >= minOf(1.0, viewport.toDouble() / size) - SLACK

    interface Probe {
        fun lists(): List<ListState>
        fun semantics(): List<SemanticNode>
        suspend fun look(): LiveTree
    }

    class Still(private val tree: LiveTree) : Probe {
        override fun lists() = tree.states
        override fun semantics() = tree.semantics
        override suspend fun look() = tree
    }

    sealed interface Watch {
        val span: Int
        suspend fun sight(p: Probe): Sight
        fun found(after: LiveTree, ours: (String) -> Boolean = { true }): SeenItem?
    }

    fun watch(target: Target, before: LiveTree, pane: ScrollReport.Pane): Watch {
        val list = ScrollReport.pickList(before, before, pane.copy(moved = false))
        val origin = list?.let { ScrollReport.origin(it, pane.frame) }
        if (list == null || origin == null) return whole(target, pane)
        return when (target) {
            is Target.Text -> InList(list, origin, pane, Want.Text(target.text))
            is Target.Line -> {
                val nth = target.spec.nth
                val home = NodeTarget.number(NodeTarget.candidates(before.nodes, target.spec), before.lists).list
                if (nth != null && home != null && same(home, list, origin)) InList(list, origin, pane, Want.Index(nth - 1, target.spec))
                else ByLook(target.spec, pane)
            }
        }
    }

    fun whole(target: Target, pane: ScrollReport.Pane): Watch = when (target) {
        is Target.Text -> BySemantics(target.text, pane)
        is Target.Line -> ByLook(target.spec, pane)
    }

    private fun same(home: LazyList, list: ListState, origin: Pair<Int, Int>): Boolean {
        val (x, y) = origin
        val (l, t) = if (list.vertical) x to y + list.start else x + list.start to y
        return home.vertical == list.vertical && home.total == list.total && home.left == l && home.top == t
    }

    private fun sight(near: Boolean, whole: Boolean) = when {
        whole -> Sight.WHOLE
        near -> Sight.NEAR
        else -> Sight.NONE
    }

    private sealed interface Want {
        data class Index(val index: Int, val spec: NodeTarget.Spec) : Want
        data class Text(val text: String) : Want
    }

    private class InList(list: ListState, val origin: Pair<Int, Int>, val pane: ScrollReport.Pane, val want: Want) : Watch {
        private val id = list.id
        private val settled = HashMap<Any, Boolean>()
        override val span = minOf(if (list.vertical) list.height else list.width, main(pane.box, pane.vertical))

        override suspend fun sight(p: Probe): Sight {
            val s = p.lists().firstOrNull { it.id == id } ?: return Sight.NONE
            val seen = s.items.filter { shown(s, origin, it) > 0 }
            val hits = when (want) {
                is Want.Index -> seen.filter { it.index == want.index }
                is Want.Text -> {
                    val open = seen.filter { ScrollReport.identity(it) !in settled }
                    val nodes = if (open.isEmpty()) emptyList() else p.semantics()
                    seen.filter { item ->
                        val id = ScrollReport.identity(item)
                        settled[id] ?: says(ScrollReport.within(nodes, ScrollReport.screen(origin, item)), want.text).also { hit ->
                            if (hit || full(s, origin, item)) settled[id] = hit
                        }
                    }
                }
            }
            return sight(hits.isNotEmpty(), hits.any { full(s, origin, it) })
        }

        override fun found(after: LiveTree, ours: (String) -> Boolean): SeenItem? {
            val s = after.states.firstOrNull { it.id == id } ?: return null
            val o = ScrollReport.origin(s, pane.frame) ?: origin
            val match = s.items.filter { shown(s, o, it) > 0 }.filter { item ->
                when (want) {
                    is Want.Index -> item.index == want.index
                    is Want.Text -> says(ScrollReport.within(after.semantics, ScrollReport.screen(o, item)), want.text)
                }
            }
            val ordered = if (pane.forward) match.sortedBy { it.index } else match.sortedByDescending { it.index }
            val pick = ordered.firstOrNull { full(s, o, it) } ?: ordered.firstOrNull() ?: return null
            val box = ScrollReport.screen(o, pick)
            val at = when (want) {
                is Want.Index -> want.spec.toString()
                is Want.Text -> ScrollReport.at(after, box, ours)
            }
            return SeenItem(pick.index, pick.key, box, round(shown(s, o, pick)), at, ScrollReport.within(after.semantics, box))
        }

        private fun shown(s: ListState, o: Pair<Int, Int>, item: ListItem) =
            minOf(ScrollReport.visible(s, item), ScrollReport.inPane(ScrollReport.screen(o, item), pane.box, s.vertical))

        private fun full(s: ListState, o: Pair<Int, Int>, item: ListItem): Boolean {
            val size = if (s.vertical) item.h else item.w
            val viewport = minOf(if (s.vertical) s.height else s.width, main(pane.box, s.vertical))
            return whole(shown(s, o, item), size, viewport)
        }
    }

    private class BySemantics(val text: String, val pane: ScrollReport.Pane) : Watch {
        override val span = main(pane.box, pane.vertical)

        override suspend fun sight(p: Probe): Sight {
            val hits = hits(p.semantics())
            return sight(hits.isNotEmpty(), hits.any(::full))
        }

        override fun found(after: LiveTree, ours: (String) -> Boolean): SeenItem? {
            val ordered = ordered(hits(after.semantics), pane) { listOf(it.left, it.top, it.right, it.bottom) }
            val pick = ordered.firstOrNull(::full) ?: ordered.firstOrNull() ?: return null
            val box = listOf(pick.left, pick.top, pick.right, pick.bottom)
            return SeenItem(null, null, box, round(shown(pick)), ScrollReport.at(after, box, ours), pick.semantics)
        }

        private fun hits(nodes: List<SemanticNode>) = nodes.filter { n ->
            says(n.semantics, text) && shown(n) > 0 &&
                !(n.left <= pane.box[0] && n.top <= pane.box[1] && n.right >= pane.box[2] && n.bottom >= pane.box[3])
        }

        private fun size(n: SemanticNode) = if (pane.vertical) n.fullHeight else n.fullWidth

        private fun shown(n: SemanticNode): Double {
            val box = listOf(n.left, n.top, n.right, n.bottom)
            val clipped = ScrollReport.inPane(box, pane.box, pane.vertical) * main(box, pane.vertical)
            return if (size(n) <= 0) 0.0 else minOf(1.0, clipped / size(n))
        }

        private fun full(n: SemanticNode) = whole(shown(n), size(n), main(pane.box, pane.vertical))
    }

    private class ByLook(val spec: NodeTarget.Spec, val pane: ScrollReport.Pane) : Watch {
        override val span = main(pane.box, pane.vertical)

        override suspend fun sight(p: Probe): Sight {
            val tree = p.look()
            val seen = pool(tree)
            return sight(seen.isNotEmpty(), seen.any { NodeTarget.shown(it.node, tree) })
        }

        override fun found(after: LiveTree, ours: (String) -> Boolean): SeenItem? {
            val all = pool(after)
            val ordered = ordered(all.map { it.node }, pane) { it.sameBox }
            val node = ordered.firstOrNull { NodeTarget.shown(it, after) } ?: ordered.firstOrNull() ?: return null
            val n = all.first { it.node === node }
            val inList = NodeTarget.number(NodeTarget.candidates(after.nodes, spec), after.lists).list != null
            val seen = NodeTarget.visibleBox(node, after)
            val shown = main(seen, pane.vertical).coerceAtLeast(0).toDouble() / main(node.sameBox, pane.vertical).coerceAtLeast(1)
            return SeenItem(
                if (inList) n.n - 1 else null, null, node.sameBox, round(minOf(1.0, shown)),
                ScrollReport.touchAt(after, node.sameBox, spec), ScrollReport.within(after.semantics, node.sameBox),
            )
        }

        private fun pool(tree: LiveTree) =
            NodeTarget.number(NodeTarget.candidates(tree.nodes, spec), tree.lists).all
                .filter { (spec.nth == null || it.n == spec.nth) && NodeTarget.visible(it.node, tree) }
    }

    private fun <T> ordered(all: List<T>, pane: ScrollReport.Pane, box: (T) -> List<Int>): List<T> {
        val by = compareBy<T>({ if (pane.vertical) box(it)[1] else box(it)[0] }, { if (pane.vertical) box(it)[0] else box(it)[1] })
        return all.sortedWith(if (pane.forward) by else by.reversed())
    }

    private fun main(box: List<Int>, vertical: Boolean) = if (vertical) box[3] - box[1] else box[2] - box[0]

    private fun round(v: Double) = (v * 100).roundToInt() / 100.0

    private const val SLACK = 0.01
}
