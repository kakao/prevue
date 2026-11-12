package prevue.infrastructure.compile

import java.io.File
import prevue.application.domain.model.isUnder
import prevue.infrastructure.json.Json

internal class KeptModule(
    val sources: Map<String, Long>,
    val at: Long,
    val next: Int,
    val indexes: Map<String, List<String>>,
    val args: String,
)

internal class KeptOverlay(val toolchain: String, val modules: Map<String, KeptModule>) {

    class Now(val builtAt: Long?, val args: String, val roots: List<File>)

    sealed interface Verdict {
        data class Wipe(val why: String) : Verdict
        data class Keep(val modules: Map<String, KeptModule>, val rebuilt: List<String>) : Verdict
    }

    fun judge(toolchain: String, now: (String) -> Now?, mtimeOf: (String) -> Long?): Verdict {
        if (toolchain != this.toolchain) return Verdict.Wipe("컴파일러 · 플러그인 · android.jar가 바뀌었다")
        val rebuilt = ArrayList<String>()
        for ((module, kept) in modules) {
            val n = now(module) ?: return Verdict.Wipe("$module 의 컴파일 인자를 읽지 못했다")
            val built = n.builtAt ?: return Verdict.Wipe("$module 의 Gradle 산출물 시각을 모른다")
            if (n.args != kept.args) return Verdict.Wipe("$module 의 컴파일 인자가 바뀌었다")
            changed(kept, n.roots, mtimeOf)?.let { return Verdict.Wipe("${File(it).name} 이 컴파일한 뒤 바뀌었거나 지워졌거나 소스 루트 밖이다") }
            if (built > kept.at) rebuilt += module
        }
        return Verdict.Keep(modules - rebuilt.toSet(), rebuilt)
    }

    private fun changed(kept: KeptModule, roots: List<File>, mtimeOf: (String) -> Long?): String? =
        kept.sources.entries.firstOrNull { (path, mtime) -> roots.none { File(path).isUnder(it) } || mtimeOf(path) != mtime }?.key

    fun save(file: File) {
        val body = mapOf(
            "format" to FORMAT, "toolchain" to toolchain,
            "modules" to modules.mapValues { (_, m) ->
                mapOf("sources" to m.sources, "at" to m.at, "next" to m.next, "indexes" to m.indexes, "args" to m.args)
            },
        )
        file.parentFile.mkdirs()
        val tmp = File(file.parentFile, file.name + ".tmp")
        tmp.writeText(Json.str(body))
        if (!tmp.renameTo(file)) { file.delete(); tmp.delete() }
    }

    companion object {
        const val FORMAT = 1L

        fun read(file: File): KeptOverlay? = runCatching {
            val m = Json.parse(file.readText()) as Map<*, *>
            if (m["format"] != FORMAT) return null
            KeptOverlay(m["toolchain"] as String, (m["modules"] as Map<*, *>).entries.associate { (k, v) -> k as String to module(v as Map<*, *>) })
        }.getOrNull()

        private fun module(m: Map<*, *>) = KeptModule(
            sources = (m["sources"] as Map<*, *>).entries.associate { (p, t) -> p as String to (t as Number).toLong() },
            at = (m["at"] as Number).toLong(),
            next = (m["next"] as Number).toInt(),
            indexes = (m["indexes"] as Map<*, *>).entries.associate { (n, s) -> n as String to (s as List<*>).map { it as String } },
            args = m["args"] as String,
        )
    }
}
