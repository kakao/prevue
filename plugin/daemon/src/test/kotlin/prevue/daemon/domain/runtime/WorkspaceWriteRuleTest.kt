package prevue.daemon.domain.runtime

import java.io.File
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * 작업 공간의 상태를 쓰는 길(D-74) — 줄 안은 `exclusive`가 건네는 편집기뿐이고, 줄 밖은 이름 붙은 셋뿐이다.
 * 카드 쓰기 완료(`recordCard`) · 채우기 완료(`recordFill`)는 줄을 서면 채우기에 밀려 굶고, 감시 스레드의 새 파일(`noteCreated`)은 같은 묶음의 저장보다 먼저 적혀야 한다.
 */
class WorkspaceWriteRuleTest {
    private val root = File("src/main/kotlin/prevue/daemon")
    private val files = root.walkTopDown().filter { it.extension == "kt" }
        .associate { it.relativeTo(root).invariantSeparatorsPath to it.readText() }

    @Test fun `줄 밖의 쓰기는 카드 쓰기 완료 · 채우기 완료 · 감시의 새 파일 셋뿐이다`() {
        assertTrue(files.size > 50, "본체를 못 찾았다 — 작업 디렉터리: ${File("").absolutePath}")
        assertEquals(
            listOf("domain/DrawCardUseCase.kt → recordCard", "domain/FillBoardUseCase.kt → recordFill", "domain/ObserveSourceChangesUseCase.kt → noteCreated"),
            WriteRule.outOfQueue(files),
        )
    }

    @Test fun `편집기는 Workspace만 만든다`() {
        assertEquals(emptyList<String>(), WriteRule.leaks(files))
    }

    @Test fun `Workspace에 흩어진 가변 필드가 없다`() {
        val ws = files.getValue("domain/runtime/Workspace.kt")
        assertEquals(emptyList<String>(), listOf("@Volatile", "AtomicReference", "internal set", "private set").filter { it in ws })
    }

    @Test fun `일부러 넣은 위반을 잡는다`() {
        val planted = mapOf(
            "domain/runtime/Workspace.kt" to "private val _state = MutableStateFlow(WorkspaceState())\nval ed = WorkspaceEditor(clock) { f -> _state.updateAndGet(f) }\n",
            "domain/A.kt" to "fun a() { ws.recordCard(1, 0, 0, r) }\n",
            "domain/B.kt" to "fun b() { ws.noteCreated(c, d); ws.noteCreated(c, d) }\n",
            "domain/C.kt" to "val ed = WorkspaceEditor(clock) { it }\n",
        )
        assertEquals(listOf("domain/A.kt → recordCard", "domain/B.kt → noteCreated", "domain/B.kt → noteCreated"), WriteRule.outOfQueue(planted))
        assertEquals(listOf("domain/C.kt → WorkspaceEditor("), WriteRule.leaks(planted))
    }
}

object WriteRule {
    private val outside = Regex("""\.(recordCard|noteCreated|recordFill)\(""")
    private const val EDITOR = "WorkspaceEditor("

    fun outOfQueue(files: Map<String, String>): List<String> =
        files.entries.sortedBy { it.key }.flatMap { (path, text) -> outside.findAll(text).map { "$path → ${it.groupValues[1]}" } }

    fun leaks(files: Map<String, String>): List<String> = files.flatMap { (path, text) ->
        if (path == "domain/runtime/Workspace.kt") emptyList() else listOfNotNull(EDITOR.takeIf { it in text }).map { "$path → $it" }
    }
}
