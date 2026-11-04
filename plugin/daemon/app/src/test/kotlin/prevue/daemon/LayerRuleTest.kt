package prevue.daemon

import java.io.File
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * 층 규칙(D-51 · D-83 · D-88 · D-139) — import 는 `adapter → domain → entity`, 안쪽으로만 향한다. 본체의 import 를 훑어 규칙표와 대조한다.
 * 층 사이와 입구 ↔ 기술 어댑터는 모듈(`:entity` · `:domain` · `:adapter:entry` · `:adapter:infra`, D-141)이 컴파일 때 막는다 — 패키지가 제 모듈에 있어야 그렇다.
 * 이 표는 모듈이 못 막는 것 — 입구 안(cli · browser → http만, hotswap 은 다른 입구를 모른다) · 기술 어댑터는 domain 중 port 만 · runtime 의 규칙과
 * core 의 JDK 금지(AWT · 파일 시스템) · 조립(:app)은 adapter 중 조립 면(entry · infra)만 안다(구현 타입은 그래프가 잇는다) — 를 지킨다. 입구 ↔ 기술 어댑터 칸도 남겨 둔다 — 패키지를 다른 모듈로 옮겼을 때 모듈과 표가 어긋나면 여기서 드러난다.
 * entity 에는 기술 어댑터와 domain 이 함께 보는 값만 둔다 — domain 과 입구만 보면 `domain/model` 이다.
 */
class LayerRuleTest {
    @Test fun `본체의 import 가 층 규칙을 지킨다`() {
        val files = Sources.daemon()
        val where = "작업 디렉터리: ${File("").absolutePath}"
        // 거르기가 어긋나면 층 하나가 통째로 빠진다 — 층마다 있는지와 전체의 바닥(150, 옮길 때 166개)을 함께 본다.
        val counts = files.keys.groupingBy { it.substringBefore('/').takeIf { k -> k in Sources.LAYERS } ?: "daemon" }.eachCount()
        assertEquals((Sources.LAYERS + "daemon").toSet(), counts.keys, "본체의 층을 다 못 찾았다 — $counts · $where")
        assertEquals(true, files.size >= 150, "본체를 못 찾았다(${files.size}) — $where")
        assertEquals(emptyList<String>(), LayerRule.violations(files))
    }

    @Test fun `adapter 패키지는 역할의 모듈에 있다`() {
        fun packages(module: String) = Sources.under(listOf(File(module, "src/main/kotlin")), "kt").keys
            .map { it.removePrefix("prevue/adapter/").substringBefore('/') }.toSet()
        val entry = packages("../adapter/entry")
        val infra = packages("../adapter/infra")
        assertEquals(LayerRule.ENTRY_POINTS, entry, "입구 모듈에 입구 아닌 패키지가 있거나 입구가 빠졌다 — 작업 디렉터리: ${File("").absolutePath}")
        assertEquals(true, infra.isNotEmpty(), "기술 어댑터 모듈을 못 찾았다 — 작업 디렉터리: ${File("").absolutePath}")
        assertEquals(emptySet<String>(), infra intersect LayerRule.ENTRY_POINTS, "입구 패키지가 기술 어댑터 모듈에 있다 — 렌더러를 볼 수 있게 된다")
    }

    @Test fun `JSON 코덱은 본체를 모른다`() {
        val codec = Sources.under(Sources.kotlinRoots, "kt").filterKeys { it.startsWith("prevue/json/") }
        assertEquals(true, codec.isNotEmpty(), "코덱을 못 찾았다 — 작업 디렉터리: ${File("").absolutePath}")
        assertEquals(emptyList<String>(), codec.filterValues(LayerRule::mentionsDaemon).keys.toList())
        val planted = listOf("package prevue.json\nimport prevue.entity.Px\n", "package prevue.json\nval d = prevue.daemon.Main\n", "package prevue.json\nimport kotlin.math.abs\n")
        assertEquals(listOf(true, true, false), planted.map(LayerRule::mentionsDaemon))
    }

