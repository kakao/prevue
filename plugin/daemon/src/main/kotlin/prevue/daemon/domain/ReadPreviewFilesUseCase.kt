package prevue.daemon.domain

import prevue.daemon.domain.model.PreviewFile
import prevue.daemon.domain.runtime.PreviewCatalog

/** D-56. 빠른 열기의 목록 — 최근에 바뀐 파일이 앞이다. 아직 다 훑지 못했으면 null. */
class ReadPreviewFilesUseCase internal constructor(private val catalog: PreviewCatalog) {
    operator fun invoke(): List<PreviewFile>? = catalog.list()
}
