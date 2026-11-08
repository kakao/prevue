package prevue.application.service

import java.io.File
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * 작업 공간의 상태를 쓰는 길(D-74) — 줄 안은 `exclusive`가 건네는 편집기뿐이고, 줄 밖은 이름 붙은 넷뿐이다.
 * 줄(공정 Mutex · `work` 지우기 · 저장 기다림)은 서비스 `Workspace`가 갖고, 저장소 포트(`WorkspaceStore`)는 그 한 곳만 쥔다 — 저장소를 바꿔 끼워도 줄이 빠지지 않는다.
 * 카드 쓰기 완료(`recordCard`) · 채우기 완료(`recordFill`) · 자세 한 장(`recordPosture`)은 줄을 서면 채우기에 밀려 굶고, 감시 스레드의 새 파일(`noteCreated`)은 같은 묶음의 저장보다 먼저 적혀야 한다.
 */
class WorkspaceWriteRuleTest {
    private val files = prevue.daemon.Sources.daemon()

    @Test fun `줄 밖의 쓰기는 카드 쓰기 완료 · 채우기 완료 · 자세 한 장 · 감시의 새 파일 넷뿐이다`() {
        assertTrue(files.size > 50, "본체를 못 찾았다 — 작업 디렉터리: ${File("").absolutePath}")
        assertEquals(
            listOf("application/service/Boards.kt → recordFill", "application/service/Boards.kt → recordCard",
                "application/service/Live.kt → recordPosture", "application/service/Watchers.kt → noteCreated"),
            WriteRule.outOfQueue(files),
        )
    }

    @Test fun `편집기는 Workspace만 만든다`() {
        assertEquals(emptyList<String>(), WriteRule.leaks(files))
    }

    @Test fun `저장소 포트는 Workspace만 쥔다`() {
        assertEquals(emptyList<String>(), WriteRule.storeHolders(files))
    }

    @Test fun `작업 공간과 편집기에 흩어진 가변 필드가 없다`() {
        val found = WriteRule.MAKERS.flatMap { path -> listOf("@Volatile", "AtomicReference", "internal set", "private set").filter { it in files.getValue(path) }.map { "$path → $it" } }
        assertEquals(emptyList<String>(), found)
    }

    @Test fun `일부러 넣은 위반을 잡는다`() {
        val planted = mapOf(
            "application/service/Workspace.kt" to "private val store: WorkspaceStore\nval ed = WorkspaceEditor(clock, store::edit)\n",
            "application/port/WorkspaceStore.kt" to "interface WorkspaceStore {\n",
            "application/service/A.kt" to "fun a() { ws.recordCard(1, 0, 0, r) }\n",
            "application/service/B.kt" to "fun b() { ws.noteCreated(c, d); ws.noteCreated(c, d) }\n",
            "application/service/C.kt" to "val ed = WorkspaceEditor (clock) { it }\n",
            "application/service/D.kt" to "class D(private val store: WorkspaceStore)\n",
        )
        assertEquals(listOf("application/service/A.kt → recordCard", "application/service/B.kt → noteCreated", "application/service/B.kt → noteCreated"), WriteRule.outOfQueue(planted))
        assertEquals(listOf("application/service/C.kt → WorkspaceEditor("), WriteRule.leaks(planted))
        assertEquals(listOf("application/service/D.kt → WorkspaceStore"), WriteRule.storeHolders(planted))
    }
}

object WriteRule {
    private val outside = Regex("""\.(recordCard|noteCreated|recordFill|recordPosture)\(""")
    private val EDITOR = Regex("""\bWorkspaceEditor\s*\(""")
    private val STORE = Regex("""\bWorkspaceStore\b""")
    val MAKERS = setOf("application/service/Workspace.kt")
    private val STORE_HOLDERS = MAKERS + "application/port/WorkspaceStore.kt"

    fun outOfQueue(files: Map<String, String>): List<String> =
        files.entries.sortedBy { it.key }.flatMap { (path, text) -> outside.findAll(text).map { "$path → ${it.groupValues[1]}" } }

    fun leaks(files: Map<String, String>): List<String> = files.flatMap { (path, text) ->
        if (path in MAKERS) emptyList() else listOfNotNull("WorkspaceEditor(".takeIf { EDITOR.containsMatchIn(text) }).map { "$path → $it" }
    }

    fun storeHolders(files: Map<String, String>): List<String> =
        files.entries.sortedBy { it.key }.filter { (path, text) -> path.startsWith("application/") && path !in STORE_HOLDERS && STORE.containsMatchIn(text) }
            .map { (path, _) -> "$path → WorkspaceStore" }
}
