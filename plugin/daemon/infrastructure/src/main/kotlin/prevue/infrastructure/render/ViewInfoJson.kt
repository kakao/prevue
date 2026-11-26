package prevue.infrastructure.render

import com.android.ide.common.rendering.api.ViewInfo
import prevue.application.domain.model.ViewNode
import prevue.infrastructure.json.map

internal object ViewInfoJson {
    /** layoutlib 트리. 안드로이드 View 경계만 있고 file:line은 없다. */
    fun layoutlib(vi: ViewInfo): Map<String, Any?> = mapOf(
        "className" to (vi.className ?: ""),
        "bounds" to listOf(vi.left, vi.top, vi.right, vi.bottom),
        "viewObjectType" to vi.viewObject?.javaClass?.name,
        "children" to vi.children.orEmpty().map { layoutlib(it) },
    )

    /** D-69. [compose]의 트리를 겨냥용 노드로 편다. */
    fun nodes(compose: List<Map<String, Any?>>): List<ViewNode> = buildList {
        fun walk(list: List<*>, ancestors: List<List<Int>>) {
            for (n in list) {
                val m = n as? Map<*, *> ?: continue
                val b = (m["bounds"] as? List<*>)?.map { (it as Number).toInt() } ?: listOf(0, 0, 0, 0)
                val line = (m["lineNumber"] as? Number)?.toInt() ?: -1
                val beyond = ancestors.filterNot { within(it, b) }.reduceOrNull(::intersect)
                add(ViewNode(m["name"]?.toString() ?: "", m["fileName"]?.toString() ?: "", line, b[0], b[1], b[2], b[3], beyond))
                val hasArea = b[2] > b[0] && b[3] > b[1]
                val next = if (hasArea && ancestors.lastOrNull() != b) ancestors + listOf(b) else ancestors
                walk(m["children"] as? List<*> ?: emptyList<Any>(), next)
            }
        }
        walk(compose, emptyList())
    }

    private fun within(inner: List<Int>, outer: List<Int>) =
        inner[0] >= outer[0] && inner[1] >= outer[1] && inner[2] <= outer[2] && inner[3] <= outer[3]

    private fun intersect(a: List<Int>, b: List<Int>): List<Int> = when {
        within(a, b) -> a
        within(b, a) -> b
        else -> listOf(maxOf(a[0], b[0]), maxOf(a[1], b[1]), minOf(a[2], b[2]), minOf(a[3], b[3]))
    }

    fun compose(tree: List<ComposeNode>, origins: (Int) -> ComposableOrigin? = { null }): List<Map<String, Any?>> =
        tree.flatMap { nodes(it, origins) }.map { it.json }

    fun read(roots: List<ViewInfo>): TreeRead {
        val adapter = adapter(roots) ?: return TreeRead.NotCompose
        return TreeRead.Built(ToolingTree.of(adapter.javaClass).read(adapter))
    }

    fun adapter(roots: List<ViewInfo>): Any? = roots.firstNotNullOfOrNull { findAdapter(it) }

    fun toolingMismatch(roots: List<ViewInfo>): String? = adapter(roots)?.let { ToolingTree.of(it.javaClass).missing }

    private fun findAdapter(vi: ViewInfo): Any? {
        vi.viewObject?.takeIf { it.javaClass.name == ADAPTER }?.let { return it }
        return vi.children.orEmpty().firstNotNullOfOrNull { findAdapter(it) }
    }

    private const val LOCATION_DEPTH = 4
    private const val ADAPTER = "androidx.compose.ui.tooling.ComposeViewAdapter"

    private class Node(val json: Map<String, Any?>, val holdsPlacedLayout: Boolean, val hasArea: Boolean) {
        val shown: Boolean get() = holdsPlacedLayout || hasArea
    }

    private fun nodes(o: ComposeNode, origins: (Int) -> ComposableOrigin?): List<Node> {
        val layout = o.layoutInfo
        val placed = layout == null || isPlaced(layout)
        val kids = o.children.map { nodes(it, origins) }
        val children = kids.flatten()
        if (!placed) return if (children.any { it.holdsPlacedLayout }) children else emptyList()
        val holdsPlacedLayout = layout != null || children.any { it.holdsPlacedLayout }
        if (kids.any { it.isEmpty() } && layout == null && children.none { it.shown }) return emptyList()
        val box = o.bounds
        return listOf(Node(buildMap {
            put("name", o.name)
            put("fileName", o.fileName)
            put("lineNumber", o.lineNumber)
            putAll(originOf(o, origins))
            put("bounds", box)
            if (layout != null) put("modifiers", ModifierChain.of(layout))
            put("children", children.map { it.json })
        }, holdsPlacedLayout, box[2] > box[0] && box[3] > box[1]))
    }

    private fun originOf(node: ComposeNode, origins: (Int) -> ComposableOrigin?): Map<String, String> {
        val caller = node.packageHash
        val inner = located(node.children, LOCATION_DEPTH)
        val defined = inner.firstOrNull { it != caller } ?: inner.firstOrNull()
        return defined?.let(origins)?.let { mapOf("origin" to it.json) }.orEmpty()
    }

    private fun located(children: List<ComposeNode>, depth: Int): List<Int> = children.flatMap { c ->
        c.packageHash?.let(::listOf) ?: if (depth > 1) located(c.children, depth - 1) else emptyList()
    }

    private fun isPlaced(layout: Any): Boolean =
        runCatching { layout.javaClass.getMethod("isPlaced").invoke(layout) as? Boolean }.getOrNull() ?: true
}
