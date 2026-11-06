package prevue.daemon

import java.io.File

/** 본체 소스의 자리 — 층 모듈(`gradle.properties` 의 `prevue.layers`)과 조립 :daemon(D-148). 테스트는 plugin/daemon/daemon 에서 돌아 "." 이 :daemon 이다. 규칙 테스트는 모두 여기서 읽는다. */
object Sources {
    /** 층 패키지 `prevue.<층>`(D-148). 모듈 폴더와 이름이 같고, 목록은 settings · 빌드 · 린트와 함께 `prevue.layers` 한 줄에서 읽는다. `daemon()` 의 키 · 조립 판정(EngineAccessRuleTest)이 쓴다. */
    val LAYERS: List<String> = File("../gradle.properties").readLines()
        .single { it.startsWith("prevue.layers=") }.substringAfter("=").split(",").map { it.trim() }

    private val modules: List<String> = LAYERS.map { "../$it" } + "."
    val kotlinRoots: List<File> = modules.map { File(it, "src/main/kotlin") }
    val javaRoots: List<File> = modules.map { File(it, "src/main/java") }

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

    private val DAEMON = Regex("""^prevue/(?:daemon/|(?=(?:${LAYERS.joinToString("|")})/))""")

    fun file(path: String): File = kotlinRoots.map { File(it, path) }.firstOrNull { it.isFile } ?: File(kotlinRoots.last(), path)
}
