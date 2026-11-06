package prevue.infrastructure.source

import java.io.File
import prevue.application.domain.model.PreviewSpec
import prevue.application.port.PreviewRepository

/** 소스 정규식으로 `@Preview` 함수를 찾고, 클래스 파일의 애노테이션으로 멀티프리뷰를 푼다. */
internal class SourcePreviewRepository(classPath: List<String>) : PreviewRepository {
    /** 클래스패스의 클래스 파일을 읽으므로 결과는 그 안에서 캐시된다. */
    private val multiPreview = MultiPreview(classPath)

    override fun inFile(file: File): List<PreviewSpec> = PreviewLocator.fromFile(file, multiPreview)
}
