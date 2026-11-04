package prevue.daemon.fake

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.BindingContainer
import dev.zacsweers.metro.DependencyGraph
import dev.zacsweers.metro.Includes
import dev.zacsweers.metro.Named
import dev.zacsweers.metro.Provides
import dev.zacsweers.metro.createGraphFactory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.StateFlow
import prevue.adapter.browser.BrowserEndpoint
import prevue.adapter.browser.BrowserInput
import prevue.adapter.browser.BrowserPointing
import prevue.adapter.browser.BrowserPresenter
import prevue.adapter.browser.BrowserTabs
import prevue.adapter.entry.EntryHooks
import prevue.adapter.entry.EntryPoints
import prevue.adapter.entry.PrevueCheckout
import prevue.adapter.entry.TargetRepo
import prevue.adapter.hotswap.HotSwapRunner
import prevue.adapter.http.HttpEndpoint
import prevue.adapter.infra.CompileBindings
import prevue.adapter.infra.PortBindings
import prevue.adapter.infra.RenderBindings
import prevue.adapter.infra.SourceBindings
import prevue.adapter.infra.TargetBindings
import prevue.adapter.process.ProcessMemory
import prevue.daemon.DaemonBindings
import prevue.domain.ApplySaveUseCase
import prevue.domain.AwaitRenderUseCase
import prevue.domain.CatchUpUseCase
import prevue.domain.CloseTabUseCase
import prevue.domain.DrawCardUseCase
import prevue.domain.DrawPosturesUseCase
import prevue.domain.ExternalBuildUseCase
import prevue.domain.FillBoardUseCase
import prevue.domain.FocusCardUseCase
import prevue.domain.HostsFileUseCase
import prevue.domain.IndexPreviewFilesUseCase
import prevue.domain.ListPreviewsUseCase
import prevue.domain.ObserveBuildChangesUseCase
import prevue.domain.ObserveResourceChangesUseCase
import prevue.domain.ObserveScreenUseCase
import prevue.domain.ObserveSourceChangesUseCase
import prevue.domain.ObserveWorkspaceUseCase
import prevue.domain.OpenPreviewUseCase
import prevue.domain.ReadPreviewFilesUseCase
import prevue.domain.ReadSourceIndexUseCase
import prevue.domain.ReadStatusUseCase
import prevue.domain.RememberValuesUseCase
import prevue.domain.RenderAtUseCase
import prevue.domain.RerenderUseCase
import prevue.domain.ResizeUseCase
import prevue.domain.ResolveFileUseCase
import prevue.domain.ScrollUseCase
import prevue.domain.SelectUseCase
import prevue.domain.SettleUseCase
import prevue.domain.ShowPreviewUseCase
import prevue.domain.StartDaemonUseCase
import prevue.domain.TouchUseCase
import prevue.domain.TrackTabFilesUseCase
import prevue.domain.TypeUseCase
import prevue.domain.model.LiveFrame
import prevue.domain.model.SettledShot
import prevue.domain.port.BuildWatcher
import prevue.domain.port.Compiler
import prevue.domain.port.LiveSessionFactory
import prevue.domain.port.MemoryMeter
import prevue.domain.port.PreviewRenderer
import prevue.domain.port.PreviewRepository
import prevue.domain.port.ResourceValues
import prevue.domain.port.SourceFileRepository
import prevue.domain.port.SourceWatcher
import prevue.domain.port.ValueFiles
import prevue.domain.runtime.EngineActor
import prevue.domain.runtime.LiveLoop
import prevue.domain.runtime.Workspace

/**
 * 테스트의 조립 — 운영과 같은 `AppScope` 기여(domain 의 `@Inject` · 입구의 `@ContributesIntoSet` · `EntryBindings`)를 Metro 가 잇고,
 * 기술 어댑터의 바인딩 컨테이너와 `:app` 의 `DaemonBindings` 만 빼고 가짜 포트([TestPorts])와 [Workspace]를 넣는다.
 * 배선 실수는 이 그래프가 컴파일 때 잡는다 — 손으로 묶은 통이 아니다.
 */
@DependencyGraph(
    AppScope::class,
    excludes = [TargetBindings::class, CompileBindings::class, RenderBindings::class, SourceBindings::class, PortBindings::class,
        ProcessMemory::class, DaemonBindings::class],
)
internal interface TestGraph {
    val workspace: Workspace
    val engine: EngineActor
    val startDaemon: StartDaemonUseCase

