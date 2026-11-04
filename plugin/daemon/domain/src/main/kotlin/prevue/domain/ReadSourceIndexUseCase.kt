package prevue.domain

import dev.zacsweers.metro.Inject
import prevue.entity.SourceIndex
import prevue.domain.port.SourceFileRepository

/** 뷰어가 트리를 거를 소스 파일 색인. 다 짓기 전에는 null이다. */
@Inject
class ReadSourceIndexUseCase(private val files: SourceFileRepository) {
    operator fun invoke(): SourceIndex? = files.index()
}
