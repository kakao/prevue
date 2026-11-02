package prevue.daemon.domain.policy

import kotlin.math.roundToInt
import prevue.daemon.entity.ListItem
import prevue.daemon.entity.ListState
import prevue.daemon.entity.LiveTree
import prevue.daemon.entity.SemanticNode
import prevue.daemon.entity.Semantics
import prevue.daemon.domain.model.GoneItem
import prevue.daemon.domain.model.ListSummary
import prevue.daemon.domain.model.SeenItem

object ScrollReport {
    data class Report(val list: ListSummary?, val appeared: List<SeenItem>, val disappeared: List<GoneItem>, val passed: List<GoneItem> = emptyList())

    data class Pane(val box: List<Int>, val vertical: Boolean, val forward: Boolean, val frame: List<Int> = box, val moved: Boolean = true)

    fun of(before: LiveTree, after: LiveTree, pane: Pane, ours: (String) -> Boolean = { true }, passage: ScrollPassed? = null): Report {
        val now = pickList(before, after, pane) ?: return bySemantics(before, after, pane, ours, passage)
        val was = before.states.firstOrNull { it.id == now.id }
        val nowOrigin = origin(now, pane.frame)
        val wasOrigin = was?.let { origin(it, pane.frame) }
        fun shown(s: ListState, o: Pair<Int, Int>?, item: ListItem) = shown(s, o, item, pane)
        val seenNow = now.items.filter { shown(now, nowOrigin, it) > 0 }
        val seenWas = was?.items.orEmpty().filter { shown(was!!, wasOrigin, it) > 0 }
        val wasIds = seenWas.map(::identity).toSet()
        val nowIds = seenNow.map(::identity).toSet()
        val appeared = seenNow.filter { identity(it) !in wasIds }.map { item ->
            val box = nowOrigin?.let { screen(it, item) }
            val at = box?.let { at(after, it, ours) }
            SeenItem(item.index, item.key, box, round(shown(now, nowOrigin, item)), at, box?.let { within(after.semantics, it) })
        }
        val disappeared = seenWas.filter { identity(it) !in nowIds }.map { item ->
            GoneItem(item.index, item.key, wasOrigin?.let { within(before.semantics, screen(it, item)) })
        }
        val summary = ListSummary(now.total, seenNow.minOfOrNull { it.index }, seenNow.maxOfOrNull { it.index }, now.canForward, now.canBackward)
        val passed = passage?.items(now.id).orEmpty().filterKeys { it !in wasIds && it !in nowIds }.values.toList()
        return Report(summary, appeared, disappeared, passed)
    }

    fun shown(s: ListState, o: Pair<Int, Int>?, item: ListItem, pane: Pane) =
        minOf(visible(s, item), o?.let { inPane(screen(it, item), pane.box, s.vertical) } ?: 1.0)

    fun pickList(before: LiveTree, after: LiveTree, pane: Pane): ListState? {
        val axis = after.states.filter { it.vertical == pane.vertical }
        val changed = axis.filter { s -> before.states.firstOrNull { it.id == s.id }?.let { positions(it) != positions(s) } ?: false }
        changed.singleOrNull()?.let { return it }
        val pool = changed.ifEmpty { if (pane.moved) return null else axis }
        val (cx, cy) = (pane.box[0] + pane.box[2]) / 2 to (pane.box[1] + pane.box[3]) / 2
        val under = pool.filter { s -> viewport(s, pane.frame)?.let { v -> cx in v[0] until v[2] && cy in v[1] until v[3] } ?: false }
        return under.minByOrNull { it.width.toLong() * it.height }
    }

    fun origin(s: ListState, pane: List<Int>): Pair<Int, Int>? {
        if (pane[2] - pane[0] != s.width || pane[3] - pane[1] != s.height) return s.origin
        return if (s.vertical) pane[0] to pane[1] - s.start else pane[0] - s.start to pane[1]
    }

    private fun viewport(s: ListState, pane: List<Int>): List<Int>? {
        val (ox, oy) = origin(s, pane) ?: return null
        return if (s.vertical) listOf(ox, oy + s.start, ox + s.width, oy + s.start + s.height)
            else listOf(ox + s.start, oy, ox + s.start + s.width, oy + s.height)
    }

    private fun positions(s: ListState) = s.items.map { Triple(it.index, it.x, it.y) }

    fun identity(item: ListItem): Any = item.key?.let { "key" to it } ?: ("index" to item.index)

    fun visible(s: ListState, item: ListItem): Double {
        val (lo, size) = if (s.vertical) item.y to item.h else item.x to item.w
        if (size <= 0) return 0.0
        val main = if (s.vertical) s.height else s.width
        val overlap = minOf(lo + size, s.start + main) - maxOf(lo, s.start)
        return overlap.coerceIn(0, size).toDouble() / size
    }

    fun inPane(box: List<Int>, pane: List<Int>, vertical: Boolean): Double {
        val (lo, hi, min, max) = if (vertical) listOf(box[1], box[3], pane[1], pane[3]) else listOf(box[0], box[2], pane[0], pane[2])
        val crossIn = if (vertical) box[2] > pane[0] && box[0] < pane[2] else box[3] > pane[1] && box[1] < pane[3]
        if (hi <= lo || !crossIn) return 0.0
        return (minOf(hi, max) - maxOf(lo, min)).coerceIn(0, hi - lo).toDouble() / (hi - lo)
    }

