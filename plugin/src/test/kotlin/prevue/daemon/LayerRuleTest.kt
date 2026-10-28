package prevue.daemon

import java.io.File
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * 층 규칙(D-51 · D-83 · D-88) — import 는 `adapter → domain → entity`, 안쪽으로만 향한다. 본체의 import 를 훑어 규칙표와 대조한다.
 * 단일 모듈이라 컴파일러가 막아 주지 않는다. 이 표가 나중에 source set 으로 가를 때의 설계도다.
 * entity 에는 기술 어댑터와 domain 이 함께 보는 값만 둔다 — domain 과 입구만 보면 `domain/model` 이다.
 */
class LayerRuleTest {
    @Test fun `본체의 import 가 층 규칙을 지킨다`() {
        val root = File("src/main/kotlin/prevue/daemon")
        val files = root.walkTopDown().filter { it.extension == "kt" }
            .associate { it.relativeTo(root).invariantSeparatorsPath to it.readText() }
        assertEquals(true, files.size > 50, "본체를 못 찾았다 — 작업 디렉터리: ${File("").absolutePath}")
        assertEquals(emptyList<String>(), LayerRule.violations(files))
    }

    @Test fun `JSON 코덱은 본체를 모른다`() {
        val codec = File("src/main/kotlin/prevue/json").walkTopDown().filter { it.extension == "kt" }.toList()
        assertEquals(true, codec.isNotEmpty(), "코덱을 못 찾았다 — 작업 디렉터리: ${File("").absolutePath}")
        assertEquals(emptyList<String>(), codec.filter { "prevue.daemon" in it.readText() }.map { it.name })
    }

