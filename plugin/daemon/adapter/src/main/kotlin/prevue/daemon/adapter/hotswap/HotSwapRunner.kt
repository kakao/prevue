package prevue.daemon.adapter.hotswap

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.launch
import prevue.daemon.adapter.hotswap.HotSwapLog.line
import prevue.daemon.domain.UseCases

class HotSwapRunner(private val uc: UseCases, private val scope: CoroutineScope) {
    private val _logs = MutableSharedFlow<String>(extraBufferCapacity = 64)
    val logs: SharedFlow<String> = _logs

    fun start() {
        scope.launch {
            uc.observeSourceChanges().collect { change ->
                if (change.files.isNotEmpty()) guarded("watch") { line(change, uc.applySave(change.files, "watch", change)) }
                guarded("preview-files") { uc.indexPreviewFiles(change); null }
                if (change.created.isNotEmpty() || change.deleted.isNotEmpty()) guarded("tab-files") { uc.trackTabFiles(change.created, change.deleted); null }
            }
        }
        scope.launch { uc.observeBuildChanges().collect { n -> guarded("stale-watch") { line(n, uc.externalBuild(n.change, n.done)) } } }
        scope.launch {
            uc.observeResourceChanges().collect { change ->
                val files = change.files + change.created + change.deleted
                if (files.isNotEmpty()) guarded("values-watch") { line(change, uc.applySave(files, "watch", change), files) }
            }
        }
    }

    private suspend fun guarded(tag: String, block: suspend () -> String?) {
        val text = try { block() } catch (e: CancellationException) { throw e } catch (e: Exception) { "$tag: $e" }
        text?.let { _logs.emit(it) }
    }
}