    val listPreviews: ListPreviewsUseCase
    val drawCard: DrawCardUseCase
    val fillBoard: FillBoardUseCase
    val openPreview: OpenPreviewUseCase
    val closeTab: CloseTabUseCase
    val showPreview: ShowPreviewUseCase
    val rerender: RerenderUseCase
    val renderAt: RenderAtUseCase
    val applySave: ApplySaveUseCase
    val trackTabFiles: TrackTabFilesUseCase
    val rememberValues: RememberValuesUseCase
    val awaitRender: AwaitRenderUseCase
    val resize: ResizeUseCase
    val drawPostures: DrawPosturesUseCase
    val focusCard: FocusCardUseCase
    val touch: TouchUseCase
    val type: TypeUseCase
    val scroll: ScrollUseCase
    val settle: SettleUseCase
    val select: SelectUseCase
    val catchUp: CatchUpUseCase
    val observeWorkspace: ObserveWorkspaceUseCase
    val observeScreen: ObserveScreenUseCase
    val externalBuild: ExternalBuildUseCase
    val readStatus: ReadStatusUseCase
    val observeSourceChanges: ObserveSourceChangesUseCase
    val observeBuildChanges: ObserveBuildChangesUseCase
    val observeResourceChanges: ObserveResourceChangesUseCase
    val resolveFile: ResolveFileUseCase
    val hostsFile: HostsFileUseCase
    val readSourceIndex: ReadSourceIndexUseCase
    val indexPreviewFiles: IndexPreviewFilesUseCase
    val readPreviewFiles: ReadPreviewFilesUseCase

    val entryPoints: EntryPoints
    val presenter: BrowserPresenter
    val browserInput: BrowserInput
    val browserTabs: BrowserTabs
    val browserPointing: BrowserPointing
    val browserEndpoint: BrowserEndpoint
    val hotSwap: HotSwapRunner
    val endpoints: Set<HttpEndpoint>

    @DependencyGraph.Factory
    fun interface Factory {
        @Suppress("LongParameterList")
        fun create(
            @Includes ports: TestPorts,
            @Provides workspace: Workspace,
            @Provides scope: CoroutineScope,
            @Provides hooks: EntryHooks,
            @Provides checkout: PrevueCheckout,
            @Provides target: TargetRepo,
            @Provides @Named(DrawPosturesUseCase.QUIET) postureQuietMs: Long,
        ): TestGraph
    }
}

@BindingContainer
internal class TestPorts(
    private val renderer: PreviewRenderer,
    private val sessions: LiveSessionFactory,
    private val compiler: Compiler,
    private val previews: PreviewRepository,
    private val sourceFiles: SourceFileRepository,
    private val resources: ResourceValues? = null,
    private val sources: SourceWatcher? = null,
    private val builds: BuildWatcher? = null,
    private val values: SourceWatcher? = null,
    private val memory: MemoryMeter = MemoryMeter { null },
) {
    @Provides fun renderer(): PreviewRenderer = renderer
    @Provides fun sessions(): LiveSessionFactory = sessions
    @Provides fun compiler(): Compiler = compiler
    @Provides fun previews(): PreviewRepository = previews
    @Provides fun sourceFiles(): SourceFileRepository = sourceFiles
    @Provides fun resources(): ResourceValues? = resources
    @Provides fun sources(): SourceWatcher? = sources
    @Provides fun builds(): BuildWatcher? = builds
    @Provides @ValueFiles fun values(): SourceWatcher? = values
    @Provides fun memory(): MemoryMeter = memory
}

@Suppress("LongParameterList")
internal fun testGraph(
    ports: TestPorts, workspace: Workspace, scope: CoroutineScope, checkout: PrevueCheckout, target: TargetRepo,
    hooks: EntryHooks = EntryHooks(0), postureQuietMs: Long = DrawPosturesUseCase.QUIET_MS,
): TestGraph =
    createGraphFactory<TestGraph.Factory>().create(ports, workspace, scope, hooks, checkout, target, postureQuietMs).also { it.startDaemon() }

internal val TestGraph.screen: StateFlow<LiveFrame?> get() = engine.screen
internal val TestGraph.frames: StateFlow<LiveLoop.Report> get() = engine.frames
internal val TestGraph.watching: StateFlow<Boolean> get() = engine.watching
internal suspend fun TestGraph.watchScreen(on: Boolean) = engine.watch(on)
internal suspend fun TestGraph.awaitSettled(): SettledShot = engine.settledLatest()
