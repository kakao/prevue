package prevue.daemon.adapter.browser

import prevue.daemon.entity.Phrase
import prevue.daemon.entity.PhraseException
import prevue.daemon.entity.Verbatim
import prevue.daemon.entity.phrase
import prevue.daemon.domain.model.Pointed
import java.io.File
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.channels.Channel
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
import prevue.daemon.domain.model.FileMatch
import prevue.daemon.domain.model.Selection
import prevue.daemon.entity.SourceIndex
import prevue.daemon.domain.model.ShowResult
import prevue.daemon.domain.model.ScreenSize
import prevue.daemon.domain.model.Status
import prevue.daemon.domain.model.Tab
import prevue.daemon.domain.model.VacantTab
import prevue.daemon.domain.model.WorkspaceEvent
import prevue.daemon.domain.UseCases

class BrowserPresenter(
    private val uc: UseCases,
    private val scope: CoroutineScope,
    private val readBranch: (() -> String?)? = null,
) {
    private val side = MutableStateFlow(ViewerSide(stillStamp = System.currentTimeMillis()))
    private var version = 0L

    private val statuses = uc.observeWorkspace.changes().onStart { emit(Unit) }.map { uc.readStatus() }

    private class Frame(val state: BrowserState, val now: Status)

    val state: StateFlow<BrowserState> = combine(statuses, side) { now, viewer -> Frame(BrowserStates.build(now, viewer, ++version), now) }
        .runningFold(null as Frame?) { before, frame -> frame.also { published(before, it) } }
        .filterNotNull()
        .map { it.state }
        .stateIn(scope, SharingStarted.Eagerly, BrowserState.EMPTY)

    private val _events = MutableSharedFlow<UiEvent>(extraBufferCapacity = 64, onBufferOverflow = BufferOverflow.DROP_OLDEST)
    val events: SharedFlow<UiEvent> = _events

    private val line = scope.coroutineContext.minusKey(Job)
    private suspend fun <T> onLine(block: () -> T): T = withContext(line) { block() }

    private var pending: Pointed? = null
    private val chosen = HashMap<String, String>()
    private val inputs = SupervisorJob(scope.coroutineContext[Job])
    private val watchWanted = MutableStateFlow(false)

    init {
        scope.launch(start = CoroutineStart.UNDISPATCHED) { uc.observeWorkspace().collect { onDomainEvent(it) } }
        scope.launch(Dispatchers.Default) { watchWanted.collect { uc.watchScreen(it) } }
        val readBranch = readBranch
        if (readBranch != null) scope.launch {
            while (true) {
                val now = withContext(Dispatchers.IO) { readBranch() }
                side.update { if (it.branch == now) it else it.copy(branch = now) }
                delay(2_000)
            }
        }
    }

    suspend fun current(): BrowserState = onLine { BrowserStates.build(uc.readStatus(), side.value, ++version) }

    private fun onDomainEvent(ev: WorkspaceEvent) {
        when (ev) {
            is WorkspaceEvent.Touched, WorkspaceEvent.NewTask -> {}
            WorkspaceEvent.PreviewFilesChanged -> _events.tryEmit(UiEvent.PreviewFiles)
            WorkspaceEvent.ProjectFilesChanged -> _events.tryEmit(UiEvent.ProjectFiles)
            is WorkspaceEvent.TabEvicted -> _events.tryEmit(UiEvent.Flash(phrase("tabs.evicted", "tab" to tabName(ev.tab))))
            is WorkspaceEvent.TabVacated -> _events.tryEmit(UiEvent.Flash(BrowserStates.vacantText(tabName(ev.tab), ev.tab.vacant!!)))
        }
    }

    private fun tabName(tab: Tab) = tab.file?.name ?: tab.key

    private fun why(e: Exception): Phrase = (e as? PhraseException)?.phrase ?: Verbatim(e.toString())

    private fun published(before: Frame?, frame: Frame) {
        val single = side.value.singleInteractive
        if (single != null && frame.state.focus?.previewId != single) side.update { it.copy(singleInteractive = null) }
        val on = frame.state.focus?.streamUrl != null
        if (on != (before?.state?.focus?.streamUrl != null)) watchWanted.value = on
    }

    fun enterFocus(index: Int) = post { uc.focusCard(index, on = true, by = "viewer") }

    fun exitFocus() = post { uc.focusCard.offCurrent(by = "viewer") }

    fun setSingleInteractive(on: Boolean) = post {
        if (!on) sizes.trySend(ScreenSize.Original)
        onLine {
            val at = System.currentTimeMillis()
            side.update {
                if (on) it.copy(singleInteractive = state.value.focus?.previewId, streamStamp = at)
                else it.copy(singleInteractive = null, stillStamp = at)
            }
        }
    }

    private val sizes = Channel<ScreenSize>(Channel.CONFLATED)

    fun resize(size: ScreenSize) { sizes.trySend(size) }

    init {
        scope.launch(Dispatchers.Default) {
            for (s in sizes) {
                try { resized(s) } catch (e: CancellationException) { throw e }
                catch (e: Exception) { _events.tryEmit(UiEvent.Flash(phrase("resize.failed", "why" to why(e)))) }
            }
        }
    }

    private suspend fun resized(s: ScreenSize) {
        val single = uc.readStatus().board == null
        if (single && s != ScreenSize.Original && onLine { side.value.singleInteractive } == null) return
        uc.resize(s, by = "viewer") ?: return
        if (uc.readStatus().board != null) return
        onLine {
            val at = System.currentTimeMillis()
            side.update { if (it.singleInteractive != null) it.copy(streamStamp = at) else it }
        }
    }

    fun switchTab(key: String) = post { uc.openPreview(key, null, emptyMap(), by = "viewer") }

    fun closeTab(key: String) = post { uc.closeTab(key, by = "viewer") }

    fun open(path: String): OpenResult {
        val f = File(path)
        if (!f.isFile) return OpenResult.NoPreview(phrase("open.missing", "file" to f.name))
        if (!uc.hostsFile(f)) return OpenResult.OtherApp("prevue show ${shellQuote(f.absolutePath)}")
        if (uc.listPreviews(f).isEmpty()) return OpenResult.NoPreview(phrase("open.noPreview", "file" to f.name))
        post { uc.openPreview(f.path, null, emptyMap(), by = "viewer") }
        return OpenResult.Opened
    }

    private fun shellQuote(s: String) = if (s.all { it.isLetterOrDigit() || it in "/._-+:@" }) s else "'" + s.replace("'", "'\\''") + "'"

    sealed interface OpenResult {
        data object Opened : OpenResult
        data class NoPreview(val message: Phrase) : OpenResult
        data class OtherApp(val command: String) : OpenResult
    }

    fun touch(type: String, x: Int, y: Int) = post { uc.touch(type, x, y, by = "viewer", settle = false) }

    fun wheel(x: Int, y: Int, dx: Float, dy: Float) = post {
        if (!uc.scroll(x, y, dx, dy, by = "viewer") && onLine { !wheelWarned.also { wheelWarned = true } }) {
            _events.tryEmit(UiEvent.Flash(phrase("input.wheel.failed")))
        }
    }
    private var wheelWarned = false

    private fun post(intent: suspend () -> Unit): Job = scope.launch(inputs + Dispatchers.Default, CoroutineStart.UNDISPATCHED) {
        try { intent() } catch (e: CancellationException) { throw e }
        catch (e: Exception) { if (e !is VacantTab) _events.tryEmit(UiEvent.Flash(phrase("request.failed", "why" to why(e)))) }
    }

    internal suspend fun drain() = inputs.children.toList().joinAll()

    internal suspend fun point(fileName: String, line: Int, at: Pointed): PointResult {
        val path = onLine { chosen[fileName] } ?: when (val r = uc.resolveFile(fileName)) {
            is FileMatch.Path -> r.path
            is FileMatch.Ambiguous -> return onLine {
                pending = at
                side.update { it.copy(choice = PathChoice(fileName, line, r.candidates, uc.readStatus().module.repo)) }
                PointResult.NeedChoice
            }
            FileMatch.Unknown -> return PointResult.Unknown(phrase("point.unindexed", "file" to fileName, "line" to line))
        }
        return PointResult.Selected(select(path, line, at))
    }

    suspend fun choose(path: String): PointResult {
        val (c, p) = onLine {
            val c = side.value.choice ?: return@onLine null
            require(path in c.candidates) { "후보가 아니다: $path" }
            chosen[c.fileName] = path
            (c to pending).also { pending = null; side.update { it.copy(choice = null) } }
        } ?: return PointResult.Unknown(phrase("choose.nothing"))
        return PointResult.Selected(select(path, c.line, p ?: Pointed.NOTHING))
    }

    fun cancelChoice() = post { onLine { pending = null; side.update { it.copy(choice = null) } } }

    suspend fun catchUp(): String? {
        uc.catchUp("viewer")
        return onLine { BrowserStates.build(uc.readStatus(), side.value, version).focus?.treeUrl }
    }

    private suspend fun select(path: String, line: Int, at: Pointed): Selection = uc.select(path, line, at, "viewer")

    fun sourceIndex(): SourceIndex? = uc.readSourceIndex()

    fun previewFiles(): Map<String, Any?> = previewFilesJson(uc.readPreviewFiles(), File(uc.readStatus().module.repo).canonicalPath)


    sealed interface PointResult {
        data class Selected(val selection: Selection) : PointResult
        data object NeedChoice : PointResult
        data class Unknown(val message: Phrase) : PointResult
    }

}
