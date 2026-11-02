package prevue.daemon.domain

import prevue.daemon.entity.SourceIndex
import prevue.daemon.domain.port.SourceFileRepository

/** 뷰어가 트리를 거를 소스 파일 색인. 다 짓기 전에는 null이다. */
class ReadSourceIndexUseCase(private val files: SourceFileRepository) {
    operator fun invoke(): SourceIndex? = files.index()
}
