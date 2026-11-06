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
import prevue.application.port.Workspace
import prevue.infrastructure.controller.browser.BrowserEndpoint
import prevue.infrastructure.controller.browser.BrowserInput
import prevue.infrastructure.controller.browser.BrowserPointing
import prevue.infrastructure.controller.browser.BrowserPresenter
import prevue.infrastructure.controller.browser.BrowserTabs
import prevue.infrastructure.bindings.EntryHooks
import prevue.infrastructure.bindings.EntryPoints
import prevue.infrastructure.bindings.PrevueCheckout
import prevue.infrastructure.bindings.TargetRepo
import prevue.infrastructure.controller.hotswap.HotSwapRunner
import prevue.infrastructure.controller.http.HttpEndpoint
import prevue.infrastructure.bindings.CompileBindings
import prevue.infrastructure.bindings.PortBindings
import prevue.infrastructure.bindings.RenderBindings
import prevue.infrastructure.bindings.SourceBindings
import prevue.infrastructure.bindings.TargetBindings
import prevue.infrastructure.process.ProcessMemory
import prevue.daemon.DaemonBindings
import prevue.application.service.ApplySaveUseCase
import prevue.application.service.Boards
import prevue.application.service.ExternalBuildUseCase
import prevue.application.service.ObserveBuildChangesUseCase
import prevue.application.service.ObserveResourceChangesUseCase
import prevue.application.service.ObserveSourceChangesUseCase
import prevue.application.service.RememberValuesUseCase
import prevue.application.service.StartDaemonUseCase
import prevue.application.service.Status
import prevue.application.service.Tabs
import prevue.application.domain.model.LiveFrame
import prevue.application.domain.model.SettledShot
import prevue.application.port.BuildWatcher
import prevue.application.port.Compiler
import prevue.application.port.LiveSessionFactory
import prevue.application.port.MemoryMeter
import prevue.application.port.PreviewRenderer
import prevue.application.port.PreviewRepository
import prevue.application.port.ResourceValues
import prevue.application.port.SourceFileRepository
import prevue.application.port.SourceWatcher
import prevue.application.port.ValueFiles
import prevue.application.service.Engine
import prevue.application.service.Live
import prevue.application.service.LiveLoop
import prevue.application.port.PrevueDispatchers

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
    val engine: Engine
    val startDaemon: StartDaemonUseCase
    val live: Live

    val applySave: ApplySaveUseCase
    val rememberValues: RememberValuesUseCase
    val boards: Boards
    val externalBuild: ExternalBuildUseCase
    val observeSourceChanges: ObserveSourceChangesUseCase
    val observeBuildChanges: ObserveBuildChangesUseCase
    val observeResourceChanges: ObserveResourceChangesUseCase
    val status: Status
    val tabs: Tabs

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
            @Provides @Named(Boards.QUIET) postureQuietMs: Long,
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
    private val dispatchers: PrevueDispatchers = realDispatchers,
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
    @Provides fun dispatchers(): PrevueDispatchers = dispatchers
}

@Suppress("LongParameterList")
internal fun testGraph(
    ports: TestPorts, workspace: Workspace, scope: CoroutineScope, checkout: PrevueCheckout, target: TargetRepo,
    hooks: EntryHooks = EntryHooks(0), postureQuietMs: Long = Boards.QUIET_MS,
): TestGraph =
    createGraphFactory<TestGraph.Factory>().create(ports, workspace, scope, hooks, checkout, target, postureQuietMs).also { it.startDaemon() }

internal val TestGraph.screen: StateFlow<LiveFrame?> get() = engine.screen
internal val TestGraph.frames: StateFlow<LiveLoop.Report> get() = engine.frames
internal val TestGraph.watching: StateFlow<Boolean> get() = engine.watching
internal suspend fun TestGraph.watchScreen(on: Boolean) = engine.watch(on)
internal suspend fun TestGraph.awaitSettled(): SettledShot = engine.settledLatest()
