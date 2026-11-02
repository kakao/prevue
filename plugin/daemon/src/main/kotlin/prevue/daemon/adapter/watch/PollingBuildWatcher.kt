package prevue.daemon.adapter.watch

import java.io.File
import java.time.Instant
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.FlowCollector
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.buffer
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.flow.update
import prevue.daemon.domain.port.BuildChange
import prevue.daemon.domain.port.BuildNotice
import prevue.daemon.domain.port.BuildWatcher

class PollingBuildWatcher(
    groups: List<Pair<String, List<File>>>,
    private val context: CoroutineContext = Dispatchers.IO,
) : BuildWatcher {
    var periodMs = 2_000L
    var quietMs = 1_500L
    var quietStepMs = 300L

    private class Watched(val group: String, val output: File) {
        private var marker = output

        fun snapshot(): List<Any> {
            if (output.isDirectory) {
                File(output, "META-INF").listFiles { f -> f.name.endsWith(".kotlin_module") }?.firstOrNull()?.let { marker = it }
            }
            return listOf(marker.path, marker.exists(), marker.lastModified(), marker.length())
        }

        fun ready(): Boolean = group !in setOf("own", "deps") || marker.exists()
    }

    private val source = LinkedHashMap<File, Watched>()
    private val _stats: MutableStateFlow<Map<String, Any?>>
    override val stats: Map<String, Any?> get() = _stats.value

    init {
        for ((group, paths) in groups) for (p in paths) source.putIfAbsent(p, Watched(group, p))
        _stats = MutableStateFlow(mapOf("watched" to source.size) + source.values.groupingBy { it.group }.eachCount())
    }

    override fun changes(): Flow<BuildNotice> = flow {
        val seen = Seen()
        while (true) {
            delay(periodMs)
            val first = seen.diff()
            if (first.isEmpty()) continue
            val all = LinkedHashSet(first)
            emit(notice(all, done = false))
            awaitQuiet(seen, all)
            emit(notice(all, done = true))
        }
    }.buffer(Channel.RENDEZVOUS).flowOn(context)

    private suspend fun FlowCollector<BuildNotice>.awaitQuiet(seen: Seen, all: MutableSet<File>) {
        var quiet = 0L
        while (quiet < quietMs) {
            delay(quietStepMs)
            val changed = seen.diff()
            if (all.addAll(changed)) emit(notice(all, done = false))
            quiet = if (changed.isEmpty() && all.all { source.getValue(it).ready() }) quiet + quietStepMs else 0L
        }
    }

    private inner class Seen {
        private val at = source.mapValuesTo(HashMap()) { it.value.snapshot() }
        fun diff(): List<File> = source.keys.filter { f ->
            val now = source.getValue(f).snapshot()
            (at[f] != now).also { if (it) at[f] = now }
        }
    }

    private fun notice(outputs: Set<File>, done: Boolean): BuildNotice {
        val changed = outputs.map(source::getValue).groupBy({ it.group }, { it.output })
        if (done) _stats.update { it + mapOf("lastAt" to Instant.now().toString(), "last" to changed.keys.toList()) }
        val change = BuildChange(changed["own"].orEmpty(), changed["deps"].orEmpty(), changed["resources"].orEmpty(), changed["build-files"].orEmpty())
        return BuildNotice(change, done)
    }
}
