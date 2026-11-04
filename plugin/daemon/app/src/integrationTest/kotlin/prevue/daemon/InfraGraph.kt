package prevue.daemon

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.DependencyGraph
import dev.zacsweers.metro.Provides
import kotlinx.coroutines.CoroutineScope
import prevue.adapter.entry.PrevueCheckout
import prevue.adapter.infra.Closer
import prevue.adapter.infra.InfraConfig
import prevue.adapter.infra.TargetCheckout
import prevue.domain.ApplySaveUseCase
import prevue.domain.OpenPreviewUseCase
import prevue.domain.ReadStatusUseCase
import prevue.domain.RememberValuesUseCase
import prevue.domain.StartDaemonUseCase
import prevue.domain.port.BuildWatcher
import prevue.domain.port.SourceWatcher
import prevue.domain.port.ValueFiles
import prevue.domain.runtime.Workspace

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
        ): InfraGraph
    }
}
