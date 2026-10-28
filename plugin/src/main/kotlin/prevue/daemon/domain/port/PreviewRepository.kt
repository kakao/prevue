package prevue.daemon.domain.port

import java.io.File
import prevue.daemon.entity.PreviewSpec

/** 소스에 정의된 `@Preview`를 내준다 — 구현은 소스 정규식 + 클래스 파일의 멀티프리뷰 애노테이션(`PreviewLocator` · `MultiPreview`). */
interface PreviewRepository {
    /** 파일의 최상위 `@Preview` 함수들. 멀티프리뷰는 풀고, `@PreviewParameter` 값으로 나누기 전이다. */
    fun inFile(file: File): List<PreviewSpec>
    fun byFqn(fqn: String, params: Map<String, String>): PreviewSpec
}
