package prevue.infrastructure.render

import prevue.application.domain.model.LazyItem
import prevue.application.domain.model.LazyList
import prevue.application.domain.model.ListItem
import prevue.application.domain.model.ListState
import prevue.application.domain.model.ViewNode
import prevue.infrastructure.render.LazyListReflection.Cell
import prevue.infrastructure.render.LazyListReflection.Raw

internal object LazyListPlacement {
    fun placeAll(raws: List<Raw>, nodes: List<ViewNode>): Pair<List<LazyList>, List<ListState>> {
        val claimed = HashSet<List<Int>>()
        val placed = raws.map { r -> r to place(r, nodes, claimed) }
        return placed.mapNotNull { it.second?.list } to placed.map { (r, p) -> state(r, p?.origin) }
    }

    fun unplaced(raws: List<Raw>): List<ListState> = raws.map { state(it, null) }

    private class Placed(val list: LazyList, val origin: Pair<Int, Int>?)

    private fun state(r: Raw, origin: Pair<Int, Int>?) = ListState(
        r.handle.id, r.vertical, r.total, r.width, r.height, r.start, r.handle.canForward, r.handle.canBackward,
        r.cells.map { ListItem(it.index, it.key, it.x, it.y, it.w, it.h) }, origin,
    )

    private class Fit(val dx: Int, val dy: Int, val matched: List<ViewNode>)

    private fun place(r: Raw, nodes: List<ViewNode>, claimed: MutableSet<List<Int>>): Placed? {
        val free = nodes.filter { it.sameBox !in claimed }
        val byBox = HashMap<List<Int>, ViewNode>()
        free.forEach { n -> byBox.putIfAbsent(key(r, n.left, n.top, n.right, n.bottom), n) }
        val fit = bestFit(r, free, byBox, nodes)
        if (fit == null || fit.matched.isEmpty()) return if (r.cells.isEmpty()) emptyList(r, nodes)?.let { Placed(it, null) } else null
        fit.matched.forEach { claimed += it.sameBox }
        val box = viewport(r, fit, nodes)
        val items = r.cells.map { c ->
            val l = fit.dx + c.x
            val t = fit.dy + c.y
            when {
                !r.crossFills -> LazyItem(c.index, c.line, l, t, l + c.w, t + c.h)
                r.vertical -> LazyItem(c.index, c.line, box[0], t, box[2], t + c.h)
                else -> LazyItem(c.index, c.line, l, box[1], l + c.w, box[3])
            }
        }
        val origin = when {
            !r.crossFills -> fit.dx to fit.dy
            r.vertical -> box[0] to fit.dy
            else -> fit.dx to box[1]
        }
        return Placed(LazyList(box[0], box[1], box[2], box[3], r.vertical, r.total, items), origin)
    }

    private fun emptyList(r: Raw, nodes: List<ViewNode>): LazyList? {
        val f = nodes.filter { it.right - it.left == r.width && it.bottom - it.top == r.height }.distinctBy { it.sameBox }.singleOrNull() ?: return null
        return LazyList(f.left, f.top, f.right, f.bottom, r.vertical, r.total, emptyList())
    }

    private fun bestFit(r: Raw, free: List<ViewNode>, byBox: Map<List<Int>, ViewNode>, all: List<ViewNode>): Fit? {
        val exact = exactFit(r, free, byBox)
        if (exact != null && exact.matched.size * 2 > r.cells.size) return exact
        return insetFit(r, free, byBox, all) ?: exact
    }

    private data class Inset(val dx: Int, val dy: Int, val w: Int, val h: Int)

    private fun insetFit(r: Raw, free: List<ViewNode>, byBox: Map<List<Int>, ViewNode>, all: List<ViewNode>): Fit? {
        val tried = HashSet<Inset>()
        var best: Pair<Inset, List<ViewNode>>? = null
        for (c in r.cells.take((r.cells.size + 1) / 2)) for (n in free) {
            val inset = insetOf(r, c, n) ?: continue
            if (!tried.add(inset)) continue
            val matched = r.cells.mapNotNull { byBox[insetKey(r, it, inset)] }
            if (matched.size * 2 <= r.cells.size || matched.size < 2 && frameOf(r, inset, matched, all) == null) continue
            val b = best
            if (b == null || matched.size > b.second.size || matched.size == b.second.size && inset.w + inset.h < b.first.w + b.first.h) best = inset to matched
        }
        val (inset, matched) = best ?: return null
        return resolve(r, inset, matched, all)
    }

