package prevue.daemon

import java.io.File
import java.util.Properties

/** 본체 소스의 자리 — 층 모듈(`gradle.properties` 의 `prevue.layers`)과 조립 :daemon(D-148). 테스트는 plugin/daemon/daemon 에서 돌아 "." 이 :daemon 이다. 규칙 테스트는 모두 여기서 읽는다. */
object Sources {
    /** 층 모듈의 폴더(plugin/daemon 기준, `adapter/infra` 처럼 중첩될 수 있다). settings 와 같은 규칙(Properties)으로 읽는다. 패키지는 [PACKAGES] 가 따로 갖는다. */
    val LAYERS: List<String> = Properties().apply { File("../gradle.properties").reader().use { load(it) } }
        .getProperty("prevue.layers").orEmpty().split(",").map { it.trim() }.filter { it.isNotEmpty() }
        .also { check(it.isNotEmpty()) { "gradle.properties 에 prevue.layers 가 없다" } }

    private val modules: List<String> = LAYERS.map { "../$it" } + "."

    /** 층 패키지 `prevue.<층>`(D-148) — 폴더 이름과 갈릴 수 있어 각 층 모듈의 소스에서 끌어낸다. `daemon()` 의 키 · 조립 판정(EngineAccessRuleTest)이 쓴다. 이 판정이 깨져도 다른 규칙 테스트는 돌게 늦게 읽는다. */
    val PACKAGES: List<String> by lazy {
        LAYERS.map { packageOf(File("../$it", "src/main/kotlin")) }
            .also { check(it.toSet().size == it.size) { "두 층 모듈이 같은 패키지를 쓴다 — 키로 층을 가르지 못한다: $it" } }
    }

    /** 층 모듈 하나는 `prevue/` 바로 아래 패키지 하나에만 `.kt` 를 둔다 — 둘이거나 없거나 `prevue/` 에 바로 두면 키가 모호하거나 빠져 멈춘다. 빈 폴더(.DS_Store 만 남은 옛 자리)는 세지 않는다. */
    fun packageOf(root: File): String {
        val base = File(root, "prevue")
        val top = base.walkTopDown().filter { it.isFile && it.extension == "kt" }
            .map { it.relativeTo(base).invariantSeparatorsPath.substringBefore('/', missingDelimiterValue = "(prevue 바로 아래 ${it.name})") }
            .toSortedSet()
        check(top.size == 1 && !top.single().startsWith("(")) { "층 모듈 $root 의 prevue/ 아래 패키지가 하나가 아니다: $top" }
        return top.single()
    }

    val kotlinRoots: List<File> = modules.map { File(it, "src/main/kotlin") }
    val javaRoots: List<File> = modules.map { File(it, "src/main/java") }
    val bridgeRoots: List<File> = listOf(File("src/bridge/kotlin"))

    /** `src/main/kotlin` (· `java`) 아래 상대 경로 → 내용. 모듈이 갈라도 패키지 경로는 하나로 모인다. */
    fun under(roots: List<File>, vararg ext: String): Map<String, String> {
        val all = roots.filter { it.isDirectory }.flatMap { root ->
            root.walkTopDown().filter { it.isFile && it.extension in ext }.map { it.relativeTo(root).invariantSeparatorsPath to it.readText() }.toList()
        }
        val twice = all.groupBy { it.first }.filterValues { it.size > 1 }.keys
        check(twice.isEmpty()) { "두 모듈에 같은 패키지 경로의 파일이 있다 — 규칙 테스트가 하나만 본다: $twice" }
        return all.toMap()
    }

    /** 데몬 본체 → 내용. 층은 `prevue/<층>/…` 에서 `<층>/…`(`application/service/…` · `infrastructure/render/…`), 조립은 `prevue/daemon/…` 에서 그 아래 이름(`Main.kt`)으로 단다. */
    fun daemon(): Map<String, String> = under(kotlinRoots, "kt")
        .filterKeys { DAEMON.containsMatchIn(it) }.mapKeys { DAEMON.replace(it.key, "") }

    private val DAEMON by lazy { Regex("""^prevue/(?:daemon/|(?=(?:${PACKAGES.joinToString("|")})/))""") }

    fun file(path: String): File = kotlinRoots.map { File(it, path) }.firstOrNull { it.isFile } ?: File(kotlinRoots.last(), path)
}
