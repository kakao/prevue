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
import prevue.application.service.ApplySaveUseCase
import prevue.application.service.ExternalBuildUseCase
import prevue.application.service.ObserveBuildChangesUseCase
import prevue.application.service.ObserveResourceChangesUseCase
import prevue.application.service.ObserveSourceChangesUseCase
import prevue.application.service.Status
import prevue.application.service.Tabs

@SingleIn(AppScope::class)
@Inject
internal class HotSwapRunner(
    private val applySave: ApplySaveUseCase,
    private val status: Status,
    private val tabs: Tabs,
    private val observeSourceChanges: ObserveSourceChangesUseCase,
    private val observeBuildChanges: ObserveBuildChangesUseCase,
    private val externalBuild: ExternalBuildUseCase,
    private val observeResourceChanges: ObserveResourceChangesUseCase,
) {
    private val _logs = MutableSharedFlow<String>(extraBufferCapacity = 64)
    val logs: SharedFlow<String> = _logs

    fun start(scope: CoroutineScope) {
        scope.launch {
            observeSourceChanges().collect { change ->
                if (change.files.isNotEmpty()) guarded("watch") { line(change, applySave(change.files, "watch", change)) }
                guarded("preview-files") { status.indexPreviewFiles(change); null }
                if (change.created.isNotEmpty() || change.deleted.isNotEmpty()) guarded("tab-files") { tabs.trackFiles(change.created, change.deleted); null }
            }
        }
        scope.launch { observeBuildChanges().collect { n -> guarded("stale-watch") { line(n, externalBuild(n.change, n.done)) } } }
        scope.launch {
            observeResourceChanges().collect { change ->
                val files = change.files + change.created + change.deleted
                if (files.isNotEmpty()) guarded("values-watch") { line(change, applySave(files, "watch", change), files) }
            }
        }
    }

    private suspend fun guarded(tag: String, block: suspend () -> String?) {
        val text = try { block() } catch (e: CancellationException) { throw e } catch (e: Exception) { "$tag: $e" }
        text?.let { _logs.emit(it) }
    }
}
