package prevue.daemon.domain

import prevue.daemon.domain.model.FileMatch
import prevue.daemon.domain.policy.FilePolicy
import prevue.daemon.domain.port.SourceFileRepository

/** FR-20. 화면에서 가리킨 노드의 베이스네임을 풀패스로 푼다. */
class ResolveFileUseCase(private val files: SourceFileRepository) {
    operator fun invoke(fileName: String): FileMatch = FilePolicy.match(files.candidates(fileName), files.sourceRoots)
}