    @Test fun `일부러 넣은 위반을 잡는다`() {
        val files = mapOf(
            "entity/A.kt" to "package prevue.daemon.entity\nimport prevue.daemon.domain.model.Status\n",
            "domain/B.kt" to "package prevue.daemon.domain\nval x = prevue.daemon.adapter.render.RenderEngine::class\n",
            "domain/C.kt" to "package prevue.daemon.domain\nimport prevue.daemon.Json\n",
            "adapter/http/D.kt" to "package prevue.daemon.adapter.http\nimport prevue.daemon.adapter.cli.CliHandler\n",
            "adapter/cli/E.kt" to "package prevue.daemon.adapter.cli\nimport prevue.daemon.adapter.browser.BrowserState\n",
            "adapter/render/F.kt" to "package prevue.daemon.adapter.render\nimport prevue.daemon.adapter.http.Server\n",
            "adapter/browser/G.kt" to "package prevue.daemon.adapter.browser\nimport prevue.daemon.Main\n",
            // ① 입구는 기술 어댑터를 모른다.
            "adapter/http/P.kt" to "package prevue.daemon.adapter.http\nimport prevue.daemon.adapter.render.RenderEngine\n",
            // ② 기술 어댑터는 domain 중 port 만 안다.
            "adapter/render/Q.kt" to "package prevue.daemon.adapter.render\nimport prevue.daemon.domain.model.Status\n",
            "adapter/compile/Q2.kt" to "package prevue.daemon.adapter.compile\nimport prevue.daemon.domain.UseCases\n",
            // ③ runtime 은 유스케이스(domain 루트)를 모른다.
            "domain/runtime/R.kt" to "package prevue.daemon.domain.runtime\nimport prevue.daemon.domain.FillBoardUseCase\n",
            // ④ 입구는 runtime 을 모른다.
            "adapter/cli/S.kt" to "package prevue.daemon.adapter.cli\nimport prevue.daemon.domain.runtime.Workspace\n",
            // hotswap 은 다른 입구를 모른다.
            "adapter/hotswap/U.kt" to "package prevue.daemon.adapter.hotswap\nimport prevue.daemon.adapter.http.Server\n",
            // 뿌리(조립)는 아무도 모른다 — 코덱은 prevue.json 이다.
            "adapter/render/Y.kt" to "package prevue.daemon.adapter.render\nimport prevue.daemon.Json\n",
            "domain/Y2.kt" to "package prevue.daemon.domain\nimport prevue.json.Json\n",
            // 지켜진 것 — 잡히면 안 된다.
            "adapter/cli/H.kt" to "package prevue.daemon.adapter.cli\nimport prevue.daemon.adapter.http.mapper.toJson\nimport prevue.json.Json\nimport prevue.json.string\nimport prevue.daemon.entity.Picked\n",
            "domain/I.kt" to "package prevue.daemon.domain\nimport prevue.daemon.entity.PreviewSpec\nimport prevue.daemon.domain.port.Clock\nimport prevue.daemon.domain.runtime.Workspace\n",
            "domain/J.kt" to "package prevue.daemon.domain\nimport com.android.ide.common.rendering.api.RenderSession\n",
            "entity/K.kt" to "package prevue.daemon.entity\nimport kotlinx.serialization.Serializable\n",
            "domain/L.kt" to "package prevue.daemon.domain\nimport kotlin.math.abs\nimport kotlinx.coroutines.flow.Flow\nimport java.awt.image.BufferedImage\n",
            "domain/N.kt" to "package prevue.daemon.domain\nimport prevue.render.Shim\n",
            "domain/O.kt" to "package prevue.daemon.domain\nimport kotlin.math.abs\n\nclass O { val src = \"\"\"\nimport com.android.Foo\n\"\"\" }\n",
            "adapter/render/M.kt" to "package prevue.daemon.adapter.render\nimport com.android.ide.common.rendering.api.RenderSession\n",
            "adapter/render/V.kt" to "package prevue.daemon.adapter.render\nimport prevue.daemon.domain.port.Clock\nimport prevue.daemon.entity.PreviewSpec\nimport prevue.daemon.adapter.compile.HotCompiler\n",
            "domain/runtime/W.kt" to "package prevue.daemon.domain.runtime\nimport prevue.daemon.domain.policy.Pacing\nimport prevue.daemon.domain.model.Board\nimport prevue.daemon.domain.port.Clock\n",
            // entity 의 최상위 타입은 기술 어댑터가 본다 — Picked 는 입구(cli)만, Lonely 는 아무도 안 본다. 중첩 타입은 따지지 않는다.
            "entity/PreviewSpec.kt" to "package prevue.daemon.entity\ndata class PreviewSpec(val id: String, val part: Part) {\n    data class Nested(val x: Int)\n}\n\ndata class Part(val n: Int)\n",
            "entity/Px.kt" to "package prevue.daemon.entity\n@JvmInline value class Px(val v: Int)\n",
            "entity/Picked.kt" to "package prevue.daemon.entity\ndata class Picked(val id: String)\n",
            "entity/Lonely.kt" to "package prevue.daemon.entity\nsealed interface Lonely\n",
            "adapter/hotswap/X.kt" to "package prevue.daemon.adapter.hotswap\nimport prevue.daemon.domain.UseCases\nimport prevue.daemon.domain.model.ReloadResult\nimport prevue.daemon.domain.port.SourceChange\n",
        )
        assertEquals(
            listOf("entity/A.kt", "domain/B.kt", "domain/C.kt", "adapter/http/D.kt", "adapter/cli/E.kt", "adapter/render/F.kt", "adapter/browser/G.kt",
                "adapter/http/P.kt", "adapter/render/Q.kt", "adapter/compile/Q2.kt", "domain/runtime/R.kt", "adapter/cli/S.kt", "adapter/hotswap/U.kt", "adapter/render/Y.kt",
                "domain/Y2.kt", "domain/J.kt", "entity/K.kt", "domain/N.kt",
                "entity/Px.kt", "entity/Picked.kt", "entity/Lonely.kt").sorted(),
            LayerRule.violations(files).map { it.substringBefore(" ") }.sorted())
    }
}

