package prevue.daemon.domain

import java.io.File
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.domain.port.PreviewRepository

/** FR-1. 파일에 정의된 `@Preview` 함수들 — 멀티프리뷰는 풀고, `@PreviewParameter` 값으로 나누기 전이다. */
class ListPreviewsUseCase(private val previews: PreviewRepository) {
    operator fun invoke(file: File): List<PreviewSpec> = previews.inFile(file)
}
