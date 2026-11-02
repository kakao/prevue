package prevue.daemon.domain

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import prevue.daemon.domain.port.SourceChange
import prevue.daemon.domain.port.SourceWatcher

/**
 * D-68. 감시하는 모듈들의 values XML 저장을 흐름으로 낸다. 감시를 안 하면(`--no-watch`) 빈 흐름이다.
 * 생성 · 삭제도 저장으로 낸다 — 코드와 달리(D-56) values 파일이 생기거나 없어지면 그 항목들이 생기거나 없어진 것이라 낡음을 세워야 한다.
 */
class ObserveResourceChangesUseCase(private val values: SourceWatcher?) {
    operator fun invoke(): Flow<SourceChange> = values?.changes { emptyList() } ?: emptyFlow()
}
