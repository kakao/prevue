package prevue.infrastructure.render

import java.io.File
import java.util.zip.ZipFile
import kotlin.math.abs

internal enum class ComposableOrigin(val json: String) { COMPOSE("compose"), PROJECT("project"), LIBRARY("library") }

internal class PackageOrigins(private val projectPath: List<String>, private val libraryPath: List<String>) {
    private var project: Map<Int, String> = emptyMap()
    private var library: Map<Int, String> = emptyMap()
    private var scanned = false
    private val missed = HashSet<Int>()

    @Synchronized
    fun of(packageHash: Int): ComposableOrigin? {
        if (!scanned) { library = hashes(libraryPath.filter { it !in projectPath }); project = hashes(projectPath); scanned = true }
        val key = abs(packageHash)
        if (key !in project && key !in library && missed.add(key)) project = hashes(projectPath)
        val name = project[key] ?: library[key] ?: return null
        return when {
            name.startsWith(COMPOSE_PREFIX) -> ComposableOrigin.COMPOSE
            key in project -> ComposableOrigin.PROJECT
            else -> ComposableOrigin.LIBRARY
        }
    }

    private fun hashes(path: List<String>): Map<Int, String> =
        path.map(::File).flatMap(::packagesIn).distinct().associateBy { abs(it.hashCode()) }

    private fun packagesIn(entry: File): List<String> = runCatching {
        when {
            entry.isDirectory -> entry.walkTopDown().filter { it.isFile && it.name.endsWith(".class") }
                .map { it.parentFile.relativeTo(entry).path.replace(File.separatorChar, '.') }.toList()
            entry.isFile && entry.name.endsWith(".jar") -> ZipFile(entry).use { z ->
                z.entries().asSequence().map { it.name }.filter { it.endsWith(".class") && '/' in it }
                    .map { it.substringBeforeLast('/').replace('/', '.') }.toList()
            }
            else -> emptyList()
        }
    }.getOrDefault(emptyList()).distinct()

    companion object {
        private const val COMPOSE_PREFIX = "androidx.compose."
    }
}
