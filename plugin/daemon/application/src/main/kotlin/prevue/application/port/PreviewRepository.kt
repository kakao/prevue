package prevue.application.port

import java.io.File
import prevue.application.domain.model.PreviewSpec
import prevue.application.domain.model.SourceOutline

interface PreviewRepository {
    /** 파일의 최상위 `@Preview` 함수들. 멀티프리뷰는 풀고, `@PreviewParameter` 값으로 나누기 전이다. */
    fun inFile(file: File): List<PreviewSpec>
    fun outline(text: String, functions: Collection<String>): SourceOutline
}
