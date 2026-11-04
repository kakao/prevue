package prevue.domain

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.StateFlow
import prevue.domain.port.Ports
import prevue.domain.port.Watchers
import prevue.domain.model.LiveFrame
import prevue.domain.model.SettledShot
import prevue.domain.runtime.EngineActor
import prevue.domain.runtime.LiteralPatches
import prevue.domain.runtime.LiveLoop
import prevue.domain.runtime.LiveShot
import prevue.domain.runtime.PreviewCatalog
import prevue.domain.runtime.ResourcePatches
import prevue.domain.runtime.StaleCallers
import prevue.domain.runtime.Tabs
import prevue.domain.runtime.Workspace

class UseCases(
    workspace: Workspace, ports: Ports, scope: CoroutineScope, watchers: Watchers = Watchers(), postureQuietMs: Long = DrawPosturesUseCase.QUIET_MS,
) {
    private val engine = EngineActor(ports.engine, ports.sessions, scope)
    private val live = LiveShot(workspace, engine)
    private val literals = LiteralPatches(workspace, engine, ports.sourceFiles)
    private val resourcePatches = ResourcePatches(ports.resources, ports.sourceFiles)
    private val callers = StaleCallers(workspace, engine, ports.compiler, literals, ports.sourceFiles)

    val listPreviews = ListPreviewsUseCase(ports.previews)
    val drawCard = DrawCardUseCase(workspace, engine, live, callers, scope)
    val fillBoard = FillBoardUseCase(workspace, engine, drawCard, scope)
    private val tabs = Tabs(workspace, engine, ports.previews, live, fillBoard, callers, ports.sourceFiles)
    val openPreview = OpenPreviewUseCase(workspace, tabs)
    val closeTab = CloseTabUseCase(workspace, tabs)
    val showPreview = ShowPreviewUseCase(workspace, live)
    val rerender = RerenderUseCase(workspace, engine, live)
    val renderAt = RenderAtUseCase(workspace, engine, live)
    val applySave = ApplySaveUseCase(workspace, engine, callers, literals, resourcePatches, live, fillBoard, tabs)
    val trackTabFiles = TrackTabFilesUseCase(workspace, tabs, ports.sourceFiles)
    val rememberValues = RememberValuesUseCase(workspace, resourcePatches)
    val awaitRender = AwaitRenderUseCase(workspace, ports.sourceFiles)
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
    val observeSourceChanges = ObserveSourceChangesUseCase(workspace, watchers.sources, ports.sourceFiles, callers)
    val observeBuildChanges = ObserveBuildChangesUseCase(watchers.builds)
    val observeResourceChanges = ObserveResourceChangesUseCase(watchers.values)
    val resolveFile = ResolveFileUseCase(ports.sourceFiles)
    val hostsFile = HostsFileUseCase(workspace)
    val readSourceIndex = ReadSourceIndexUseCase(ports.sourceFiles)
    private val catalog = PreviewCatalog(workspace, ports.previews, ports.sourceFiles)
    val indexPreviewFiles = IndexPreviewFilesUseCase(catalog)
    val readPreviewFiles = ReadPreviewFilesUseCase(catalog)

    val screen: StateFlow<LiveFrame?> get() = engine.screen
    val frames: StateFlow<LiveLoop.Report> get() = engine.frames
    val watching: StateFlow<Boolean> get() = engine.watching
    suspend fun watchScreen(on: Boolean) = engine.watch(on)
    suspend fun awaitSettled(): SettledShot = engine.settledLatest()

    init { StartDaemonUseCase(workspace, ports.engine, engine, settle, drawPostures, scope)() }
}
