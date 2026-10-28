package prevue.daemon.adapter.render

import java.io.File
import java.nio.file.Files
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class PruneOutTest {
    private val root = Files.createTempDirectory("prevue-prune").toFile()

    @AfterEach fun tearDown() { root.deleteRecursively() }

    // ⑦ 의 절반. 화면급 트리 JSON 이 한 장에 8.6MB 라 상한이 없으면 세션 하나가 수십 MB 를 남긴다.
    @Test fun `산출물 상한은 오래 쓴 짝부터 지우고 keep 은 남긴다`() {
        val dir = File(root, "prune").apply { mkdirs() }
        fun pair(id: String, at: Long) = listOf("$id-0.png", "$id-0.viewinfo.json").forEach {
            File(dir, it).apply { writeBytes(ByteArray(100)); setLastModified(at) }
        }
        pair("old", 1_000_000)
        pair("kept", 2_000_000)                              // 가장 오래된 축이어도 화면에 있으면 남는다
        pair("mid", 3_000_000)
        pair("new", 4_000_000)
        File(dir, "kept-0.png").setLastModified(500_000)

        pruneOut(dir, maxBytes = 500, keep = { setOf("kept") })

        val left = dir.list()!!.map { it.substringBefore("-0.") }.toSet()
        assertEquals(setOf("kept", "new"), left)
        assertEquals(2, dir.list()!!.count { it.startsWith("new-0.") }, "짝이 반쪽만 남았다")
    }
}
