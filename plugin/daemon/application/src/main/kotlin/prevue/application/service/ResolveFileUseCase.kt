package prevue.application.service

import dev.zacsweers.metro.Inject
import prevue.application.domain.model.FileMatch
import prevue.application.domain.rule.FilePolicy
import prevue.application.port.SourceFileRepository

/** FR-20. 화면에서 가리킨 노드의 베이스네임을 풀패스로 푼다. */
@Inject
class ResolveFileUseCase(private val files: SourceFileRepository) {
    operator fun invoke(fileName: String): FileMatch = FilePolicy.match(files.candidates(fileName), files.sourceRoots)
}
