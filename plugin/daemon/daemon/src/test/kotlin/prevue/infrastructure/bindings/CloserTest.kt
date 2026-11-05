package prevue.infrastructure.bindings

import java.util.concurrent.CopyOnWriteArrayList
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test

class CloserTest {
    private class Named(private val name: String, private val events: MutableList<String>, private val fails: Boolean = false) : AutoCloseable {
        override fun close() { events += name; if (fails) error("$name 실패") }
    }

    private class Compiler(events: MutableList<String>) : AutoCloseable by Named("compiler", events)
    private class Engine(events: MutableList<String>) : AutoCloseable by Named("engine", events)

    @Test fun `등록 역순으로 한 번만 닫고 닫은 차례를 남긴다`() {
        val events = CopyOnWriteArrayList<String>()
        val logs = CopyOnWriteArrayList<String>()
        val closer = Closer { logs += it }
        closer.own(Compiler(events))
        closer.own(Engine(events))
        closer.close()
        closer.close()
        assertEquals(listOf("engine", "compiler"), events)
        assertEquals(listOf("닫음: Engine → Compiler"), logs)
    }

    @Test fun `하나가 실패해도 나머지를 닫는다`() {
        val events = CopyOnWriteArrayList<String>()
        val logs = CopyOnWriteArrayList<String>()
        val closer = Closer { logs += it }
        closer.own(Compiler(events))
        closer.own(Named("engine", events, fails = true))
        closer.close()
        assertEquals(listOf("engine", "compiler"), events)
        assertEquals(listOf("Named 정리 실패: java.lang.IllegalStateException: engine 실패", "닫음: Compiler"), logs)
    }

    @Test fun `닫은 뒤에 받은 자원은 바로 닫고 거절한다`() {
        val events = CopyOnWriteArrayList<String>()
        val closer = Closer {}
        closer.close()
        assertThrows(IllegalStateException::class.java) { closer.own(Compiler(events)) }
        assertEquals(listOf("compiler"), events)
    }
}