    fun screen(origin: Pair<Int, Int>, item: ListItem) =
        listOf(origin.first + item.x, origin.second + item.y, origin.first + item.x + item.w, origin.second + item.y + item.h)

    private fun round(v: Double) = (v * 100).roundToInt() / 100.0

    fun at(tree: LiveTree, box: List<Int>, ours: (String) -> Boolean = { true }): String? =
        tree.nodes.filter { it.sameBox == box && it.line > 0 && it.name.isNotEmpty() && ours(it.file) }
            .map { NodeTarget.Spec(it.file, it.line, null) }.distinct()
            .firstNotNullOfOrNull { touchAt(tree, box, it) }

    fun touchAt(tree: LiveTree, box: List<Int>, spec: NodeTarget.Spec): String? {
        val all = NodeTarget.candidates(tree.nodes, spec)
        val num = NodeTarget.number(all, tree.lists)
        if (num.mixed) return null
        val pool = if (num.inList) num.all else NodeTarget.inReadingOrder(all.filter { NodeTarget.visible(it, tree) })
        val hit = pool.firstOrNull { it.node.sameBox == box } ?: return null
        return NodeTarget.Spec(spec.file, spec.line, null).toString() + if (pool.size > 1 || num.list != null) "#${hit.n}" else ""
    }

    fun within(nodes: List<SemanticNode>, box: List<Int>): Semantics? {
        val inside = nodes.filter { n ->
            val cx = (n.left + n.right) / 2
            val cy = (n.top + n.bottom) / 2
            cx in box[0] until box[2] && cy in box[1] until box[3] && n.right - n.left <= box[2] - box[0] && n.bottom - n.top <= box[3] - box[1]
        }
        return merge(inside.sortedWith(compareBy({ it.top }, { it.left })).map { it.semantics })
    }

    fun merge(all: List<Semantics>): Semantics? {
        if (all.isEmpty()) return null
        fun joined(f: (Semantics) -> String?) = all.mapNotNull(f).takeIf { it.isNotEmpty() }?.joinToString("\n")
        fun <T> first(f: (Semantics) -> T?) = all.firstNotNullOfOrNull(f)
        return Semantics(
            text = joined { it.text }, contentDescription = joined { it.contentDescription },
            stateDescription = first { it.stateDescription }, editableText = first { it.editableText },
            heading = all.any { it.heading }, role = first { it.role }, testTag = first { it.testTag },
            selected = first { it.selected }, toggleableState = first { it.toggleableState },
            disabled = all.any { it.disabled }, focused = all.any { it.focused },
            progress = first { it.progress }, actions = all.flatMap { it.actions }.toSet(),
        ).takeUnless { it == Semantics() }
    }

    fun seen(nodes: List<SemanticNode>, pane: Pane): List<SemanticNode> {
        val b = pane.box
        fun covers(n: SemanticNode) = n.left <= b[0] && n.top <= b[1] && n.right >= b[2] && n.bottom >= b[3]
        return nodes.filter { n -> part(n, pane) > 0 && !covers(n) }.sortedWith(compareBy({ it.top }, { it.left }))
    }

    private fun bySemantics(before: LiveTree, after: LiveTree, pane: Pane, ours: (String) -> Boolean, passage: ScrollPassed?): Report {
        val was = seen(before.semantics, pane)
        val now = seen(after.semantics, pane)
        val byId = (was + now).all { it.id != null }
        fun beyond(mine: List<SemanticNode>, theirs: List<SemanticNode>, takeLast: Boolean) =
            if (byId) theirs.mapTo(HashSet()) { it.id }.let { ids -> mine.filter { it.id !in ids } } else extra(mine, theirs, takeLast)
        val appeared = beyond(now, was, pane.forward).map { n ->
            val box = listOf(n.left, n.top, n.right, n.bottom)
            SeenItem(null, null, box, round(part(n, pane)), at(after, box, ours), n.semantics)
        }
        val disappeared = beyond(was, now, !pane.forward).map { GoneItem(null, null, it.semantics) }
        val shownIds = (was + now).mapNotNull { it.id }.toSet()
        val passed = passage?.nodes().orEmpty().filter { it.id !in shownIds }.map { GoneItem(null, null, it.semantics) }
        return Report(null, appeared, disappeared, passed)
    }

    private fun extra(mine: List<SemanticNode>, theirs: List<SemanticNode>, takeLast: Boolean): List<SemanticNode> {
        val counts = theirs.groupingBy { it.semantics }.eachCount()
        return mine.groupBy { it.semantics }.flatMap { (s, ns) ->
            val n = ns.size - (counts[s] ?: 0)
            if (n <= 0) emptyList() else if (takeLast) ns.takeLast(n) else ns.take(n)
        }.sortedWith(compareBy({ it.top }, { it.left }))
    }

    private fun part(n: SemanticNode, pane: Pane) = inPane(listOf(n.left, n.top, n.right, n.bottom), pane.box, pane.vertical)
}