    @Test fun `일부러 넣은 위반을 잡는다`() {
        val files = mapOf(
            "entity/A.kt" to "package prevue.entity\nimport prevue.domain.model.Status\n",
            "domain/B.kt" to "package prevue.domain\nval x = prevue.adapter.render.RenderEngine::class\n",
            "domain/C.kt" to "package prevue.domain\nimport prevue.daemon.Json\n",
            "adapter/http/D.kt" to "package prevue.adapter.http\nimport prevue.adapter.cli.CliHandler\n",
            "adapter/cli/E.kt" to "package prevue.adapter.cli\nimport prevue.adapter.browser.BrowserState\n",
            "adapter/render/F.kt" to "package prevue.adapter.render\nimport prevue.adapter.http.Server\n",
            "adapter/browser/G.kt" to "package prevue.adapter.browser\nimport prevue.daemon.Main\n",
            // ① 입구는 기술 어댑터를 모른다.
            "adapter/entry/P2.kt" to "package prevue.adapter.entry\nimport prevue.adapter.render.RenderEngine\n",
            "adapter/entry/P3.kt" to "package prevue.adapter.entry\nimport prevue.domain.runtime.Workspace\n",
            "adapter/cli/P4.kt" to "package prevue.adapter.cli\nimport prevue.adapter.entry.EntryPoints\n",
            "adapter/http/P.kt" to "package prevue.adapter.http\nimport prevue.adapter.render.RenderEngine\n",
            // ② 기술 어댑터는 domain 중 port 만 안다.
            "adapter/render/Q.kt" to "package prevue.adapter.render\nimport prevue.domain.model.Status\n",
            "adapter/compile/Q2.kt" to "package prevue.adapter.compile\nimport prevue.domain.UseCases\n",
            // ③ runtime 은 유스케이스(domain 루트)를 모른다.
            "domain/runtime/R.kt" to "package prevue.domain.runtime\nimport prevue.domain.FillBoardUseCase\n",
            // ④ 입구는 runtime 을 모른다.
            "adapter/cli/S.kt" to "package prevue.adapter.cli\nimport prevue.domain.runtime.Workspace\n",
            // hotswap 은 다른 입구를 모른다.
            "adapter/hotswap/U.kt" to "package prevue.adapter.hotswap\nimport prevue.adapter.http.Server\n",
            // 뿌리(조립)는 아무도 모른다 — 코덱은 prevue.json 이다.
            "adapter/render/Y.kt" to "package prevue.adapter.render\nimport prevue.daemon.Json\n",
            "domain/Y2.kt" to "package prevue.domain\nimport prevue.json.Json\n",
            // D-139. core 는 파일 시스템을 직접 만지지 않는다.
            "domain/runtime/Z.kt" to "package prevue.domain.runtime\nclass Z { fun a(f: java.io.File) = f.readText() }\n",
            "entity/Z2.kt" to "package prevue.entity\nval Z2 = java.io.File(\"res\").listFiles { f -> f.isDirectory }\n",
            "domain/Z3.kt" to "package prevue.domain\nclass Z3 { fun a(f: java.io.File) = f.lastModified() }\n",
            // 지켜진 것 — 잡히면 안 된다.
            "adapter/entry/H2.kt" to "package prevue.adapter.entry\nimport prevue.domain.UseCases\nimport prevue.adapter.http.Server\nimport prevue.adapter.cli.CliHandler\nimport prevue.adapter.browser.BrowserPresenter\nimport prevue.adapter.hotswap.HotSwapRunner\n",
            "adapter/cli/H.kt" to "package prevue.adapter.cli\nimport prevue.adapter.http.mapper.toJson\nimport prevue.json.Json\nimport prevue.json.string\nimport prevue.entity.Picked\n",
            "domain/I.kt" to "package prevue.domain\nimport prevue.entity.PreviewSpec\nimport prevue.domain.port.Clock\nimport prevue.domain.runtime.Workspace\n",
            "domain/J.kt" to "package prevue.domain\nimport com.android.ide.common.rendering.api.RenderSession\n",
            "entity/K.kt" to "package prevue.entity\nimport kotlinx.serialization.Serializable\n",
            "domain/L.kt" to "package prevue.domain\nimport kotlin.math.abs\nimport kotlinx.coroutines.flow.Flow\nimport java.io.File\n",
            "domain/L3.kt" to "package prevue.domain\nimport dev.zacsweers.metro.Inject\nimport dev.zacsweers.metro.SingleIn\n",
            "domain/N.kt" to "package prevue.domain\nimport prevue.render.Shim\n",
            "domain/O2.kt" to "package prevue.domain\nval o2 = \"com.acme.prevue.adapter.render.X\"\n",
            "domain/O.kt" to "package prevue.domain\nimport kotlin.math.abs\n\nclass O { val src = \"\"\"\nimport com.android.Foo\n\"\"\" }\n",
            "adapter/render/M.kt" to "package prevue.adapter.render\nimport com.android.ide.common.rendering.api.RenderSession\n",
            "adapter/render/V.kt" to "package prevue.adapter.render\nimport prevue.domain.port.Clock\nimport prevue.entity.PreviewSpec\nimport prevue.adapter.compile.HotCompiler\n",
            "domain/Z5.kt" to "package prevue.domain\nfun z5(fs: List<java.io.File>) = fs.filter(java.io.File::isFile)\n",
            "domain/L2.kt" to "package prevue.domain\nimport java.awt.image.BufferedImage\n",
            "domain/Z6.kt" to "package prevue.domain\nclass Z6(val img: java.awt.image.BufferedImage)\n",
            "domain/Z7.kt" to "package prevue.domain\nimport java.nio.file.Files\nfun z7() = Files.size(null)\n",
            "entity/Z8.kt" to "package prevue.entity\nfun z8(f: java.io.File) = java.io.FileReader(f).use { it.read() } + f.length().toInt()\n",
            "domain/Z9.kt" to "package prevue.domain\nfun z9(f: java.io.File) = \"내용 \${f.readText()}\"\n",
            "domain/Z10.kt" to "package prevue.domain\nfun z10(c: Char, f: java.io.File) = if (c == '\"') f.delete() else false\n",
            "domain/Z4.kt" to "package prevue.domain\nclass Z4(private val s: prevue.domain.port.SourceFileRepository) {\n    // f.readText() 는 포트로 간다\n    val key = \"tabs.delete\" // f.exists() 는 쓰지 않는다\n    val quote = '\"'\n    fun say(t: String) = \"\${t.length} 글자 — f.readText() 아님\"\n    fun n(t: String) = t.length + StringBuilder(t).apply { setLength(0) }.length\n    fun a(f: java.io.File) = s.has(f) && f.canonicalPath.isNotEmpty() && s.read(f) != null\n}\n",
            "domain/runtime/W.kt" to "package prevue.domain.runtime\nimport prevue.domain.policy.Pacing\nimport prevue.domain.model.Board\nimport prevue.domain.port.Clock\n",
            // entity 의 최상위 타입은 기술 어댑터가 본다 — Picked 는 입구(cli)만, Lonely 는 아무도 안 본다. 중첩 타입은 따지지 않는다.
            "entity/PreviewSpec.kt" to "package prevue.entity\ndata class PreviewSpec(val id: String, val part: Part) {\n    data class Nested(val x: Int)\n}\n\ndata class Part(val n: Int)\n",
            "entity/Px.kt" to "package prevue.entity\n@JvmInline value class Px(val v: Int)\n",
            "entity/Picked.kt" to "package prevue.entity\ndata class Picked(val id: String)\n",
            "entity/Lonely.kt" to "package prevue.entity\nsealed interface Lonely\n",
            "adapter/hotswap/X.kt" to "package prevue.adapter.hotswap\nimport prevue.domain.UseCases\nimport prevue.domain.model.ReloadResult\nimport prevue.domain.port.SourceChange\n",
            // 조립은 구현 타입을 모른다 — 공개여도(ProcessMemory) 그래프가 잇는다.
            "Wiring.kt" to "package prevue.daemon\nimport prevue.adapter.process.ProcessMemory\n",
            "Graph.kt" to "package prevue.daemon\nimport prevue.adapter.infra.Closer\nimport prevue.adapter.entry.EntryPoints\nimport prevue.domain.UseCases\nimport prevue.entity.ModuleInfo\n",
        )
        assertEquals(
            listOf("entity/A.kt", "domain/B.kt", "domain/C.kt", "adapter/http/D.kt", "adapter/cli/E.kt", "adapter/render/F.kt", "adapter/browser/G.kt",
                "adapter/entry/P2.kt", "adapter/entry/P3.kt", "adapter/cli/P4.kt", "adapter/http/P.kt", "adapter/render/Q.kt", "adapter/compile/Q2.kt", "domain/runtime/R.kt", "adapter/cli/S.kt", "adapter/hotswap/U.kt", "adapter/render/Y.kt",
                "domain/Y2.kt", "domain/L2.kt", "domain/Z6.kt", "domain/Z7.kt", "entity/Z8.kt", "domain/Z9.kt", "domain/Z10.kt", "domain/J.kt", "entity/K.kt", "domain/N.kt", "domain/runtime/Z.kt", "entity/Z2.kt", "domain/Z3.kt", "domain/Z5.kt",
                "entity/Px.kt", "entity/Picked.kt", "entity/Lonely.kt", "Wiring.kt").sorted(),
            LayerRule.violations(files).map { it.substringBefore(" ") }.sorted())
    }
}

