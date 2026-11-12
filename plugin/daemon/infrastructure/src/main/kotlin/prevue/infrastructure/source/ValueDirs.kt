package prevue.infrastructure.source

import java.io.File

internal object ValueDirs {
    fun of(resRoots: List<File>): List<File> = resRoots.flatMap { root ->
        root.listFiles { f -> f.isDirectory && f.name.startsWith("values") }.orEmpty().sortedBy { it.name }.map { it.canonicalFile }
    }
}
