package prevue.application.service

import dev.zacsweers.metro.Inject
import java.io.File
import prevue.application.domain.model.PreviewSpec
import prevue.application.port.PreviewRepository

/** FR-1. 파일에 정의된 `@Preview` 함수들 — 멀티프리뷰는 풀고, `@PreviewParameter` 값으로 나누기 전이다. */
@Inject
class ListPreviewsUseCase(private val previews: PreviewRepository) {
    operator fun invoke(file: File): List<PreviewSpec> = previews.inFile(file)
}