/** 파일 위치(층)와 그 파일이 가리키는 `prevue.daemon.*` 를 대조한다. */
object LayerRule {
    /** 유스케이스를 부르는 쪽. cli 와 browser 는 http 만 알고, http 와 hotswap 은 다른 입구를 모른다. 기술 어댑터는 입구를 모른다. */
    private val ENTRY_POINTS = setOf("http", "cli", "browser", "hotswap")
    /** domain 루트(유스케이스) 밖의 하위 패키지. */
    private val DOMAIN_PARTS = setOf("runtime", "policy", "model", "port")

    private val ref = Regex("""\bprevue\.daemon\.([A-Za-z_][\w.]*)""")
    private val CORE = setOf("entity", "domain")
    private val CORE_EXTERNAL = listOf("prevue.daemon.", "kotlin.", "kotlinx.coroutines.", "java.")

    fun violations(files: Map<String, String>): List<String> = files.flatMap { (path, text) ->
        val from = path.split('/')
        text.lineSequence().filterNot { it.startsWith("package ") }
            .flatMap { line -> ref.findAll(line).map { it.groupValues[1] } }
            .filterNot { allowed(from, it.split('.')) }
            .map { "$path → prevue.daemon.$it" }
            .distinct().toList()
    } + files.flatMap { (path, text) -> externalImports(path, text) } + unseenEntities(files)

    private val topLevelType = Regex("""^(?:@\w+(?:\([^)]*\))?\s+)*(?:[a-z]+\s+)*(?:class|interface|object|typealias)\s+(\w+)""", RegexOption.MULTILINE)

    private fun unseenEntities(files: Map<String, String>): List<String> {
        val technical = files.filterKeys { p -> p.split('/').let { it.size > 2 && it[0] == "adapter" && it[1] !in ENTRY_POINTS } }.values
        val entities = files.filterKeys { it.startsWith("entity/") }
        val entityText = entities.values.joinToString("\n")
        return entities.flatMap { (path, text) ->
            topLevelType.findAll(text).map { it.groupValues[1] }
                .filterNot { name ->
                    val word = Regex("""\b$name\b""")
                    technical.any(word::containsMatchIn) || word.findAll(entityText).count() > 1
                }
                .map { "$path → $it 는 기술 어댑터가 보지 않는다 — domain/model 로" }.toList()
        }
    }

    private fun externalImports(path: String, text: String): List<String> {
        if (path.substringBefore('/') !in CORE) return emptyList()
        return text.lineSequence().map { it.trim() }
            .takeWhile { it.isEmpty() || it.startsWith("package ") || it.startsWith("import ") || it.startsWith("@file:") || it.startsWith("//") }
            .filter { it.startsWith("import ") }
            .map { it.removePrefix("import ").substringBefore(" as ").trim() }
            .filterNot { name -> CORE_EXTERNAL.any(name::startsWith) }
            .map { "$path → $it" }.toList()
    }

    private fun allowed(from: List<String>, to: List<String>): Boolean {
        val target = to.first()
        return when (from.first()) {
            "entity" -> target == "entity"
            "domain" -> target == "entity" || target == "domain" && !(from[1] == "runtime" && to.getOrNull(1) !in DOMAIN_PARTS)
            "adapter" -> when (target) {
                "entity" -> true
                "domain" -> domainAllowed(from[1], to.getOrNull(1))
                "adapter" -> adapterAllowed(from[1], to.getOrNull(1))
                else -> false
            }
            else -> true   // 뿌리 — 조립 · 수명
        }
    }

    private fun domainAllowed(adapter: String, part: String?): Boolean =
        if (adapter in ENTRY_POINTS) part != "runtime" else part == "port"

    private fun adapterAllowed(from: String, to: String?): Boolean = when {
        to == null || to == from -> true
        from in ENTRY_POINTS -> to == "http" && from in setOf("cli", "browser")
        else -> to !in ENTRY_POINTS
    }
}
