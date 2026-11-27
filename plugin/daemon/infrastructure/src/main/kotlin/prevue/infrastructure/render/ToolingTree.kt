package prevue.infrastructure.render

import java.lang.reflect.Method
import java.lang.reflect.Proxy

internal class ComposeNode(
    val name: String,
    val fileName: String,
    val lineNumber: Int,
    val bounds: List<Int>,
    val packageHash: Int?,
    val layoutInfo: Any?,
    val children: List<ComposeNode>,
)

internal sealed interface TreeRead {
    class Built(val tree: List<ComposeNode>) : TreeRead
    class Failed(val why: String) : TreeRead
    data object NotCompose : TreeRead
    data object Kept : TreeRead
}

internal class ToolingTree private constructor(adapter: Class<*>) {
    private val loader: ClassLoader? = adapter.classLoader
    private val gaps = mutableListOf<String>()
    private val record = need("ComposeViewAdapter.slotTableRecord") {
        adapter.getDeclaredField("slotTableRecord").apply { isAccessible = true }
    }
    private val store = need("CompositionDataRecord.getStore") { cls(RECORD).getMethod("getStore") }
    private val makeTree = need("CompositionDataTreeKt.makeTree") { cls(TREE).methods.single { it.name == "makeTree" && shapedLikeMakeTree(it) } }
    private val newCache = need("ContextCache.<init>") { makeTree!!.parameterTypes[CACHE_AT].getConstructor() }
    private val location = need("SourceContext.getLocation") { cls(CONTEXT).getMethod("getLocation") }
    private val bounds = need("SourceContext.getBounds") { cls(CONTEXT).getMethod("getBounds") }
    private val sourceFile = need("SourceLocation.getSourceFile") { location!!.returnType.getMethod("getSourceFile") }
    private val lineNumber = need("SourceLocation.getLineNumber") { location!!.returnType.getMethod("getLineNumber") }
    private val edges = EDGES.map { e -> need("IntRect.$e") { bounds!!.returnType.getMethod(e) } }
    private val name = optional { cls(CONTEXT).getMethod("getName") }
    private val packageHash = optional { location!!.returnType.getMethod("getPackageHash") }
    private val groupNode = optional { cls(GROUP).getMethod("getNode") }
    private val layoutInfo = optional { cls(LAYOUT_INFO) }
    private val unit = optional { kotlinUnit(makeTree!!.parameterTypes[PREPARE_AT]) }

    val missing: String? get() = gaps.firstOrNull()

    fun read(adapter: Any): List<ComposeNode> {
        missing?.let { error("ui-tooling surface missing: $it") }
        val data = store!!.invoke(record!!.get(adapter)) as Set<*>
        val tree = makeTree!!
        val prepare = function(tree, PREPARE_AT) { unit }
        val factory = function(tree, FACTORY_AT) { a -> node(a[0], a[1], a[2] as List<*>, a[3] as List<*>?) }
        val result = function(tree, RESULT_AT) { a -> a[1] }
        val roots = tree.invoke(null, data, prepare, factory, result, newCache!!.newInstance())
        return (roots as List<*>).filterIsInstance<ComposeNode>()
    }

    private fun node(group: Any?, context: Any?, children: List<*>, stitched: List<*>?): ComposeNode {
        val at = location!!.invoke(context)
        val box = bounds!!.invoke(context)
        val node = groupNode?.let { m -> group?.let { runCatching { m.invoke(it) }.getOrNull() } }
        return ComposeNode(
            name = name?.invoke(context)?.toString() ?: "",
            fileName = at?.let { sourceFile!!.invoke(it) as String? } ?: "",
            lineNumber = at?.let { lineNumber!!.invoke(it) as? Int } ?: -1,
            bounds = edges.map { e -> (box?.let { e!!.invoke(it) } as? Number)?.toInt() ?: 0 },
            packageHash = at?.let { packageHash?.invoke(it) as? Int },
            layoutInfo = node?.takeIf { layoutInfo?.isInstance(it) == true },
            children = (children + stitched.orEmpty()).filterIsInstance<ComposeNode>(),
        )
    }

    private fun function(tree: Method, at: Int, body: (Array<out Any?>) -> Any?): Any {
        val type = tree.parameterTypes[at]
        return Proxy.newProxyInstance(type.classLoader, arrayOf(type)) { self, m, args ->
            when (m.name) {
                "invoke" -> body(args.orEmpty())
                "equals" -> self === args?.firstOrNull()
                "hashCode" -> System.identityHashCode(self)
                "toString" -> "prevue tree ${type.simpleName}"
                else -> null
            }
        }
    }

    private fun cls(name: String): Class<*> = Class.forName(name, false, loader)

    private fun <T> need(surface: String, open: () -> T): T? = runCatching(open).getOrNull().also { if (it == null) gaps += surface }

    private fun <T> optional(open: () -> T): T? = runCatching(open).getOrNull()

    companion object {
        private val trees = object : ClassValue<ToolingTree>() {
            override fun computeValue(type: Class<*>) = ToolingTree(type)
        }

        fun of(adapter: Class<*>): ToolingTree = trees.get(adapter)

        // 외부: 렌더러는 프로젝트 클래스의 kotlin 패키지를 _layoutlib_._internal_.kotlin 으로 옮겨 싣는다
        private fun isKotlinFunction(type: Class<*>, arity: Int) = type.isInterface && type.name.endsWith("kotlin.jvm.functions.Function$arity")

        private fun kotlinUnit(function: Class<*>): Any? {
            val kotlin = function.name.removeSuffix("jvm.functions.Function1")
            return Class.forName("${kotlin}Unit", false, function.classLoader).getField("INSTANCE").get(null)
        }

        private fun shapedLikeMakeTree(m: Method): Boolean {
            val p = m.parameterTypes
            return p.size == CACHE_AT + 1 && p[0] == Set::class.java && p[CACHE_AT].name == CACHE &&
                isKotlinFunction(p[PREPARE_AT], 1) && isKotlinFunction(p[FACTORY_AT], 4) && isKotlinFunction(p[RESULT_AT], 3)
        }

        private const val RECORD = "androidx.compose.ui.tooling.CompositionDataRecord"
        private const val TREE = "androidx.compose.ui.tooling.data.CompositionDataTreeKt"
        private const val CACHE = "androidx.compose.ui.tooling.data.ContextCache"
        private const val CONTEXT = "androidx.compose.ui.tooling.data.SourceContext"
        private const val GROUP = "androidx.compose.runtime.tooling.CompositionGroup"
        private const val LAYOUT_INFO = "androidx.compose.ui.layout.LayoutInfo"
        private const val PREPARE_AT = 1
        private const val FACTORY_AT = 2
        private const val RESULT_AT = 3
        private const val CACHE_AT = 4
        private val EDGES = listOf("getLeft", "getTop", "getRight", "getBottom")
    }
}
