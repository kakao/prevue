package prevue.daemon

import java.io.File

/** 본체 소스의 자리 — 층마다 모듈 하나(D-139), 조립은 루트다. 규칙 테스트는 모두 여기서 읽는다. */
object Sources {
    val kotlinRoots: List<File> = listOf("entity", "domain", "adapter", ".").map { File(it, "src/main/kotlin") }
    val javaRoots: List<File> = listOf("entity", "domain", "adapter", ".").map { File(it, "src/main/java") }

    /** `src/main/kotlin` (· `java`) 아래 상대 경로 → 내용. 모듈이 갈라도 패키지 경로는 하나로 모인다. */
    fun under(roots: List<File>, vararg ext: String): Map<String, String> {
        val all = roots.filter { it.isDirectory }.flatMap { root ->
            root.walkTopDown().filter { it.isFile && it.extension in ext }.map { it.relativeTo(root).invariantSeparatorsPath to it.readText() }.toList()
        }
        val twice = all.groupBy { it.first }.filterValues { it.size > 1 }.keys
        check(twice.isEmpty()) { "두 모듈에 같은 패키지 경로의 파일이 있다 — 규칙 테스트가 하나만 본다: $twice" }
        return all.toMap()
    }

    /** `prevue/daemon` 아래 상대 경로(`domain/…` · `adapter/…`) → 내용. */
    fun daemon(): Map<String, String> = under(kotlinRoots, "kt")
        .filterKeys { it.startsWith("prevue/daemon/") }.mapKeys { it.key.removePrefix("prevue/daemon/") }

    fun file(path: String): File = kotlinRoots.map { File(it, path) }.firstOrNull { it.isFile } ?: File(kotlinRoots.last(), path)
}
