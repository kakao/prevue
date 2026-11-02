package prevue.daemon.adapter.source

import java.io.File
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.domain.port.PreviewRepository

/** 소스 정규식으로 `@Preview` 함수를 찾고, 클래스 파일의 애노테이션으로 멀티프리뷰를 푼다. */
class SourcePreviewRepository(classPath: List<String>) : PreviewRepository {
    /** 클래스패스의 클래스 파일을 읽으므로 결과는 그 안에서 캐시된다. */
    private val multiPreview = MultiPreview(classPath)

    override fun inFile(file: File): List<PreviewSpec> = PreviewLocator.fromFile(file, multiPreview)
    override fun byFqn(fqn: String, params: Map<String, String>): PreviewSpec = PreviewLocator.fromFqn(fqn, params)
}
