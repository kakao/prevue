package prevue.daemon.domain

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import prevue.daemon.domain.model.LiveFrame
import prevue.daemon.domain.model.SettledShot
import prevue.daemon.domain.port.BuildWatcher
import prevue.daemon.domain.port.Compiler
import prevue.daemon.domain.port.LiveSessionFactory
import prevue.daemon.domain.port.MemoryMeter
import prevue.daemon.domain.port.PreviewRepository
import prevue.daemon.domain.port.PreviewRenderer
import prevue.daemon.domain.port.ResourceValues
import prevue.daemon.domain.port.SourceWatcher
import prevue.daemon.domain.port.SourceFileRepository
import prevue.daemon.domain.runtime.EngineActor
import prevue.daemon.domain.runtime.LiteralPatches
import prevue.daemon.domain.runtime.LiveLoop
import prevue.daemon.domain.runtime.LiveShot
import prevue.daemon.domain.runtime.PreviewCatalog
import prevue.daemon.domain.runtime.ResourcePatches
import prevue.daemon.domain.runtime.StaleCallers
import prevue.daemon.domain.runtime.Tabs
import prevue.daemon.domain.runtime.Workspace

class Ports(
    val engine: PreviewRenderer,
    val sessions: LiveSessionFactory,
    val compiler: Compiler,
    val previews: PreviewRepository,
    val sourceFiles: SourceFileRepository,
    val memory: MemoryMeter = MemoryMeter { null },
    val resources: ResourceValues? = null,
)

class Watchers(val sources: SourceWatcher? = null, val builds: BuildWatcher? = null, val values: SourceWatcher? = null)

class UseCases(
    workspace: Workspace, ports: Ports, scope: CoroutineScope, watchers: Watchers = Watchers(), postureQuietMs: Long = DrawPosturesUseCase.QUIET_MS,
) {
    private val engine = EngineActor(ports.engine, ports.sessions, scope)
    private val live = LiveShot(workspace, engine)
    private val literals = LiteralPatches(workspace, engine)
    private val resourcePatches = ResourcePatches(ports.resources)
    private val callers = StaleCallers(workspace, engine, ports.compiler, literals, ports.sourceFiles)

    init { ports.engine.protect { workspace.now.keepIds() } }

    val listPreviews = ListPreviewsUseCase(ports.previews)
    val drawCard = DrawCardUseCase(workspace, engine, live, callers, scope)
    val fillBoard = FillBoardUseCase(workspace, engine, drawCard, scope)
    private val tabs = Tabs(workspace, engine, ports.previews, live, fillBoard::invoke, callers, ports.sourceFiles)
    val openPreview = OpenPreviewUseCase(workspace, tabs)
    val closeTab = CloseTabUseCase(workspace, tabs)
    val showPreview = ShowPreviewUseCase(workspace, live)
    val rerender = RerenderUseCase(workspace, engine, live)
    val renderAt = RenderAtUseCase(workspace, engine, live)
    val applySave = ApplySaveUseCase(workspace, engine, callers, literals, resourcePatches, live, fillBoard, tabs)
    val trackTabFiles = TrackTabFilesUseCase(workspace, tabs)
    val rememberValues = RememberValuesUseCase(workspace, resourcePatches)
    val awaitRender = AwaitRenderUseCase(workspace)
    val resize = ResizeUseCase(workspace, live)
    val drawPostures = DrawPosturesUseCase(workspace, engine, live, scope, postureQuietMs)
    val focusCard = FocusCardUseCase(workspace, live, fillBoard, resize)
    val touch = TouchUseCase(workspace, engine, live)
    val type = TypeUseCase(workspace, engine, live)
    val scroll = ScrollUseCase(workspace, engine, live, ports.sourceFiles)
    val settle = SettleUseCase(workspace, engine, live)
    val select = SelectUseCase(workspace, live)
    val catchUp = CatchUpUseCase(workspace, live)
    val observeWorkspace = ObserveWorkspaceUseCase(workspace)
    val externalBuild = ExternalBuildUseCase(workspace, engine, ports.compiler, literals, live, fillBoard)
    val readStatus = ReadStatusUseCase(workspace, ports.engine, ports.compiler, watchers.sources, watchers.builds, ports.memory, watchers.values)
    val observeSourceChanges = ObserveSourceChangesUseCase(workspace, watchers.sources, ports.sourceFiles, callers::behindBuild)
    val observeBuildChanges = ObserveBuildChangesUseCase(watchers.builds)
    val observeResourceChanges = ObserveResourceChangesUseCase(watchers.values)
    val resolveFile = ResolveFileUseCase(ports.sourceFiles)
    val hostsFile = HostsFileUseCase(workspace)
    val readSourceIndex = ReadSourceIndexUseCase(ports.sourceFiles)
    private val catalog = PreviewCatalog(workspace, ports.previews, ports.sourceFiles, hostsFile::invoke)
    val indexPreviewFiles = IndexPreviewFilesUseCase(catalog)
    val readPreviewFiles = ReadPreviewFilesUseCase(catalog)

    val screen: StateFlow<LiveFrame?> get() = engine.screen
    val frames: StateFlow<LiveLoop.Report> get() = engine.frames
    val watching: StateFlow<Boolean> get() = engine.watching
    suspend fun watchScreen(on: Boolean) = engine.watch(on)
    suspend fun awaitSettled(): SettledShot = engine.settledLatest()

    init {
        scope.launch {
            engine.shots.collect { shot ->
                if (shot.claimed) return@collect
                try { settle(shot) } catch (e: Exception) {
                    if (e is CancellationException) throw e
                    System.err.println("[prevue] 정착을 기록하지 못했다: $e")
                }
            }
        }
    }
}
