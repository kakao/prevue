package prevue.adapter.infra

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.getAndUpdate

public class Closer(private val log: (String) -> Unit) : AutoCloseable {
    private class Owned(val resources: List<AutoCloseable> = emptyList(), val closing: Boolean = false)

    private val owned = MutableStateFlow(Owned())

    public fun <T : AutoCloseable> own(resource: T): T {
        val before = owned.getAndUpdate { if (it.closing) it else Owned(it.resources + resource) }
        if (!before.closing) return resource
        try { resource.close() } finally { error("닫는 중에는 자원을 받지 않는다") }
    }

    override fun close() {
        val resources = owned.getAndUpdate { Owned(closing = true) }.resources
        val closed = resources.asReversed().mapNotNull { resource ->
            val name = resource.javaClass.simpleName
            try { resource.close(); name } catch (e: Throwable) { log("$name 정리 실패: $e"); null }
        }
        if (closed.isNotEmpty()) log("닫음: ${closed.joinToString(" → ")}")
    }
}
