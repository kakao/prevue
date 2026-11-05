package prevue.daemon

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.DependencyGraph
import dev.zacsweers.metro.Provides
import kotlinx.coroutines.CoroutineScope
import prevue.infrastructure.bindings.PrevueCheckout
import prevue.infrastructure.bindings.Closer
import prevue.infrastructure.bindings.InfraConfig
import prevue.infrastructure.bindings.TargetCheckout
import prevue.application.service.ApplySaveUseCase
import prevue.application.service.OpenPreviewUseCase
import prevue.application.service.ReadStatusUseCase
import prevue.application.service.RememberValuesUseCase
import prevue.application.service.StartDaemonUseCase
import prevue.application.port.BuildWatcher
import prevue.application.port.SourceWatcher
import prevue.application.port.ValueFiles
import prevue.application.service.Workspace
import prevue.application.port.PrevueDispatchers

/** 운영과 같은 기여(`DaemonBindings` · 기술 어댑터의 바인딩 컨테이너 포함)를 그대로 모으고, 테스트가 들여다볼 것만 꺼내 준다. */
@DependencyGraph(AppScope::class)
internal interface InfraGraph {
    val workspace: Workspace
    val target: TargetCheckout
    val builds: BuildWatcher?
    @ValueFiles val values: SourceWatcher?
    val startDaemon: StartDaemonUseCase
    val readStatus: ReadStatusUseCase
    val rememberValues: RememberValuesUseCase
    val openPreview: OpenPreviewUseCase
    val applySave: ApplySaveUseCase

    @DependencyGraph.Factory
    fun interface Factory {
        fun create(
            @Provides config: InfraConfig,
            @Provides scope: CoroutineScope,
            @Provides checkout: PrevueCheckout,
            @Provides hooks: DaemonHooks,
            @Provides closer: Closer,
            @Provides dispatchers: PrevueDispatchers,
        ): InfraGraph
    }
}
