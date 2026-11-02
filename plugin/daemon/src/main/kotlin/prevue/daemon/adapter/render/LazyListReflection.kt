package prevue.daemon.adapter.render

import java.lang.reflect.Method
import java.util.IdentityHashMap
import java.util.Optional

internal object LazyListReflection {
    private const val LIST_STATE = "androidx.compose.foundation.lazy.LazyListState"
    private const val GRID_STATE = "androidx.compose.foundation.lazy.grid.LazyGridState"
    private const val DEFAULT_KEY = "androidx.compose.foundation.lazy.layout.DefaultLazyKey"

    class Cell(val index: Int, val line: Int, val x: Int, val y: Int, val w: Int, val h: Int, val key: Any? = null)

    class Raw(
        val vertical: Boolean, val total: Int, val width: Int, val height: Int, val start: Int, val crossFills: Boolean, val cells: List<Cell>,
        val handle: Handle = Handle(),
    )

    class Handle(val id: Int = 0, val canForward: Boolean? = null, val canBackward: Boolean? = null, val state: Any? = null)

    fun read(adapter: Any?): List<Raw> {
        val record = adapter?.let { field(it, "slotTableRecord") } ?: return emptyList()
        val states = IdentityHashMap<Any, Unit>()
        fun walk(group: Any) {
            iterable(call(group, "getData")).forEach { d -> if (d != null && d.javaClass.name.let { it == LIST_STATE || it == GRID_STATE }) states[d] = Unit }
            iterable(call(group, "getCompositionGroups")).forEach { c -> if (c != null) walk(c) }
        }
        iterable(call(record, "getStore")).forEach { data -> if (data != null) walk(data) }
        return reread(states.keys.toList())
    }

    fun reread(states: List<Any>): List<Raw> = states.mapNotNull { runCatching { raw(it) }.getOrNull() }

    private fun raw(state: Any): Raw? {
        val info = call(state, "getLayoutInfo") ?: return null
        val vertical = call(info, "getOrientation")?.toString() == "Vertical"
        val (w, h) = unpack(packed(info, "getViewportSize") ?: return null)
        val start = call(info, "getViewportStartOffset") as? Int ?: 0
        val total = call(info, "getTotalItemsCount") as? Int ?: return null
        val grid = state.javaClass.name == GRID_STATE
        val cells = iterable(call(info, "getVisibleItemsInfo")).mapNotNull { item ->
            item?.let { if (grid) gridCell(it, vertical) else listCell(it, vertical, w, h) }
        }
        return Raw(
            vertical, total, w, h, start, crossFills = !grid, cells,
            Handle(System.identityHashCode(state), call(state, "getCanScrollForward") as? Boolean, call(state, "getCanScrollBackward") as? Boolean, state),
        )
    }

    private fun gridCell(item: Any, vertical: Boolean): Cell? {
        val index = call(item, "getIndex") as? Int ?: return null
        val (x, y) = unpack(packed(item, "getOffset") ?: return null)
        val (w, h) = unpack(packed(item, "getSize") ?: return null)
        val line = call(item, if (vertical) "getRow" else "getColumn") as? Int ?: index
        return Cell(index, line, x, y, w, h, key(item))
    }

    private fun listCell(item: Any, vertical: Boolean, viewportW: Int, viewportH: Int): Cell? {
        val index = call(item, "getIndex") as? Int ?: return null
        val off = call(item, "getOffset") as? Int ?: return null
        val size = call(item, "getSize") as? Int ?: return null
        return if (vertical) Cell(index, index, 0, off, viewportW, size, key(item)) else Cell(index, index, off, 0, size, viewportH, key(item))
    }

    private fun key(item: Any): Any? = call(item, "getKey")?.takeUnless { it.javaClass.name == DEFAULT_KEY }?.let { k ->
        when (k) {
            is Number, is String, is Boolean -> k
            else -> k.toString()
        }
    }

    // 외부: IntOffset · IntSize 는 Kotlin 값 클래스라 JVM 에서 x(위 32비트)·y(아래 32비트)를 묶은 long 이고 게터 이름이 맹글링된다(getSize-YbymL2g)
    private fun unpack(v: Long) = (v shr 32).toInt() to (v and 0xFFFFFFFFL).toInt()

    private fun packed(o: Any, name: String): Long? =
        method(o, "packed:$name") { it.parameterCount == 0 && (it.name == name || it.name.startsWith("$name-")) && it.returnType == java.lang.Long.TYPE }
            ?.let { runCatching { it.invoke(o) as Long }.getOrNull() }

    private fun call(o: Any, name: String): Any? =
        method(o, name) { it.parameterCount == 0 && it.name == name }?.let { runCatching { it.invoke(o) }.getOrNull() }

    private val methods = object : ClassValue<HashMap<String, Optional<Method>>>() {
        override fun computeValue(type: Class<*>) = HashMap<String, Optional<Method>>()
    }

    private fun method(o: Any, key: String, test: (Method) -> Boolean): Method? = methods.get(o.javaClass)
        .getOrPut(key) { Optional.ofNullable(o.javaClass.methods.firstOrNull(test)?.also { it.trySetAccessible() }) }.orElse(null)

    private fun field(o: Any, name: String): Any? = runCatching {
        o.javaClass.getDeclaredField(name).apply { isAccessible = true }.get(o)
    }.getOrNull()

    private fun iterable(o: Any?): Iterable<Any?> = (o as? Iterable<*>)?.toList() ?: emptyList()
}
