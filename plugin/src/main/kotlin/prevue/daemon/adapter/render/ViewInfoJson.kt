package prevue.daemon.adapter.render

import com.android.ide.common.rendering.api.ViewInfo
import prevue.daemon.entity.ViewNode
import prevue.json.map

/** layoutlib ViewInfo와 ComposeViewAdapter의 Compose 레벨 ViewInfo를 뷰어가 읽는 JSON 구조로 옮긴다. */
object ViewInfoJson {
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

    /** ComposeViewAdapter는 루트가 아니라 몇 단계 아래에 있어 트리를 훑어 찾는다. */
    fun compose(roots: List<ViewInfo>): List<Map<String, Any?>> {
        for (root in roots) deepFind(root)?.let { return it }
        return emptyList()
    }

    private fun deepFind(vi: ViewInfo): List<Map<String, Any?>>? {
        composeViewInfos(vi.viewObject)?.let { return it }
        vi.children.orEmpty().forEach { child -> deepFind(child)?.let { return it } }
        return null
    }

    /**
     * 어댑터의 viewInfos를 지금 컴포지션으로 다시 짓는다. 어댑터는 첫 배치(onLayout)에서만 짓는다 — 터치로 바뀐 화면(목록 → 상세 · 스크롤)은
     * Compose 안에서 다시 배치될 뿐이라, 그대로 두면 트리가 첫 화면에 머물러 가리키기와 에이전트가 읽는 좌표가 그림과 어긋났다.
     * 렌더 세션 안에서 불러야 한다(컴포지션 · 리소스를 읽는다). 못 지었으면 그 이유 — private 메서드라 렌더러 판올림에 깨질 수 있다.
     */
    fun refresh(roots: List<ViewInfo>): String? {
        val adapter = roots.firstNotNullOfOrNull { findAdapter(it) } ?: return null   // Compose 프리뷰가 아니다
        return runCatching {
            adapter.javaClass.getDeclaredMethod("processViewInfos").apply { isAccessible = true }.invoke(adapter)
            null
        }.getOrElse { (it.cause ?: it).toString() }
    }

    fun adapter(roots: List<ViewInfo>): Any? = roots.firstNotNullOfOrNull { findAdapter(it) }

    private fun findAdapter(vi: ViewInfo): Any? {
        vi.viewObject?.takeIf { it.javaClass.name == "androidx.compose.ui.tooling.ComposeViewAdapter" }?.let { return it }
        return vi.children.orEmpty().firstNotNullOfOrNull { findAdapter(it) }
    }

    /**
     * ComposeViewAdapter가 들고 있는 viewInfos를 리플렉션으로 읽는다.
     * 접근자가 internal이라 JVM 이름이 모듈명으로 맹글링돼 있다 — alpha 렌더러라 릴리즈마다 깨질 수 있는 지점이다.
     */
    private fun composeViewInfos(root: Any?): List<Map<String, Any?>>? {
        if (root == null) return null
        val cls = root.javaClass
        if (cls.name != "androidx.compose.ui.tooling.ComposeViewAdapter") return null
        val getter = runCatching { cls.getMethod("getViewInfos${'$'}ui_tooling") }.getOrNull() ?: return null
        val infos = runCatching { getter.invoke(root) as? List<*> }.getOrNull() ?: return null
        return infos.flatMap { nodes(it) }.map { it.json }
    }

    private class Node(val json: Map<String, Any?>, val holdsPlacedLayout: Boolean, val hasArea: Boolean) {
        val shown: Boolean get() = holdsPlacedLayout || hasArea
    }

    private fun nodes(o: Any?): List<Node> {
        if (o == null) return listOf(Node(emptyMap(), false, false))
        val c = o.javaClass
        fun call(n: String) = runCatching { c.getMethod(n).invoke(o) }.getOrNull()
        val layout = call("getLayoutInfo")
        val placed = layout == null || isPlaced(layout)
        val raw = (call("getChildren") as? List<*>).orEmpty()
        val kids = raw.map { nodes(it) }
        val children = kids.flatten()
        if (!placed) return if (children.any { it.holdsPlacedLayout }) children else emptyList()
        val holdsPlacedLayout = layout != null || children.any { it.holdsPlacedLayout }
        if (kids.any { it.isEmpty() } && layout == null && children.none { it.shown }) return emptyList()
        val box = box(call("getBounds"))
        return listOf(Node(mapOf(
            "name" to (call("getName")?.toString() ?: ""),
            "fileName" to (call("getFileName")?.toString() ?: ""),
            "lineNumber" to (call("getLineNumber") ?: -1),
            "bounds" to box,
            "children" to children.map { it.json },
        ), holdsPlacedLayout, box[2] > box[0] && box[3] > box[1]))
    }

    private fun box(bounds: Any?): List<Int> = listOf("getLeft", "getTop", "getRight", "getBottom").map { n ->
        (bounds?.let { r -> runCatching { r.javaClass.getMethod(n).invoke(r) }.getOrNull() } as? Number)?.toInt() ?: 0
    }

    private fun isPlaced(layout: Any): Boolean =
        runCatching { layout.javaClass.getMethod("isPlaced").invoke(layout) as? Boolean }.getOrNull() ?: true
}
