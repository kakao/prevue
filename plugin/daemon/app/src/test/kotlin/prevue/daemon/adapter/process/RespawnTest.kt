package prevue.daemon.adapter.process

import java.io.File
import java.nio.file.Files
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class RespawnTest {
    private val dir = Files.createTempDirectory("prevue-respawn").toFile()
    private val hang = File(dir, "Hang.kt").apply { writeText("") }
    private val screen = File(dir, "Screen.kt").apply { writeText("") }
    private val base = listOf("--classpath", "a.json", "--port", "8791")

    // D-127 — 학습은 처음 띄운 JVM 하나가 맡는다. 물려받으면 끝나 가는 옛 JVM과 같은 캐시 파일에 겹쳐 쓴다
    @Test fun `다시 띄울 때 AOT 학습 플래그는 물려주지 않고 캐시 사용은 물려준다`() {
        val input = listOf("-Xmx3g", "-XX:AOTCacheOutput=/a/k.aot.tmp", "-XX:AOTCache=/a/k.aot", "-XX:-AOTClassLinking")
        assertEquals(listOf("-Xmx3g", "-XX:AOTCache=/a/k.aot", "-XX:-AOTClassLinking"), Respawn.jvmArgs(input))
    }

    @Test fun `지금 보드로 다시 연다`() {
        assertEquals(base + listOf("--show", screen.path), Respawn.args(base + listOf("--show", hang.path), screen, hang))
    }

    // 잃게 한 파일을 다시 열면 뜨자마자 또 잃는다.
    @Test fun `잃게 한 파일은 다시 열지 않는다`() {
        assertEquals(base + listOf("--show", screen.path + "#2"), Respawn.args(base + listOf("--show", screen.path + "#2"), hang, hang))
        assertEquals(base, Respawn.args(base + listOf("--show", hang.path), hang, hang))
        assertEquals(base, Respawn.args(base, null, hang))
    }

    @Test fun `1분 안에 또 잃으면 다시 띄우지 않는다`() {
        assertTrue(Respawn.allowed(emptyMap(), 1_000_000))
        assertFalse(Respawn.allowed(mapOf("PREVUE_RESPAWNED_AT" to "990000"), 1_000_000))
        assertTrue(Respawn.allowed(mapOf("PREVUE_RESPAWNED_AT" to "900000"), 1_000_000))
    }
}
