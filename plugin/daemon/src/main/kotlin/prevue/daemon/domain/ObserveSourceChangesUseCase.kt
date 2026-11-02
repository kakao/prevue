package prevue.daemon.domain

import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.onStart
import java.io.File
import prevue.daemon.domain.port.SourceChange
import prevue.daemon.domain.port.SourceFileRepository
import prevue.daemon.domain.port.SourceWatcher
import prevue.daemon.domain.model.WorkspaceEvent
import prevue.daemon.domain.runtime.Workspace

/**
 * 모듈 소스의 저장을 흐름으로 낸다. 감시를 안 하면(`--no-watch`) 빈 흐름이다.
 * 보여 주는 프리뷰 파일은 아직 안 바뀌었어도 핫셋에 둔다 — 사람이 다음에 저장할 파일이 대개 그것이다.
 */
class ObserveSourceChangesUseCase(
    private val ws: Workspace, private val sources: SourceWatcher?, private val files: SourceFileRepository,
    private val behindBuild: suspend () -> List<File> = { emptyList() },
) {
    operator fun invoke(): Flow<SourceChange> = sources?.let { repo ->
        repo.changes { listOfNotNull(ws.now.board?.file ?: ws.now.current?.file) }.onStart { noteBehindBuild() }.onEach {
            try {
                note(it.created, it.deleted)
                if (files.update(it.created, it.deleted)) ws.emit(WorkspaceEvent.ProjectFilesChanged)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                System.err.println("[prevue] 새 파일을 적지 못했다: $e")
            }
        }
    } ?: emptyFlow()

    suspend fun noteBehindBuild() {
        try {
            val behind = behindBuild()
            if (behind.size > MAX_BEHIND_BUILD) {
                System.err.println("[prevue] 빌드 뒤에 바뀐 소스가 ${behind.size}개라 함께 싣지 않는다 — 부르는 쪽이 저장될 때 실린다")
                return
            }
            note(behind, emptyList())
            if (behind.isNotEmpty()) System.err.println("[prevue] 빌드 뒤에 바뀐 소스 ${behind.size}개를 다음 컴파일에 함께 싣는다")
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            System.err.println("[prevue] 빌드 뒤에 바뀐 소스를 찾지 못했다: $e")
        }
    }

    private fun note(created: List<File>, deleted: List<File>) = ws.noteCreated(created, deleted)

    companion object {
        const val MAX_BEHIND_BUILD = 64
    }
}
