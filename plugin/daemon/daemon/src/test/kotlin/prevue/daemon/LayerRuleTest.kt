package prevue.daemon

import java.io.File
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * 층 규칙(D-148) — 방향(`:infrastructure` → `:application`, `:daemon` 이 둘을 조립)은 모듈 의존이 컴파일 때 막는다.
 * 이 표는 모듈이 못 막는 둘만 지킨다.
 * ① `controller` 는 같은 모듈의 기술 폴더(render · compile · watch · source · dump · process · bindings)를 모른다 — 서비스를 부르고, 코덱 `json` 만 함께 쓴다.
 * ② `:application` 은 파일 시스템을 직접 만지지 않고 AWT · nio 를 이름으로 쓰지 않는다 — JDK 는 모듈이 못 막는다.
 */
class LayerRuleTest {
    @Test fun `본체가 층 규칙을 지킨다`() {
        val files = Sources.daemon()
        val where = "작업 디렉터리: ${File("").absolutePath}"
        // 거르기가 어긋나면 층 하나가 통째로 빠진다 — 층마다 있는지와 전체의 바닥(150, 옮길 때 191개)을 함께 본다.
        val counts = files.keys.groupingBy { it.substringBefore('/').takeIf { k -> k in Sources.LAYERS } ?: "daemon" }.eachCount()
        assertEquals((Sources.LAYERS + "daemon").toSet(), counts.keys, "본체의 층을 다 못 찾았다 — $counts · $where")
        assertEquals(true, files.size >= 150, "본체를 못 찾았다(${files.size}) — $where")
        assertEquals(true, files.keys.any { it.startsWith(LayerRule.CONTROLLER) }, "controller 를 못 찾았다 — $where")
        assertEquals(emptyList<String>(), LayerRule.violations(files))
    }

    @Test fun `일부러 넣은 위반을 잡는다`() {
        val files = mapOf(
            // ① controller 는 기술 폴더를 모른다.
            "infrastructure/controller/http/A.kt" to "package prevue.infrastructure.controller.http\nimport prevue.infrastructure.render.RenderEngine\n",
            "infrastructure/controller/cli/B.kt" to "package prevue.infrastructure.controller.cli\nval b = prevue.infrastructure.compile.HotCompiler::class\n",
            "infrastructure/controller/browser/C.kt" to "package prevue.infrastructure.controller.browser\nimport prevue.infrastructure.bindings.EntryPoints\n",
            // ② application 은 파일 시스템 · AWT · nio 를 직접 쓰지 않는다.
            "application/service/D.kt" to "package prevue.application.service\nclass D { fun a(f: java.io.File) = f.readText() }\n",
            "application/domain/model/E.kt" to "package prevue.application.domain.model\nval e = java.io.File(\"res\").listFiles { f -> f.isDirectory }\n",
            "application/service/F.kt" to "package prevue.application.service\nimport java.awt.image.BufferedImage\n",
            "application/service/G.kt" to "package prevue.application.service\nclass G(val img: java.awt.image.BufferedImage)\n",
            "application/service/H.kt" to "package prevue.application.service\nimport java.nio.file.Files\nfun h() = Files.size(null)\n",
            "application/domain/model/I.kt" to "package prevue.application.domain.model\nfun i(f: java.io.File) = java.io.FileReader(f).use { it.read() } + f.length().toInt()\n",
            "application/service/J.kt" to "package prevue.application.service\nfun j(f: java.io.File) = \"내용 \${f.readText()}\"\n",
            "application/service/K.kt" to "package prevue.application.service\nfun k(c: Char, f: java.io.File) = if (c == '\"') f.delete() else false\n",
            "application/service/L.kt" to "package prevue.application.service\nimport kotlin.io.path.readText\n",
            "application/service/S.kt" to "package prevue.application.service\nfun s(fs: List<java.io.File>) = fs.filter(java.io.File::isFile)\n",
            // 지켜진 것 — 잡히면 안 된다.
            "infrastructure/controller/cli/M.kt" to "package prevue.infrastructure.controller.cli\nimport prevue.infrastructure.controller.http.toJson\nimport prevue.infrastructure.json.Json\n" +
                "import prevue.application.service.Tabs\n",
            "infrastructure/render/N.kt" to "package prevue.infrastructure.render\nimport prevue.infrastructure.compile.HotCompiler\nimport prevue.infrastructure.controller.http.Server\n",
            "infrastructure/bindings/O.kt" to "package prevue.infrastructure.bindings\nimport prevue.infrastructure.controller.http.Server\nimport prevue.infrastructure.render.RenderEngine\n",
            "infrastructure/controller/http/P.kt" to "package prevue.infrastructure.controller.http\nval p = \"com.acme.prevue.infrastructure.render.X\"\n",
            "infrastructure/controller/http/P2.kt" to "package prevue.infrastructure.controller.http\n// prevue.infrastructure.render 는 모른다\nval p2 = \"prevue.infrastructure.render.RenderEngine\"\n",
            "infrastructure/render/Q.kt" to "package prevue.infrastructure.render\nimport java.awt.image.BufferedImage\nfun q(f: java.io.File) = f.readText()\n",
            "application/service/R.kt" to "package prevue.application.service\nimport kotlin.math.abs\nimport kotlinx.coroutines.flow.Flow\nimport java.io.File\n",
            "application/service/T.kt" to "package prevue.application.service\nclass T(private val s: prevue.application.port.SourceFileRepository) {\n" +
                "    // f.readText() 는 포트로 간다\n    val key = \"tabs.delete\" // f.exists() 는 쓰지 않는다\n    val quote = '\"'\n" +
                "    fun say(t: String) = \"\${t.length} 글자 — f.readText() 아님\"\n    fun n(t: String) = t.length + StringBuilder(t).apply { setLength(0) }.length\n" +
                "    fun a(f: java.io.File) = s.has(f) && f.canonicalPath.isNotEmpty() && s.read(f) != null\n}\n",
            "Main.kt" to "package prevue.daemon\nimport prevue.infrastructure.render.RenderEngine\nfun m(f: java.io.File) = f.readText()\n",
        )
        assertEquals(
            listOf("infrastructure/controller/http/A.kt", "infrastructure/controller/cli/B.kt", "infrastructure/controller/browser/C.kt",
                "application/service/D.kt", "application/domain/model/E.kt", "application/service/F.kt", "application/service/G.kt", "application/service/H.kt",
                "application/domain/model/I.kt", "application/service/J.kt", "application/service/K.kt", "application/service/L.kt", "application/service/S.kt").sorted(),
            LayerRule.violations(files).map { it.substringBefore(" ") }.sorted())
    }
}