/** 파일 위치(층)와 그 파일이 가리키는 데몬 패키지(`prevue.entity` · `prevue.domain` · `prevue.adapter` 와 조립 `prevue.daemon`)를 대조한다. */
object LayerRule {
    /** 유스케이스를 부르는 쪽. cli 와 browser 는 http 만 알고, http 와 hotswap 은 다른 입구를 모른다. 기술 어댑터는 입구를 모른다. */
    val ENTRY_POINTS = setOf("http", "cli", "browser", "hotswap", "entry")
    /** 조립이 adapter 에서 아는 곳 — 입구 묶음과 기술 어댑터의 바인딩 · 설정. 구현 패키지는 그래프가 잇는다. */
    private val ASSEMBLY_FACES = setOf("entry", "infra")
    /** domain 루트(유스케이스) 밖의 하위 패키지. */
    private val DOMAIN_PARTS = setOf("runtime", "policy", "model", "port")

    private val DAEMON_PACKAGES = Sources.LAYERS + "daemon"
    /** 앞이 글자나 점이면 남의 FQN(`com.acme.prevue.domain…`)이다 — 우리 패키지로 세지 않는다. */
    private val ref = Regex("""(?<![\w.])prevue\.((?:${DAEMON_PACKAGES.joinToString("|")})\.[\w.]*)""")
    private val CORE = setOf("entity", "domain")
    /** 데몬 패키지는 위 ref 규칙이 가린다 — 여기서는 통과시켜 한 위반을 두 번 세지 않는다. 코덱(`prevue.json`) · 셈(`prevue.render`)은 core 밖이다. */
    private val CORE_EXTERNAL = DAEMON_PACKAGES.map { "prevue.$it." } + listOf("kotlin.", "kotlinx.coroutines.", "java.", "dev.zacsweers.metro.")

