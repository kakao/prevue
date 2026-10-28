package prevue.daemon.domain.port

import java.io.File
import kotlinx.coroutines.flow.Flow

/**
 * 소스 밖의 변화(밖에서 돈 Gradle · 리소스 · 빌드 파일)를 내준다 — 구현은 2초 주기 stat(`PollingBuildWatcher`).
 * 빌드는 산출물을 몇 초에 걸쳐 쓰므로 처음 본 순간(`done=false`)과 조용해진 뒤(`done=true`)를 나눠 알린다.
 */
interface BuildWatcher {
    fun changes(): Flow<BuildNotice>
    val stats: Map<String, Any?>
}

data class BuildChange(
    val own: List<File> = emptyList(),
    val deps: List<File> = emptyList(),
    val resources: List<File> = emptyList(),
    val buildFiles: List<File> = emptyList(),
) {
    val built: List<File> get() = own + deps
}

data class BuildNotice(val change: BuildChange, val done: Boolean)
