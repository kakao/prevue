package prevue.daemon.adapter.browser

import java.io.File
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * 뷰어 Presenter는 도메인 사실의 사본을 들지 않는다 — 화면은 (Status, 뷰어 사정)의 순수 함수이고(`BrowserStates.build`),
 * Presenter가 따로 받아 적던 진행 · 마지막 결과 · 누가 언제 · 시간 재료는 작업 공간 상태에서 읽는다.
 */
class PresenterShapeTest {
    private val root = File("src/main/kotlin/prevue/daemon")
    private val presenter = File(root, "adapter/browser/BrowserPresenter.kt")

    @Test fun `Presenter의 가변 필드는 뷰어 사정뿐이다`() {
        assertTrue(presenter.isFile, "본체를 못 찾았다 — 작업 디렉터리: ${File("").absolutePath}")
        assertEquals(emptyList<String>(), Shape.copies(presenter.readText()))
    }

    @Test fun `BrowserMemo는 없다`() {
        val users = root.walkTopDown().filter { it.extension == "kt" && "BrowserMemo" in it.readText() }.map { it.name }.toList()
        assertEquals(emptyList<String>(), users)
    }

    @Test fun `일부러 넣은 사본을 잡는다`() {
        assertEquals(listOf("progress", "lastShown", "streaming"), Shape.copies("    private var progress: String? = null\n    private var lastShown: LastResult? = null\n    private var streaming = false\n"))
    }
}

object Shape {
    private val COPIES = setOf(
        "progress", "compiling", "cardRepair", "lastShown", "lastBy", "lastAt", "renderStamp",
        "coldMs", "cold", "boardFill", "lines", "frameStats", "lastFailureNote", "drawnAt", "streaming",
    )
    private val field = Regex("""^\s*private\s+var\s+(\w+)""", RegexOption.MULTILINE)

    fun copies(text: String): List<String> = field.findAll(text).map { it.groupValues[1] }.filter { it in COPIES }.toList()
}