    fun mentionsDaemon(text: String): Boolean = text.lineSequence().filterNot { it.startsWith("package ") }.any(ref::containsMatchIn)
    /** D-139. 그림은 entity `Bitmap` 값으로 든다 — AWT 는 render · browser 어댑터만 안다. 파일 시스템 API 의 다른 길(nio · kotlin.io.path)도 core 밖이다. */
    private val CORE_FORBIDDEN = listOf("java.awt.", "javax.", "java.nio.file.", "kotlin.io.path.")

    fun violations(files: Map<String, String>): List<String> = files.flatMap { (path, text) ->
        val from = path.split('/')
        text.lineSequence().filterNot { it.startsWith("package ") }
            .flatMap { line -> ref.findAll(line).map { it.groupValues[1] } }
            .filterNot { allowed(from, it.split('.')) }
            .map { "$path → prevue.$it" }
            .distinct().toList()
    } + files.flatMap { (path, text) -> externalImports(path, text) } + files.flatMap { (path, text) -> fileSystemCalls(path, text) } + unseenEntities(files)

    /** D-139. core 는 파일 시스템을 직접 만지지 않는다 — 읽기 · 시각 · 목록은 SourceFileRepository, 산출물 지우기는 PreviewRenderer 다. `File` 을 경로 값으로 드는 것과 canonicalPath(키 정규화)는 된다. */
    private val fileSystemCall = Regex(
        """(?:\.|::)(readText|readLines|readBytes|writeText|writeBytes|appendText|lastModified|setLastModified|isFile|isDirectory|exists|delete|deleteRecursively|listFiles|walk\w*|mkdirs?|createNewFile|renameTo|copyTo|bufferedReader|inputStream|outputStream|forEachLine|useLines|length(?=\(\)))\b""" +
            """|\b(FileInputStream|FileOutputStream|FileReader|FileWriter|RandomAccessFile)\s*\(""")
    private val stringLiteral = Regex(""""(?:\\.|[^"\\])*"""")
    private val charLiteral = Regex("""'(?:\\.|[^'\\])'""")
    private val template = Regex("""\$\{([^{}]*)}""")

    /** 주석 줄 · 줄 끝 주석 · 문자 · 문자열 안의 철자는 호출이 아니다. 문자열 템플릿의 `${...}` 식은 코드다. */
    private fun codeLines(text: String): Sequence<String> = text.lineSequence().map { it.trim() }
        .filterNot { it.startsWith("//") || it.startsWith("*") || it.startsWith("/*") }
        .map { line ->
            stringLiteral.replace(charLiteral.replace(line, "' '")) { m -> template.findAll(m.value).joinToString(" ", "(", ")") { it.groupValues[1] } }
                .substringBefore("//")
        }

    private fun fileSystemCalls(path: String, text: String): List<String> {
        if (path.substringBefore('/') !in CORE) return emptyList()
        val calls = codeLines(text).flatMap { line -> fileSystemCall.findAll(line).map { it.groupValues[1].ifEmpty { it.groupValues[2] } } }.distinct().toList()
        val named = codeLines(text).filterNot { it.startsWith("import ") }.any { line -> CORE_FORBIDDEN.any { it in line } }
        return listOfNotNull(
            calls.takeIf { it.isNotEmpty() }?.let { "$path → 파일 시스템 ${it.joinToString()} — 포트로" },
            "$path → AWT · nio 를 이름으로 쓴다 — Bitmap · 포트로".takeIf { named },
        )
    }

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
            .filterNot { name -> CORE_EXTERNAL.any(name::startsWith) && CORE_FORBIDDEN.none(name::startsWith) }
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
            else -> target != "adapter" || to.getOrNull(1) in ASSEMBLY_FACES   // 뿌리 — 조립 · 수명
        }
    }

    private fun domainAllowed(adapter: String, part: String?): Boolean =
        if (adapter in ENTRY_POINTS) part != "runtime" else part == "port"

    private fun adapterAllowed(from: String, to: String?): Boolean = when {
        to == null || to == from -> true
        from == "entry" -> to in ENTRY_POINTS && to != "entry"
        from in ENTRY_POINTS -> to == "http" && from in setOf("cli", "browser")
        else -> to !in ENTRY_POINTS
    }
}
