package prevue.daemon

import java.io.File
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

class DaemonArgsTest {
    private val tools = arrayOf("--classpath", "/p/app-debug.json", "--layoutlib", "/l", "--compiler", "/c", "--bridge", "/b", "--viewer", "/v")

    @Test fun `필수 경로만 주면 감시 · 미리 올리기는 켜지고 포트는 기본값이다`() {
        val a = DaemonArgs.parse(tools)
        assertEquals(File("/p/app-debug.json"), a.classpath)
        assertEquals(DaemonArgs.DEFAULT_PORT, a.port)
        assertTrue(a.watching)
        assertTrue(a.preload)
        assertEquals(emptyList<File>(), a.extraWatch)
        assertNull(a.show)
        assertNull(a.resourcesFrom)
    }

    @Test fun `값 없는 플래그는 다음 인자를 먹지 않는다`() {
        val a = DaemonArgs.parse(arrayOf("--no-watch", "--no-preload") + tools + arrayOf("--show", "/r/A.kt#2", "--port", "8901"))
        assertFalse(a.watching)
        assertFalse(a.preload)
        assertEquals("/r/A.kt#2", a.show)
        assertEquals(8901, a.port)
    }

    @Test fun `감시 디렉터리는 여러 번 줄 수 있고 다른 인자는 마지막 값이 이긴다`() {
        val a = DaemonArgs.parse(tools + arrayOf("--watch", "/x", "--root", "/a", "--watch", "/y", "--root", "/b"))
        assertEquals(listOf(File("/x"), File("/y")), a.extraWatch)
        assertEquals("/b", a.root)
    }

    @Test fun `필수 인자가 빠지거나 값이 없거나 -- 로 시작하지 않으면 사용법이다`() {
        assertThrows<UsageException> { DaemonArgs.parse(tools.copyOfRange(0, 8)) }
        assertThrows<UsageException> { DaemonArgs.parse(tools + arrayOf("--show")) }
        assertThrows<UsageException> { DaemonArgs.parse(tools + arrayOf("stray")) }
    }

}
