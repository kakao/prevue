package prevue.application.service

import java.io.File
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * 안쪽(`application/service`)에서 Metro가 만드는 클래스는 모두 앱에 하나다. 범위가 없으면 주입하는 곳마다 따로 생겨,
 * 상태가 생기는 순간 조용히 갈린다 — `ResourcePatches`에서 `Main`이 채운 것과 `HotReload`가 읽는 것이 달랐다(PR 119).
 * 지금 상태가 없는 클래스도 예외로 두지 않는다 — 예외 목록은 상태가 생길 때 지울 것을 기억해야 하는 자리다.
 */
class ServiceScopeRuleTest {
    private val files = prevue.daemon.Sources.daemon()

    @Test fun `서비스 층에서 주입으로 만드는 클래스는 모두 SingleIn(AppScope)이다`() {
        assertTrue(files.size > 50, "본체를 못 찾았다 — 작업 디렉터리: ${File("").absolutePath}")
        assertTrue(ScopeRule.injected(files).size >= 7, "주입 클래스를 못 찾았다 — ${ScopeRule.injected(files)}")
        assertEquals(emptyList<String>(), ScopeRule.unscoped(files))
    }

    @Test fun `일부러 넣은 위반을 잡는다`() {
        val planted = mapOf(
            "application/service/A.kt" to "@Inject\nclass A(private val ws: Workspace)\n",
            "application/service/B.kt" to "internal class B @Inject internal constructor(x: X)\n",
            "application/service/C.kt" to "@SingleIn(AppScope::class)\n@Inject\nclass C(x: X)\n",
            "application/service/D.kt" to "@SingleIn(AppScope::class)\nclass D @Inject internal constructor(x: X)\n",
            "application/service/E.kt" to "class E(private val x: X)\n",
            "infrastructure/controller/F.kt" to "@Inject\nclass F(x: X)\n",
        )
        assertEquals(listOf("A", "B", "C", "D"), ScopeRule.injected(planted))
        assertEquals(listOf("application/service/A.kt → A", "application/service/B.kt → B"), ScopeRule.unscoped(planted))
    }
}

object ScopeRule {
    private const val LAYER = "application/service/"
    private val DECL = Regex("""((?:^@[^\n]*\n)*)^[^\n]*?\bclass\s+(\w+)([^\n]*)""", RegexOption.MULTILINE)

    private data class Decl(val path: String, val name: String, val injected: Boolean, val scoped: Boolean)

    private fun decls(files: Map<String, String>): List<Decl> =
        files.entries.filter { it.key.startsWith(LAYER) }.sortedBy { it.key }.flatMap { (path, text) ->
            DECL.findAll(text).map { m ->
                val head = m.groupValues[1] + m.groupValues[3]
                Decl(path, m.groupValues[2], "@Inject" in head, "@SingleIn(AppScope::class)" in m.groupValues[1])
            }.toList()
        }

    fun injected(files: Map<String, String>): List<String> = decls(files).filter { it.injected }.map { it.name }

    fun unscoped(files: Map<String, String>): List<String> =
        decls(files).filter { it.injected && !it.scoped }.map { "${it.path} → ${it.name}" }
}
