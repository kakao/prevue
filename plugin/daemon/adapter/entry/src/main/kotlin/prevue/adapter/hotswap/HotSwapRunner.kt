package prevue.adapter.hotswap

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.launch
import prevue.adapter.hotswap.HotSwapLog.line
import prevue.domain.ApplySaveUseCase
import prevue.domain.ExternalBuildUseCase
import prevue.domain.IndexPreviewFilesUseCase
import prevue.domain.ObserveBuildChangesUseCase
import prevue.domain.ObserveResourceChangesUseCase
import prevue.domain.ObserveSourceChangesUseCase
import prevue.domain.TrackTabFilesUseCase

@SingleIn(AppScope::class)
@Inject
internal class HotSwapRunner(
    private val applySave: ApplySaveUseCase,
    private val indexPreviewFiles: IndexPreviewFilesUseCase,
    private val trackTabFiles: TrackTabFilesUseCase,
    private val observeSourceChanges: ObserveSourceChangesUseCase,
    private val observeBuildChanges: ObserveBuildChangesUseCase,
    private val externalBuild: ExternalBuildUseCase,
    private val observeResourceChanges: ObserveResourceChangesUseCase,
    private val scope: CoroutineScope,
) {
    private val _logs = MutableSharedFlow<String>(extraBufferCapacity = 64)
    val logs: SharedFlow<String> = _logs

    fun start() {
        scope.launch {
            observeSourceChanges().collect { change ->
                if (change.files.isNotEmpty()) guarded("watch") { line(change, applySave(change.files, "watch", change)) }
                guarded("preview-files") { indexPreviewFiles(change); null }
                if (change.created.isNotEmpty() || change.deleted.isNotEmpty()) guarded("tab-files") { trackTabFiles(change.created, change.deleted); null }
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
