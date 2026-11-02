package prevue.daemon.domain

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import prevue.daemon.domain.port.BuildNotice
import prevue.daemon.domain.port.BuildWatcher

/** 소스 밖의 변화를 흐름으로 낸다. 감시를 안 하면(`--no-watch`) 빈 흐름이다. */
class ObserveBuildChangesUseCase(private val builds: BuildWatcher?) {
    operator fun invoke(): Flow<BuildNotice> = builds?.changes() ?: emptyFlow()
}
