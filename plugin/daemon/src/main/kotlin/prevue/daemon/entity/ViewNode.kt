package prevue.daemon.entity

/** Compose 트리의 노드 하나 — 부른 자리의 파일(베이스네임) · 줄과 그림 px 박스. 박스는 그림 밖(굴려야 보이는 자리)일 수 있다. */
data class ViewNode(
    val name: String, val file: String, val line: Int, val left: Int, val top: Int, val right: Int, val bottom: Int,
    val ancestorsBox: List<Int>? = null,
) {
    fun contains(o: ViewNode) = left <= o.left && top <= o.top && right >= o.right && bottom >= o.bottom
    val sameBox: List<Int> get() = listOf(left, top, right, bottom)
}

/** 인터랙티브 카드의 지금 화면 — 그림 크기와 펼친 Compose 노드. */
data class LiveTree(
    val width: Int, val height: Int, val nodes: List<ViewNode>, val lists: List<LazyList> = emptyList(),
    val states: List<ListState> = emptyList(), val semantics: List<SemanticNode> = emptyList(),
)

data class LazyItem(val index: Int, val line: Int, val left: Int, val top: Int, val right: Int, val bottom: Int) {
    fun has(x: Int, y: Int) = x in left until right && y in top until bottom
}

data class LazyList(
    val left: Int, val top: Int, val right: Int, val bottom: Int,
    val vertical: Boolean, val total: Int, val items: List<LazyItem>,
) {
    fun has(x: Int, y: Int) = x in left until right && y in top until bottom
    val area: Long get() = (right - left).toLong() * (bottom - top)
}

data class ListItem(val index: Int, val key: Any?, val x: Int, val y: Int, val w: Int, val h: Int)

data class ListState(
    val id: Int, val vertical: Boolean, val total: Int, val width: Int, val height: Int, val start: Int,
    val canForward: Boolean?, val canBackward: Boolean?, val items: List<ListItem>, val origin: Pair<Int, Int>? = null,
)

data class Progress(val current: Float, val min: Float, val max: Float, val steps: Int)

data class Semantics(
    val text: String? = null, val contentDescription: String? = null, val stateDescription: String? = null, val editableText: String? = null,
    val heading: Boolean = false, val role: String? = null, val testTag: String? = null,
    val selected: Boolean? = null, val toggleableState: String? = null, val disabled: Boolean = false, val focused: Boolean = false,
    val progress: Progress? = null, val actions: Set<String> = emptySet(),
)

data class SemanticNode(
    val left: Int, val top: Int, val right: Int, val bottom: Int, val semantics: Semantics,
    val fullWidth: Int = right - left, val fullHeight: Int = bottom - top, val id: Int? = null,
)
