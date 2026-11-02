package prevue.daemon.domain.policy

import prevue.daemon.entity.ListItem
import prevue.daemon.entity.LiveTree
import prevue.daemon.entity.SemanticNode
import prevue.daemon.domain.model.GoneItem

class ScrollPassed(val before: LiveTree, private val pane: ScrollReport.Pane) {
    private class Seen(val item: GoneItem, val shown: Double)

    private val lists = HashMap<Int, LinkedHashMap<Any, Seen>>()
    private val semantic = LinkedHashMap<Int, SemanticNode>()
    private val noList = ScrollReport.pickList(before, before, pane.copy(moved = false)) == null

    fun sample(p: ScrollUntil.Probe) {
        val nodes by lazy { p.semantics() }
        for (s in p.lists().filter { it.vertical == pane.vertical }) {
            val o = ScrollReport.origin(s, pane.frame)
            val seen = lists.getOrPut(s.id) { LinkedHashMap() }
            val fuller = s.items.associateWith { ScrollReport.shown(s, o, it, pane) }.filter { (item, v) ->
                v > 0 && seen[ScrollReport.identity(item)].let { it == null || (it.shown < 1.0 && v > it.shown) }
            }
            for (item in ordered(fuller.keys)) {
                val semantics = o?.let { ScrollReport.within(nodes, ScrollReport.screen(it, item)) }
                seen[ScrollReport.identity(item)] = Seen(GoneItem(item.index, item.key, semantics), fuller.getValue(item))
            }
        }
        if (!noList) return
        val seen = ScrollReport.seen(nodes, pane)
        for (n in if (pane.forward) seen else seen.asReversed()) n.id?.let { semantic.putIfAbsent(it, n) }
    }

    fun items(list: Int): Map<Any, GoneItem> = lists[list].orEmpty().mapValues { it.value.item }

    fun nodes(): List<SemanticNode> = semantic.values.toList()

    private fun ordered(items: Collection<ListItem>) = if (pane.forward) items.sortedBy { it.index } else items.sortedByDescending { it.index }
}
