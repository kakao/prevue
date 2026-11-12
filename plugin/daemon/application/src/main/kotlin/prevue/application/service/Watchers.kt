package prevue.application.service

import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.Inject
import dev.zacsweers.metro.SingleIn
import java.io.File
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch
import prevue.application.domain.model.WorkspaceEvent
import prevue.application.port.BuildNotice
import prevue.application.port.BuildWatcher
import prevue.application.port.SourceChange
import prevue.application.port.SourceFileRepository
import prevue.application.port.SourceWatcher
import prevue.application.port.ValueFiles

@SingleIn(AppScope::class)
class Watchers @Inject internal constructor(
    private val ws: Workspace,
    private val sources: SourceWatcher?,
    private val builds: BuildWatcher?,
    @ValueFiles private val values: SourceWatcher?,
    private val sourceFiles: SourceFileRepository,
    private val callers: StaleCallers,
    private val catalog: PreviewCatalog,
) {
    fun observeSourceChanges(): Flow<SourceChange> = sources?.let { repo ->
        repo.changes { listOfNotNull(ws.now.board?.file ?: ws.now.current?.file) }.onEach {
            try {
                note(it.created, it.deleted)
                if (sourceFiles.update(it.created, it.deleted)) ws.emit(WorkspaceEvent.ProjectFilesChanged)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                System.err.println("[prevue] 새 파일을 적지 못했다: $e")
            }
        }
    } ?: emptyFlow()

    fun noteBehindBuildIn(scope: CoroutineScope): Job? = sources?.let { scope.launch { noteBehindBuild() }.also(ws::seededBy) }

    suspend fun noteBehindBuild() {
        try {
            val behind = callers.behindBuild()
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

    suspend fun indexPreviewFiles(change: SourceChange? = null) {
        if (change == null) catalog.build() else catalog.update(change.files + change.created, change.deleted)
    }

    fun observeBuildChanges(): Flow<BuildNotice> = builds?.changes() ?: emptyFlow()

    fun observeResourceChanges(): Flow<SourceChange> = values?.changes { emptyList() } ?: emptyFlow()

    private companion object {
        const val MAX_BEHIND_BUILD = 64
    }
}