    private fun insetOf(r: Raw, c: Cell, n: ViewNode): Inset? {
        val w = if (!r.crossFills || !r.vertical) c.w - (n.right - n.left) else 0
        val h = if (!r.crossFills || r.vertical) c.h - (n.bottom - n.top) else 0
        if (w < 0 || h < 0 || w + h == 0) return null
        val dx = if (!r.crossFills || !r.vertical) n.left - c.x else 0
        val dy = if (!r.crossFills || r.vertical) n.top - c.y else 0
        return Inset(dx, dy, w, h)
    }

    private fun insetKey(r: Raw, c: Cell, i: Inset) = key(r, i.dx + c.x, i.dy + c.y, i.dx + c.x + c.w - i.w, i.dy + c.y + c.h - i.h)

    private fun frameOf(r: Raw, i: Inset, matched: List<ViewNode>, all: List<ViewNode>): ViewNode? {
        val axes = Axes(r.vertical)
        val length = if (r.vertical) r.height else r.width
        val (near, room) = if (r.vertical) i.dy to i.h else i.dx to i.w
        return all.firstOrNull { f ->
            val (s, e) = axes.main(f)
            e - s == length && s - r.start in near - room..near && matched.all { f.contains(it) }
        }
    }

    private fun resolve(r: Raw, i: Inset, matched: List<ViewNode>, all: List<ViewNode>): Fit {
        val near = if (r.vertical) i.dy else i.dx
        val room = if (r.vertical) i.h else i.w
        val mainShift = frameOf(r, i, matched, all)?.let { Axes(r.vertical).main(it).first - r.start } ?: (near - room / 2)
        return if (r.vertical) Fit(i.dx - i.w / 2, mainShift, matched) else Fit(mainShift, i.dy - i.h / 2, matched)
    }

    private fun exactFit(r: Raw, nodes: List<ViewNode>, byBox: Map<List<Int>, ViewNode>): Fit? {
        val tried = HashSet<Pair<Int, Int>>()
        var best: Fit? = null
        for (c in r.cells) {
            for (n in nodes) {
                val shift = shiftOf(r, c, n) ?: continue
                if (!tried.add(shift)) continue
                val fit = Fit(shift.first, shift.second, matches(r, shift.first, shift.second, byBox))
                if (fit.matched.size > (best?.matched?.size ?: 0)) best = fit
                if (fit.matched.size == r.cells.size) return fit
            }
            if (best != null && best.matched.size * 2 > r.cells.size) return best
        }
        return best
    }

    private fun shiftOf(r: Raw, c: Cell, n: ViewNode): Pair<Int, Int>? {
        val dx = if (!r.crossFills || !r.vertical) n.left - c.x else 0
        val dy = if (!r.crossFills || r.vertical) n.top - c.y else 0
        return (dx to dy).takeIf { key(r, n.left, n.top, n.right, n.bottom) == cellKey(r, c, dx, dy) }
    }

    private fun key(r: Raw, l: Int, t: Int, r2: Int, b: Int): List<Int> = when {
        !r.crossFills -> listOf(l, t, r2, b)
        r.vertical -> listOf(t, b)
        else -> listOf(l, r2)
    }

    private fun cellKey(r: Raw, c: Cell, dx: Int, dy: Int) = key(r, dx + c.x, dy + c.y, dx + c.x + c.w, dy + c.y + c.h)

    private fun matches(r: Raw, dx: Int, dy: Int, byBox: Map<List<Int>, ViewNode>): List<ViewNode> = r.cells.mapNotNull { c -> byBox[cellKey(r, c, dx, dy)] }

    private class Axes(val vertical: Boolean) {
        fun main(n: ViewNode) = if (vertical) n.top to n.bottom else n.left to n.right
        fun cross(n: ViewNode) = if (vertical) n.left to n.right else n.top to n.bottom
        fun box(main: Pair<Int, Int>, cross: Pair<Int, Int>) =
            if (vertical) listOf(cross.first, main.first, cross.second, main.second) else listOf(main.first, cross.first, main.second, cross.second)
    }

    private fun viewport(r: Raw, fit: Fit, nodes: List<ViewNode>): List<Int> {
        val axes = Axes(r.vertical)
        val start = (if (r.vertical) fit.dy else fit.dx) + r.start
        val main = start to start + if (r.vertical) r.height else r.width
        val frame = nodes.filter { f -> axes.main(f) == main && fit.matched.all { f.contains(it) } }.minByOrNull { area(it) }
        val cross = frame?.let { axes.cross(it) } ?: (fit.matched.minOf { axes.cross(it).first } to fit.matched.maxOf { axes.cross(it).second })
        return axes.box(main, cross)
    }

    private fun area(n: ViewNode) = (n.right - n.left).toLong() * (n.bottom - n.top)
}
