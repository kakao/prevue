package prevue.daemon.entity

import java.io.File
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class ScreenTextTest {
    private val sources = mapOf(
        "src/main/kotlin" to Regex("""(?:screenText|phrase)(?:OrNull)?\("([\w.]+)""""),
        "viewer" to Regex("""phrase\(['"]([\w.]+)['"]|data-t(?:-[\w-]+)?="([\w.]+)""""),
        "bin/prevue_prepare.py" to Regex("""say\("([\w.]+)"\)"""),
    )

    @Test fun `부르는 키가 모두 사전에 있다`() {
        val used = sources.flatMap { (dir, pattern) ->
            File(dir).walkTopDown().filter { it.isFile && it.extension in setOf("kt", "js", "html", "py") }.flatMap { f ->
                pattern.findAll(f.readText()).map { m -> m.groupValues.drop(1).first { it.isNotEmpty() } to f.path }
            }.toList()
        }
        assertEquals(true, used.size > 150, "부르는 곳을 못 찾았다 — 작업 디렉터리: ${File("").absolutePath}")
        assertEquals(emptyList<Pair<String, String>>(), used.filter { it.first !in SCREEN_TEXT })
    }

    @Test fun `자리표시는 한 번만 바꾼다 — 값 안의 중괄호는 그대로다`() {
        assertEquals("{line}.kt:3 — not in the index, so the full path is missing", phrase("point.unindexed", "file" to "{line}.kt", "line" to 3).text)
    }

    @Test fun `하나일 때는 덧꼴을 쓴다`() {
        assertEquals("1 preview", phrase("board.count", "n" to 1).text)
        assertEquals("2 previews", phrase("board.count", "n" to 2).text)
    }

    @Test fun `없는 키는 OrNull 이 null 이다`() {
        assertNull(phraseOrNull("failure.NOPE"))
    }
}