/** 파일 위치(`Sources.daemon()` 의 키)와 그 파일의 철자를 대조한다. */
object LayerRule {
    const val CONTROLLER = "infrastructure/controller/"
    /** controller 가 같은 모듈에서 아는 폴더 — 자기들과 코덱. */
    private val CONTROLLER_SEES = setOf("controller", "json")
    /** 앞이 글자나 점이면 남의 FQN(`com.acme.prevue.infrastructure…`)이다 — 우리 패키지로 세지 않는다. */
    private val infrastructureRef = Regex("""(?<![\w.])prevue\.infrastructure\.(\w+)""")
    /** D-139. 그림은 `Bitmap` 값으로 든다 — AWT 는 render · browser 만 안다. 파일 시스템 API 의 다른 길(nio · kotlin.io.path)도 application 밖이다. */
    private val FORBIDDEN = listOf("java.awt.", "javax.", "java.nio.file.", "kotlin.io.path.")

    fun violations(files: Map<String, String>): List<String> = files.flatMap { (path, text) ->
        when {
            path.startsWith(CONTROLLER) -> technicalRefs(path, text)
            path.startsWith("application/") -> fileSystemCalls(path, text)
            else -> emptyList()
        }
    }

    private fun technicalRefs(path: String, text: String): List<String> =
        codeLines(text).filterNot { it.startsWith("package ") }
            .flatMap { line -> infrastructureRef.findAll(line).map { it.groupValues[1] } }
            .filterNot { it in CONTROLLER_SEES }
            .distinct().map { "$path → prevue.infrastructure.$it" }.toList()

    /** D-139. application 은 파일 시스템을 직접 만지지 않는다 — 읽기 · 시각 · 목록은 SourceFileRepository, 산출물 지우기는 PreviewRenderer 다. `File` 을 경로 값으로 드는 것과 canonicalPath(키 정규화)는 된다. */
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
        val calls = codeLines(text).filterNot { it.startsWith("import ") }.flatMap { line -> fileSystemCall.findAll(line).map { it.groupValues[1].ifEmpty { it.groupValues[2] } } }.distinct().toList()
        val named = codeLines(text).any { line -> FORBIDDEN.any { it in line } }
        return listOfNotNull(
            calls.takeIf { it.isNotEmpty() }?.let { "$path → 파일 시스템 ${it.joinToString()} — 포트로" },
            "$path → AWT · nio 를 이름으로 쓴다 — Bitmap · 포트로".takeIf { named },
        )
    }
}
