package prevue.daemon

import java.io.File

/** 본체 소스의 자리 — 층마다 모듈 하나(D-139), 조립은 루트다. 규칙 테스트는 모두 여기서 읽는다. */
object Sources {
    val kotlinRoots: List<File> = listOf("entity", "domain", "adapter", ".").map { File(it, "src/main/kotlin") }
    val javaRoots: List<File> = listOf(File("adapter/src/main/java"))

    /** `src/main/kotlin` (· `java`) 아래 상대 경로 → 내용. 모듈이 갈라도 패키지 경로는 하나로 모인다. */
    fun under(roots: List<File>, vararg ext: String): Map<String, String> = roots.filter { it.isDirectory }.flatMap { root ->
        root.walkTopDown().filter { it.isFile && it.extension in ext }.map { it.relativeTo(root).invariantSeparatorsPath to it.readText() }.toList()
    }.toMap()

    /** `prevue/daemon` 아래 상대 경로(`domain/…` · `adapter/…`) → 내용. */
    fun daemon(): Map<String, String> = under(kotlinRoots, "kt")
        .filterKeys { it.startsWith("prevue/daemon/") }.mapKeys { it.key.removePrefix("prevue/daemon/") }

    fun file(path: String): File = kotlinRoots.map { File(it, path) }.firstOrNull { it.isFile } ?: File(kotlinRoots.last(), path)
}
