package prevue.daemon.domain.port

import java.io.File
import kotlinx.coroutines.flow.Flow

/** 모듈 소스의 저장(변경 묶음)을 내준다 — 구현은 폴링 감시(`PollingSourceWatcher`). 저장 → 화면의 출발점이다. */
interface SourceWatcher {
    /** [hot]은 아직 안 바뀌었어도 가까이 볼 파일이다 — 사람이 다음에 저장할 파일이 대개 보여 주는 프리뷰 파일이다. */
    fun changes(hot: () -> List<File>): Flow<SourceChange>
    /** NFR-6. 감시가 실제로 얼마를 쓰는지. */
    val stats: Map<String, Any?>
}

class SourceChange(
    val files: List<File>, val mtimeMs: Long, val firedMs: Long, val firedNs: Long,
    val created: List<File> = emptyList(),
    val deleted: List<File> = emptyList(),
)
