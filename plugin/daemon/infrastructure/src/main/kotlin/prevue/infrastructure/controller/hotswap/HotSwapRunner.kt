package prevue.infrastructure.controller.hotswap

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.launch
import prevue.infrastructure.controller.hotswap.HotSwapLog.line
import prevue.application.service.ExternalBuilds
import prevue.application.service.HotReload
import prevue.application.service.Tabs
import prevue.application.service.Watchers

@SingleIn(AppScope::class)
@Inject
internal class HotSwapRunner(
    private val hotReload: HotReload,
    private val tabs: Tabs,
    private val watchers: Watchers,
    private val externalBuilds: ExternalBuilds,
) {
    private val _logs = MutableSharedFlow<String>(extraBufferCapacity = 64)
    val logs: SharedFlow<String> = _logs

    fun start(scope: CoroutineScope) {
        scope.launch {
            watchers.observeSourceChanges().collect { change ->
                if (change.files.isNotEmpty()) guarded("watch") { line(change, hotReload.applySave(change.files, "watch", change)) }
                guarded("preview-files") { watchers.indexPreviewFiles(change); null }
                if (change.created.isNotEmpty() || change.deleted.isNotEmpty()) guarded("tab-files") { tabs.trackFiles(change.created, change.deleted); null }
            }
        }
        scope.launch { watchers.observeBuildChanges().collect { n -> guarded("stale-watch") { line(n, externalBuilds.applyBuild(n.change, n.done)) } } }
        scope.launch {
            watchers.observeResourceChanges().collect { change ->
                val files = change.files + change.created + change.deleted
                if (files.isNotEmpty()) guarded("values-watch") { line(change, hotReload.applySave(files, "watch", change), files) }
            }
        }
    }

    private suspend fun guarded(tag: String, block: suspend () -> String?) {
        val text = try { block() } catch (e: CancellationException) { throw e } catch (e: Exception) { "$tag: $e" }
        text?.let { _logs.emit(it) }
    }
}
