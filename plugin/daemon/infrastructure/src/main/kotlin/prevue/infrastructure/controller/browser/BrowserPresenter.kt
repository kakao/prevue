package prevue.infrastructure.controller.browser

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import prevue.application.domain.model.Phrase
import prevue.application.domain.model.PhraseException
import prevue.application.domain.model.Verbatim
import prevue.application.domain.model.phrase
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.runningFold
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import prevue.infrastructure.controller.http.Relay
import prevue.application.service.Live
import prevue.application.service.Status
import prevue.application.domain.model.Selection
import prevue.application.domain.model.Status as StatusView
import prevue.application.domain.model.Tab
import prevue.application.domain.model.VacantTab
import prevue.application.domain.model.WorkspaceEvent
import prevue.application.port.PrevueDispatchers

@SingleIn(AppScope::class)
@Inject
internal class BrowserPresenter(
    relay: Relay,
    private val status: Status,
    private val live: Live,
    target: ViewerTarget,
    private val dispatchers: PrevueDispatchers,
) {
    val scope = CoroutineScope(relay.scope.coroutineContext + dispatchers.default.limitedParallelism(1, "prevue-viewer"))
    val side = MutableStateFlow(ViewerSide(stillStamp = System.currentTimeMillis()))
    private var version = 0L

    private val statuses = status.observeChanges().onStart { emit(Unit) }.map { status.read() }

    private class Frame(val state: BrowserState, val now: StatusView)

    val state: StateFlow<BrowserState> = combine(statuses, side) { now, viewer -> Frame(BrowserStates.build(now, viewer, ++version), now) }
        .runningFold(null as Frame?) { before, frame -> frame.also { published(before, it) } }
        .filterNotNull()
        .map { it.state }
        .stateIn(scope, SharingStarted.Eagerly, BrowserState.EMPTY)

    private val _events = MutableSharedFlow<UiEvent>(extraBufferCapacity = 64, onBufferOverflow = BufferOverflow.DROP_OLDEST)
    val events: SharedFlow<UiEvent> = _events

    private val line = scope.coroutineContext.minusKey(Job)
    suspend fun <T> onLine(block: () -> T): T = withContext(line) { block() }

    private val inputs = SupervisorJob(scope.coroutineContext[Job])
    private val watchWanted = MutableStateFlow(false)

    init {
        scope.launch(start = CoroutineStart.UNDISPATCHED) { status.observe().collect { onDomainEvent(it) } }
        scope.launch(dispatchers.default) { watchWanted.collect { live.watch(it) } }
        val readBranch = target.branch
        if (readBranch != null) scope.launch {
            while (true) {
                val now = withContext(dispatchers.io) { readBranch() }
                side.update { if (it.branch == now) it else it.copy(branch = now) }
                delay(2_000)
            }
        }
    }

    suspend fun current(): BrowserState = onLine { BrowserStates.build(status.read(), side.value, ++version) }

    fun peek(now: StatusView): BrowserState = BrowserStates.build(now, side.value, version)

    private fun onDomainEvent(ev: WorkspaceEvent) {
        when (ev) {
            is WorkspaceEvent.Touched, WorkspaceEvent.NewTask -> {}
            WorkspaceEvent.PreviewFilesChanged -> _events.tryEmit(UiEvent.PreviewFiles)
            WorkspaceEvent.ProjectFilesChanged -> _events.tryEmit(UiEvent.ProjectFiles)
            is WorkspaceEvent.TabEvicted -> flash(phrase("tabs.evicted", "tab" to tabName(ev.tab)))
            is WorkspaceEvent.TabVacated -> flash(BrowserStates.vacantText(tabName(ev.tab), ev.tab.vacant!!))
        }
    }

    private fun tabName(tab: Tab) = tab.file.name

    fun why(e: Exception): Phrase = (e as? PhraseException)?.phrase ?: Verbatim(e.toString())

    fun flash(message: Phrase) { _events.tryEmit(UiEvent.Flash(message)) }

    private fun published(before: Frame?, frame: Frame) {
        val on = frame.state.focus?.streamUrl != null
        if (on != (before?.state?.focus?.streamUrl != null)) watchWanted.value = on
    }

    fun post(intent: suspend () -> Unit): Job = scope.launch(inputs + dispatchers.default, CoroutineStart.UNDISPATCHED) {
        try { intent() } catch (e: CancellationException) { throw e }
        catch (e: Exception) { if (e !is VacantTab) flash(phrase("request.failed", "why" to why(e))) }
    }

    suspend fun drain() = inputs.children.toList().joinAll()

    sealed interface OpenResult {
        data object Opened : OpenResult
        data class NoPreview(val message: Phrase) : OpenResult
        data class OtherApp(val command: String) : OpenResult
    }

    sealed interface PointResult {
        data class Selected(val selection: Selection) : PointResult
        data object NeedChoice : PointResult
        data class Unknown(val message: Phrase) : PointResult
    }
}
