package prevue.daemon

import java.io.File
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

class DaemonArgsTest {
    private val tools = arrayOf("--classpath", "/p/app-debug.json", "--layoutlib", "/l", "--compiler", "/c", "--bridge", "/b", "--viewer", "/v")

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

    // NFR-6 · D-195. 기본값을 바꾸면 기획의 숫자부터 고친다.
    @Test fun `유휴 종료는 기본 60분이고 --idle 은 분 단위로 m 을 붙여도 되며 0 이면 끈다`() {
        assertEquals(60, DaemonArgs.parse(tools).idleMinutes)
        assertEquals(5, DaemonArgs.parse(tools + arrayOf("--idle", "5")).idleMinutes)
        assertEquals(5, DaemonArgs.parse(tools + arrayOf("--idle", "5m")).idleMinutes)
        assertEquals(0, DaemonArgs.parse(tools + arrayOf("--idle", "0")).idleMinutes)
    }

    @Test fun `--idle 이 분 수가 아니면 사용법이다`() {
        for (v in listOf("abc", "-1", "5h", "1.5", "", "m", "9999999999")) {
            assertThrows<UsageException>(v) { DaemonArgs.parse(tools + arrayOf("--idle", v)) }
        }
        assertThrows<UsageException> { DaemonArgs.parse(tools + arrayOf("--idle")) }
    }

}
