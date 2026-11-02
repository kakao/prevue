package prevue.daemon.adapter.render

import android.view.View
import android.view.ViewGroup
import java.lang.reflect.Method
import kotlin.math.roundToInt
import prevue.daemon.entity.Progress
import prevue.daemon.entity.SemanticNode
import prevue.daemon.entity.Semantics

internal object SemanticsTree {
    class Read(val nodes: List<SemanticNode>, val failure: Throwable?)

    fun read(root: View): Read {
        val view = composeView(root) ?: return Read(emptyList(), null)
        val keys = Keys(view.javaClass.classLoader)
        val owner = view.javaClass.getMethod("getSemanticsOwner").invoke(view)
        val top = owner.javaClass.getMethod("getRootSemanticsNode").invoke(owner)
        var failure: Throwable? = null
        val nodes = buildList {
            fun walk(node: Any) {
                if (!placed(node)) return
                runCatching { semantics(node, keys)?.let { s -> box(node)?.let { b -> add(node(b, s, size(node), id(node))) } } }
                    .onFailure { failure = failure ?: it }
                children(node).forEach { walk(it) }
            }
            walk(top)
        }
        return Read(nodes, failure)
    }

    private fun composeView(v: View): View? {
        if (runCatching { v.javaClass.getMethod("getSemanticsOwner") }.isSuccess) return v
        if (v !is ViewGroup) return null
        return (0 until v.childCount).firstNotNullOfOrNull { composeView(v.getChildAt(it)) }
    }

    private class Keys(cl: ClassLoader?) {
        private val props = holder(cl, "SemanticsProperties")
        private val acts = holder(cl, "SemanticsActions")
        private fun holder(cl: ClassLoader?, name: String) = Class.forName("androidx.compose.ui.semantics.$name", true, cl).getField("INSTANCE").get(null)
        private fun of(o: Any, getter: String): Any? = runCatching { o.javaClass.getMethod(getter).invoke(o) }.getOrNull()
        val text = of(props, "getText")
        val contentDescription = of(props, "getContentDescription")
        val stateDescription = of(props, "getStateDescription")
        val editableText = of(props, "getEditableText")
        val heading = of(props, "getHeading")
        val role = of(props, "getRole")
        val testTag = of(props, "getTestTag")
        val selected = of(props, "getSelected")
        val toggleableState = of(props, "getToggleableState")
        val disabled = of(props, "getDisabled")
        val focused = of(props, "getFocused")
        val progress = of(props, "getProgressBarRangeInfo")
        val actions = listOf("click" to "getOnClick", "longClick" to "getOnLongClick", "scrollBy" to "getScrollBy", "setText" to "getSetText")
            .mapNotNull { (n, g) -> of(acts, g)?.let { n to it } }
    }

    private fun semantics(node: Any, k: Keys): Semantics? {
        val config = method(node, "getConfig", 0).invoke(node)
        val contains = method(config, "contains", 1)
        val get = method(config, "get", 1)
        fun has(key: Any?) = key != null && contains.invoke(config, key) as Boolean
        fun value(key: Any?): Any? = if (has(key)) get.invoke(config, key) else null
        fun texts(key: Any?) = (value(key) as? List<*>)?.mapNotNull { it?.toString() }?.takeIf { it.isNotEmpty() }?.joinToString("\n")
        val s = Semantics(
            text = texts(k.text),
            contentDescription = texts(k.contentDescription),
            stateDescription = value(k.stateDescription)?.toString(),
            editableText = value(k.editableText)?.toString(),
            heading = has(k.heading),
            role = value(k.role)?.toString(),
            testTag = value(k.testTag)?.toString(),
            selected = value(k.selected) as? Boolean,
            toggleableState = (value(k.toggleableState) as? Enum<*>)?.name,
            disabled = has(k.disabled),
            focused = value(k.focused) == true,
            progress = value(k.progress)?.let { progress(it) },
            actions = k.actions.filter { (_, key) -> has(key) }.map { it.first }.toSet(),
        )
        return s.takeUnless { it == Semantics() }
    }

    private fun progress(info: Any): Progress? = runCatching {
        val current = info.javaClass.getMethod("getCurrent").invoke(info) as Float
        val range = info.javaClass.getMethod("getRange").invoke(info)
        fun end(name: String) = (range.javaClass.getMethod(name).invoke(range) as Number).toFloat()
        val steps = info.javaClass.getMethod("getSteps").invoke(info) as Int
        Progress(current, end("getStart"), end("getEndInclusive"), steps)
    }.getOrNull()

    private fun box(node: Any): List<Int>? = runCatching {
        val r = method(node, "getBoundsInWindow", 0).invoke(node)
        listOf("getLeft", "getTop", "getRight", "getBottom").map { (method(r, it, 0).invoke(r) as Float).roundToInt() }
    }.getOrNull()?.takeIf { it[2] > it[0] && it[3] > it[1] }

    // 외부: 게으른 목록은 재사용을 기다리는 아이템을 배치하지 않은 채(isDeactivated) 시맨틱 트리에 남겨 두고, 그 박스가 보이는 아이템과 겹친다
    private fun placed(node: Any): Boolean = runCatching {
        val info = method(node, "getLayoutInfo", 0).invoke(node)
        val (isPlaced, isDeactivated) = flags.get(info.javaClass)
        (isPlaced?.invoke(info) as? Boolean ?: true) && !(isDeactivated?.invoke(info) as? Boolean ?: false)
    }.getOrDefault(true)

    private val flags = object : ClassValue<Pair<Method?, Method?>>() {
        override fun computeValue(type: Class<*>): Pair<Method?, Method?> {
            fun named(name: String) = type.methods.firstOrNull { it.name == name && it.parameterCount == 0 }?.also { it.trySetAccessible() }
            return named("isPlaced") to named("isDeactivated")
        }
    }

    private fun node(b: List<Int>, s: Semantics, size: Pair<Int, Int>?, id: Int?) =
        SemanticNode(b[0], b[1], b[2], b[3], s, size?.first ?: (b[2] - b[0]), size?.second ?: (b[3] - b[1]), id)

    private fun id(node: Any): Int? = runCatching { method(node, "getId", 0).invoke(node) as Int }.getOrNull()

    // 외부: SemanticsNode.size 는 IntSize 값 클래스라 JVM 에서 너비(위 32비트)·높이(아래 32비트)를 묶은 long 이고 게터 이름이 맹글링된다
    private fun size(node: Any): Pair<Int, Int>? = runCatching {
        val get = sizes.get(node.javaClass) ?: return null
        val v = get.invoke(node) as Long
        (v shr 32).toInt() to (v and 0xFFFFFFFFL).toInt()
    }.getOrNull()

    private val sizes = object : ClassValue<Method?>() {
        override fun computeValue(type: Class<*>): Method? =
            type.methods.firstOrNull { it.parameterCount == 0 && it.name.startsWith("getSize-") && it.returnType == java.lang.Long.TYPE }
    }

    private fun children(node: Any): List<Any> = (method(node, "getChildren", 0).invoke(node) as List<*>).filterNotNull()

    private val methods = object : ClassValue<HashMap<String, Method>>() {
        override fun computeValue(type: Class<*>) = HashMap<String, Method>()
    }

    private fun method(target: Any, name: String, params: Int): Method = methods.get(target.javaClass).getOrPut("$name/$params") {
        target.javaClass.methods.first { it.name == name && it.parameterCount == params }
    }
}
