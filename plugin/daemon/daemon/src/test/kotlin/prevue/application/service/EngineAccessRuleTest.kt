package prevue.application.service

import java.io.File
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

/**
 * 줄 밖에서 허용하는 엔진 접근은 파일별 허용 표(`EngineRule.outside`)가 정한다.
 * `Engine` 채널이 호출을 직렬화해 엔진의 일반 필드를 지킨다(D-74). 통합 테스트는 `Dispatchers.Default`에서 액터를 돌려도 통과한다.
 * status는 렌더가 멈춰도 답해야 한다. 구체 엔진(`RenderEngine`)은 조립(`RenderBindings`)만 쥔다.
 * 리소스 덧층(`ResourceValues`)은 렌더 스레드와 저장 사이에서 스냅숏(StateFlow)을 교체한다.
 * 이 검사는 철자를 센다 — 별칭(`val e = ports.engine`)이나 `with(engine)`은 못 본다.
 */
class EngineAccessRuleTest {
    private companion object {
        val files by lazy { prevue.daemon.Sources.daemon() }
    }

    @Test fun `application · 조립에서 엔진 포트를 쥐는 곳은 액터 · 프레임 루프 · status · 조립 시작뿐이다`() {
        assertTrue(files.size > 50, "본체를 못 찾았다 — 작업 디렉터리: ${File("").absolutePath}")
        assertEquals(
            listOf("StartDaemon.kt", "application/service/Engine.kt", "application/service/LiveLoop.kt", "application/service/Status.kt"),
            EngineRule.holders(files),
        )
    }

    @Test fun `줄 밖의 엔진 접근은 파일별 허용 표를 따른다`() {
        assertEquals(emptyList<String>(), EngineRule.outOfQueue(files))
    }

    @Test fun `구체 엔진은 조립만 쥐고 조립 때 읽는 것만 읽는다`() {
        assertEquals(listOf("infrastructure/bindings/RenderBindings.kt"), EngineRule.concreteHolders(files))
    }

    @Test fun `일부러 넣은 위반을 잡는다`() {
        val planted = mapOf(
            "application/service/A.kt" to "class A(private val r: PreviewRenderer) { fun a() = r.show(p) }\n",
            "B.kt" to "class B(private val r: PreviewRenderer)\n",
            "application/service/Status.kt" to "val s = engine.loaderGen + engine.codeChanged()\n",
            "StartDaemon.kt" to "renderer.protect { k }; renderer.buildChanged()\n",
            "infrastructure/bindings/RenderBindings.kt" to "val engine = RenderEngine(s, l, o)\nlog(engine.bootstrapMs); engine.codeChanged()\n",
            "infrastructure/bindings/RendererLoss.kt" to "engine.await().lost; engine.buildChanged()\n",
            "infrastructure/controller/http/Server.kt" to "// RenderEngine 은 액터가 쥔다\nclass Server(private val e: RenderEngine)\n",
        )
        assertEquals(listOf("B.kt", "application/service/A.kt"), EngineRule.holders(planted))
        assertEquals(
            listOf("application/service/Status.kt → codeChanged", "StartDaemon.kt → buildChanged", "infrastructure/bindings/RenderBindings.kt → codeChanged",
                "infrastructure/bindings/RendererLoss.kt → buildChanged"),
            EngineRule.outOfQueue(planted),
        )
        assertEquals(listOf("infrastructure/bindings/RenderBindings.kt", "infrastructure/controller/http/Server.kt"), EngineRule.concreteHolders(planted))
    }
}

object EngineRule {
    private val port = Regex("""\b(PreviewRenderer|LiveSessionFactory)\b""")
    private val observed = setOf("bootstrapMs", "loaderGen", "tasksOnLoader", "outDir", "outBytes", "outMaxBytes", "touchModeError")
    private val outside = mapOf(
        "application/service/Status.kt" to (Regex("""\bengine\.(\w+)""") to observed),
        "StartDaemon.kt" to (Regex("""\brenderer\.(\w+)""") to setOf("protect")),
        "infrastructure/bindings/RenderBindings.kt" to (Regex("""\bengine\.(\w+)""") to setOf("bootstrapMs", "negatives")),
        "infrastructure/bindings/RendererLoss.kt" to (Regex("""\bengine\.(\w+)""") to setOf("await")),
        "infrastructure/bindings/PortBindings.kt" to (Regex("""\bengine\.(\w+)""") to setOf("resources")),
    )
    private val concrete = Regex("""\bRenderEngine\b""")
    private fun code(text: String) = text.lineSequence().filterNot { it.trimStart().let { l -> l.startsWith("*") || l.startsWith("//") || l.startsWith("/*") } }

    fun concreteHolders(files: Map<String, String>): List<String> =
        files.filter { (path, text) -> !path.startsWith("infrastructure/render/") && code(text).any(concrete::containsMatchIn) }.keys.sorted()

    fun holders(files: Map<String, String>): List<String> =
        files.filter { (path, text) -> (path.startsWith("application/") || assembly(path)) && !path.startsWith("application/port/") && port.containsMatchIn(text) }.keys.sorted()

    private fun assembly(path: String) = prevue.daemon.Sources.PACKAGES.none { path.startsWith("$it/") }

    fun outOfQueue(files: Map<String, String>): List<String> = outside.flatMap { (path, rule) ->
        val (access, allowed) = rule
        access.findAll(files[path].orEmpty()).map { it.groupValues[1] }.filter { it !in allowed }.map { "$path → $it" }.toList()
    }
}
