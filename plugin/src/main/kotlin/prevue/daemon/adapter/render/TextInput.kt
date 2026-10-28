package prevue.daemon.adapter.render

import android.view.View
import android.view.inputmethod.EditorInfo
import java.lang.reflect.Method

internal object TextInput {
    fun insert(view: View, text: String): String? {
        val field = runCatching { focusedField(view) }
            .getOrElse { return "글자를 넣지 못했다 — 포커스된 필드를 확인하지 못했다(렌더러 · Compose의 모양이 다르다): $it" }
            ?: return "포커스된 텍스트 필드가 없다"
        val ic = try {
            view.onCreateInputConnection(EditorInfo())
        } catch (e: LinkageError) {
            null
        }
        if (ic != null) {
            ic.commitText(text, 1)
            ic.finishComposingText()
            return null
        }
        return try {
            insertAtCursor(view, field, text)
            null
        } catch (e: Exception) {
            "글자를 넣지 못했다 — 렌더러 · Compose의 모양이 다르다: $e"
        }
    }

    private fun insertAtCursor(view: View, field: Any, text: String) {
        val cl = view.javaClass.classLoader
        val action = value(field, key(cl, "SemanticsActions", "getInsertTextAtCursor"))!!
        val fn = action.javaClass.getMethod("getAction").invoke(action)!!
        method(fn, "invoke", 1).apply { isAccessible = true }.invoke(fn, annotated(cl, text))
    }

    private fun focusedField(view: View): Any? {
        val cl = view.javaClass.classLoader
        val owner = view.javaClass.getMethod("getSemanticsOwner").invoke(view)
        val root = owner.javaClass.getMethod("getUnmergedRootSemanticsNode").invoke(owner)
        val focused = key(cl, "SemanticsProperties", "getFocused")
        val insert = key(cl, "SemanticsActions", "getInsertTextAtCursor")
        return find(root) { has(it, focused) && value(it, focused) == true && has(it, insert) }
    }

    private fun key(cl: ClassLoader?, owner: String, getter: String): Any {
        val o = Class.forName("androidx.compose.ui.semantics.$owner", true, cl).getField("INSTANCE").get(null)
        return o.javaClass.getMethod(getter).invoke(o)
    }

    private fun method(target: Any, name: String, params: Int): Method =
        target.javaClass.methods.first { it.name == name && it.parameterCount == params }

    private fun config(node: Any): Any = node.javaClass.getMethod("getConfig").invoke(node)
    private fun has(node: Any, key: Any): Boolean = config(node).let { c -> method(c, "contains", 1).invoke(c, key) as Boolean }
    private fun value(node: Any, key: Any): Any? = config(node).let { c -> method(c, "get", 1).invoke(c, key) }

    private fun find(node: Any, ok: (Any) -> Boolean): Any? {
        if (ok(node)) return node
        val children = method(node, "getChildren", 0).invoke(node) as List<*>
        return children.firstNotNullOfOrNull { c -> c?.let { find(it, ok) } }
    }

    private fun annotated(cl: ClassLoader?, text: String): Any {
        val c = Class.forName("androidx.compose.ui.text.AnnotatedString", true, cl)
        val k = c.constructors.filter { k -> k.parameterTypes.firstOrNull() == String::class.java && k.parameterTypes.drop(1).all { it == List::class.java } }
            .minByOrNull { it.parameterCount } ?: error("AnnotatedString(String, List…) 생성자가 없다")
        return k.newInstance(text, *Array<Any>(k.parameterCount - 1) { emptyList<Any>() })
    }
}
