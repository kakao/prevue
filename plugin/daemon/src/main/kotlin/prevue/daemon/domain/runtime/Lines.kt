package prevue.daemon.domain.runtime

import java.io.File

internal object Lines {
    fun of(files: List<File>, text: (File) -> String?): Int? =
        files.maxOfOrNull { f -> text(f)?.let(::count) ?: 0 }

    private fun count(text: String): Int = text.count { it == '\n' } + if (text.isEmpty() || text.endsWith('\n')) 0 else 1
}
