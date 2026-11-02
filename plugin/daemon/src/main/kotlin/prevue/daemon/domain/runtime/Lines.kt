package prevue.daemon.domain.runtime

import java.io.File

internal object Lines {
    fun of(files: List<File>, read: Map<String, String?> = emptyMap()): Int? =
        files.maxOfOrNull { f -> (read[f.absolutePath] ?: runCatching { f.readText() }.getOrNull())?.let(::count) ?: 0 }

    private fun count(text: String): Int = text.count { it == '\n' } + if (text.isEmpty() || text.endsWith('\n')) 0 else 1
}
