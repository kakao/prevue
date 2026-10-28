package prevue.daemon.domain

import prevue.daemon.domain.port.SourceChange
import prevue.daemon.domain.runtime.PreviewCatalog

/** D-56. 빠른 열기의 목록을 짓는다 — [change]가 없으면 처음부터 훑고(띄울 때 한 번), 있으면 그 저장 묶음의 파일만 다시 본다. */
class IndexPreviewFilesUseCase internal constructor(private val catalog: PreviewCatalog) {
    suspend operator fun invoke(change: SourceChange? = null) {
        if (change == null) catalog.build() else catalog.update(change.files + change.created, change.deleted)
    }
}
