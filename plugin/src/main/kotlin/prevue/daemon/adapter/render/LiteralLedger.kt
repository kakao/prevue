package prevue.daemon.adapter.render

import java.lang.reflect.InvocationTargetException
import java.util.WeakHashMap

internal class LiteralLedger {
    private val values = LinkedHashMap<String, LinkedHashMap<String, Any>>()
    private var version = 0
    private val appliedTo = WeakHashMap<ClassLoader, Int>()

    fun record(owner: String, put: Map<String, Any>) {
        values.getOrPut(owner) { LinkedHashMap() }.putAll(put)
        version++
    }

    fun snapshot(owner: String): Map<String, Any>? = values[owner]?.let(::LinkedHashMap)

    fun restore(owner: String, before: Map<String, Any>?) {
        if (before == null) values.remove(owner) else values[owner] = LinkedHashMap(before)
        version++
    }

    fun drop(owners: Collection<String>) {
        if (owners.any { values.remove(it) != null }) version++
    }

    fun applyTo(loader: ClassLoader): Throwable? {
        if (values.isEmpty() || appliedTo[loader] == version) return null
        return try {
            val update = Class.forName(LIVE_LITERAL_KT, true, loader).getMethod("updateLiveLiteralValue", String::class.java, Any::class.java)
            for ((owner, byKey) in values) {
                val cls = classOrNull(owner, loader) ?: continue
                for ((k, v) in byKey) update.invoke(null, k, v)
                cls.getDeclaredField("enabled").apply { isAccessible = true }.setBoolean(null, true)
            }
            appliedTo[loader] = version
            null
        } catch (e: InvocationTargetException) {
            e.targetException
        } catch (e: Throwable) {
            e
        }
    }

    private fun classOrNull(owner: String, loader: ClassLoader): Class<*>? =
        runCatching { Class.forName(owner, true, loader) }.getOrElse { if (it is ClassNotFoundException) null else throw it }

    private companion object {
        const val LIVE_LITERAL_KT = "androidx.compose.runtime.internal.LiveLiteralKt"
    }
}
