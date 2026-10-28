package prevue.daemon.adapter.source

import java.io.File
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import prevue.daemon.entity.SourceIndex
import prevue.daemon.domain.port.SourceFileRepository

class ProjectFiles(private val repoRoot: File, roots: List<File>) : SourceFileRepository {
    private sealed interface State {
        class Building(val pending: List<List<Change>>) : State
        class Ready(val files: Map<String, List<String>>) : State
        class Failed(val cause: Throwable) : State
    }

    private data class Change(val name: String, val rel: String, val there: Boolean)

    private val state = MutableStateFlow<State>(State.Building(emptyList()))
    private val canonicalRoot = repoRoot.canonicalPath + "/"
    override val sourceRoots: List<String> = roots.map { it.absolutePath }

    fun buildInBackground(scope: CoroutineScope) = scope.launch(start = CoroutineStart.UNDISPATCHED) {
        runCatching { withContext(Dispatchers.IO) { walk() } }
            .onSuccess { walked -> state.update { s -> State.Ready(s.pendingOrEmpty().fold(walked) { m, changes -> m.applied(changes) ?: m }) } }
            .onFailure { state.value = State.Failed(IllegalStateException("소스 색인을 짓지 못했다", it)) }
    }

    private fun State.pendingOrEmpty() = (this as? State.Building)?.pending.orEmpty()

    private suspend fun walk(): Map<String, List<String>> {
        val prefix = repoRoot.absolutePath + "/"
        val files = sortedMapOf<String, MutableList<String>>()
        val ctx = currentCoroutineContext()
        repoRoot.walkTopDown().onEnter { ctx.ensureActive(); it.name !in SKIP }
            .filter { it.isFile && (it.extension == "kt" || it.extension == "java") }
            .forEach {
                ctx.ensureActive()
                files.getOrPut(it.name) { mutableListOf() } += it.absolutePath.removePrefix(prefix)
            }
        return files
    }

    override fun update(created: List<File>, deleted: List<File>): Boolean {
        val changes = observed(created + deleted)
        var changed = false
        state.update { s ->
            changed = false
            when (s) {
                is State.Building -> State.Building(s.pending + listOf(changes))
                is State.Ready -> s.files.applied(changes)?.let { changed = true; State.Ready(it) } ?: s
                is State.Failed -> s
            }
        }
        return changed
    }

    private fun observed(files: List<File>): List<Change> =
        files.mapNotNull { f -> rel(f)?.let { Change(f.name, it, f.isFile) } }.distinct()

    private fun Map<String, List<String>>.applied(observed: List<Change>): Map<String, List<String>>? {
        val changes = observed.filter { c -> (c.rel in get(c.name).orEmpty()) != c.there }
        if (changes.isEmpty()) return null
        val next = toSortedMap()
        for ((name, r, there) in changes) {
            val l = if (there) (next[name].orEmpty() + r).sorted() else next[name].orEmpty() - r
            if (l.isEmpty()) next.remove(name) else next[name] = l
        }
        return next
    }

    /** 감시는 정규 경로로 알린다 — 루트가 심링크를 거쳐도(macOS `/tmp`) 걷기와 같은 상대 경로로 맞춘다. 걷기가 안 보는 곳은 뺀다. */
    private fun rel(f: File): String? {
        if (f.extension != "kt" && f.extension != "java") return null
        val r = f.canonicalPath.takeIf { it.startsWith(canonicalRoot) }?.removePrefix(canonicalRoot) ?: return null
        return r.takeIf { r.split('/').dropLast(1).none { it in SKIP } }
    }

    /** 루트 상대로 낸다 — 절대경로로 내면 같은 접두가 5천 번 실려 색인이 배로 커진다. */
    override fun index(): SourceIndex? = ready()?.let { files ->
        SourceIndex(repoRoot.absolutePath, sourceRoots.map { it.removePrefix(repoRoot.absolutePath + "/") }, files)
    }

    override suspend fun sourceFiles(): List<File> {
        val roots = sourceRoots.map { "$it/" }
        val done = state.first { it !is State.Building }
        if (done is State.Failed) throw done.cause
        return (done as State.Ready).files.values.asSequence().flatten().filter { it.endsWith(".kt") }.map(::abs)
            .filter { p -> roots.any { p.startsWith(it) } }.map(::File).toList()
    }

    override fun candidates(fileName: String): List<String> = ready()?.get(fileName).orEmpty().map(::abs)

    private fun ready() = (state.value as? State.Ready)?.files

    private fun abs(rel: String) = repoRoot.absolutePath + "/" + rel

    private companion object {
        val SKIP = setOf(".git", "build", ".gradle", ".kotlin", ".idea")
    }
}
