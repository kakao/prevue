package prevue.daemon.domain.policy

import kotlin.math.abs
import prevue.daemon.entity.LazyList
import prevue.daemon.entity.LiveTree
import prevue.daemon.domain.model.Numbered
import prevue.daemon.entity.ViewNode

/**
 * D-69. 트리 노드의 `파일:라인[#N]`으로 겨냥한다. 같은 줄은 목록 아이템마다 여럿이고(ForYouScreen 폰 카드의 프로젝트 소스 53줄 중 34줄),
 * 한 줄에 겹친 노드(Button > Row > Text)도 있다 — 겹친 것은 바깥 하나로 묶고, 여럿이면 고르지 않고 후보를 돌려준다(첫째를 조용히 누르면
 * 그럴듯한 다른 화면이 나온다). 번호는 읽는 순서(위 → 아래, 왼 → 오른)다.
 */
object NodeTarget {
    data class Spec(val file: String, val line: Int, val nth: Int?) {
        override fun toString() = "$file:$line" + (nth?.let { "#$it" } ?: "")
    }

    sealed interface Pick {
        data class Hit(val node: ViewNode, val index: Int, val of: Int) : Pick
        /** 여럿인데 번호가 없다 — 고르게 한다. */
        data class Choose(
            val candidates: List<ViewNode>, val numbered: List<Numbered> = inReadingOrder(candidates), val mixedLists: Boolean = false, val total: Int? = null,
        ) : Pick
        /** 번호가 후보 수를 넘는다. */
        data class NoSuch(
            val nth: Int, val candidates: List<ViewNode>, val numbered: List<Numbered> = inReadingOrder(candidates), val total: Int? = null,
        ) : Pick
        data object Missing : Pick
        data class Away(val nth: Int) : Pick
    }

    private val AT = Regex("""^(.+):(\d+)(?:#(\d+))?$""")

    /** `파일:라인[#N]`. 파일은 경로든 이름이든 베이스네임으로 맞춘다 — 트리는 베이스네임만 갖는다. */
    fun parse(at: String): Spec? {
        val m = AT.matchEntire(at.trim()) ?: return null
        val line = m.groupValues[2].toIntOrNull() ?: return null
        val nth = m.groupValues[3].takeIf { it.isNotEmpty() }?.let { it.toIntOrNull() ?: return null }
        if (nth != null && nth < 1) return null
        return Spec(m.groupValues[1].substringAfterLast('/'), line, nth)
    }

    /**
     * 그 줄의 노드 — 박스가 빈 것(`remember` 등)은 빼고, 겹친 것은 바깥 하나, 읽는 순서. 이름 있는 노드가 있으면 이름 없는 것은 뺀다 —
     * 람다 그룹이 엉뚱한 줄로 잡혀 이웃 줄의 노드를 감싼다(실측: `repeat { Text }` 다음 줄의 `Button` 자리에 그 Text들을 감싼 이름 없는 노드).
     */
    fun candidates(nodes: List<ViewNode>, spec: Spec): List<ViewNode> {
        val all = nodes.filter { it.file == spec.file && it.line == spec.line && it.right > it.left && it.bottom > it.top }
        val hit = all.filter { it.name.isNotEmpty() }.ifEmpty { all }.distinctBy { it.sameBox }
        return hit.filter { n -> hit.none { o -> o !== n && o.contains(n) } }
            .sortedWith(compareBy({ it.top }, { it.left }))
    }

    class Numbering(val all: List<Numbered>, val list: LazyList?, val mixed: Boolean) {
        val inList: Boolean get() = list != null || mixed
    }

    fun inReadingOrder(nodes: List<ViewNode>) = nodes.mapIndexed { i, n -> Numbered(n, i + 1) }

    fun number(candidates: List<ViewNode>, lists: List<LazyList>): Numbering {
        val homes = candidates.map { home(it, lists) }
        if (candidates.isEmpty() || homes.any { it == null }) return Numbering(inReadingOrder(candidates), null, false)
        val numbered = candidates.zip(homes) { n, l -> Numbered(n, itemOf(n, l!!) + 1) }
        if (homes.distinct().size > 1) return Numbering(numbered, null, true)
        if (numbered.map { it.n }.distinct().size < numbered.size) return Numbering(inReadingOrder(candidates), null, false)
        return Numbering(numbered.sortedBy { it.n }, homes[0], false)
    }

    fun pickIn(num: Numbering, nth: Int?): Pick {
        val list = num.list
        val of = list?.total ?: num.all.size
        return when {
            num.all.isEmpty() -> Pick.Missing
            num.mixed -> Pick.Choose(num.all.map { it.node }, num.all, mixedLists = true)
            nth != null -> num.all.firstOrNull { it.n == nth }?.let { Pick.Hit(it.node, nth, of) }
                ?: if (list != null && nth <= list.total) Pick.Away(nth) else Pick.NoSuch(nth, num.all.map { it.node }, num.all, list?.total)
            num.all.size == 1 -> Pick.Hit(num.all[0].node, num.all[0].n, of)
            else -> Pick.Choose(num.all.map { it.node }, num.all, total = list?.total)
        }
    }

    private fun center(n: ViewNode) = (n.left + n.right) / 2 to (n.top + n.bottom) / 2

    private fun home(n: ViewNode, lists: List<LazyList>): LazyList? {
        val (x, y) = center(n)
        return lists.filter { l -> l.items.any { it.has(x, y) } }.minByOrNull { it.area }
    }

    private fun itemOf(n: ViewNode, list: LazyList): Int {
        val (x, y) = center(n)
        return (list.items.firstOrNull { it.has(x, y) } ?: list.items.minBy { abs((it.left + it.right) / 2 - x) + abs((it.top + it.bottom) / 2 - y) }).index
    }

    fun pick(candidates: List<ViewNode>, nth: Int?): Pick = when {
        candidates.isEmpty() -> Pick.Missing
        nth != null -> candidates.getOrNull(nth - 1)?.let { Pick.Hit(it, nth, candidates.size) } ?: Pick.NoSuch(nth, candidates)
        candidates.size == 1 -> Pick.Hit(candidates[0], 1, 1)
        else -> Pick.Choose(candidates)
    }

    fun visible(n: ViewNode, t: LiveTree): Boolean {
        val (l, top, r, b) = viewport(n, t)
        return r > l && b > top && n.right > l && n.bottom > top && n.left < r && n.top < b
    }

    fun shown(n: ViewNode, t: LiveTree): Boolean {
        val (l, top, r, b) = viewport(n, t)
        fun axis(a: Int, z: Int, lo: Int, hi: Int) = if (z - a >= hi - lo) a <= lo && z >= hi else a >= lo && z <= hi
        return axis(n.left, n.right, l, r) && axis(n.top, n.bottom, top, b)
    }

    fun point(n: ViewNode, t: LiveTree): Pair<Int, Int> {
        val (l, top, r, b) = viewport(n, t)
        return ((maxOf(n.left, l) + minOf(n.right, r)) / 2) to ((maxOf(n.top, top) + minOf(n.bottom, b)) / 2)
    }

    fun visibleBox(n: ViewNode, t: LiveTree): List<Int> {
        val (l, top, r, b) = viewport(n, t)
        return listOf(maxOf(n.left, l), maxOf(n.top, top), minOf(n.right, r), minOf(n.bottom, b))
    }

    private fun viewport(n: ViewNode, t: LiveTree): List<Int> {
        val a = n.ancestorsBox ?: return listOf(0, 0, t.width, t.height)
        return listOf(maxOf(a[0], 0), maxOf(a[1], 0), minOf(a[2], t.width), minOf(a[3], t.height))
    }
}
