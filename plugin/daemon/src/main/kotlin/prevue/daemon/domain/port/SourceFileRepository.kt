package prevue.daemon.domain.port

import java.io.File
import prevue.daemon.entity.SourceIndex

/** 대상 저장소의 소스 파일 색인을 내준다 — 구현은 저장소를 한 번 걷고 감시가 알린 생성 · 삭제로 고친다(`ProjectFiles`). 다 짓기 전에는 비어 있다. */
interface SourceFileRepository {
    /** 다 지었으면 색인, 아니면 null. */
    fun index(): SourceIndex?
    /** 베이스네임이 같은 파일들의 절대경로. */
    fun candidates(fileName: String): List<String>
    /** 데몬이 보는 모듈의 소스 루트(절대경로). */
    val sourceRoots: List<String>
    /** [sourceRoots] 아래의 `.kt` 전부. 색인을 다 지을 때까지 기다린다. */
    suspend fun sourceFiles(): List<File>
    /** 감시가 알린 생성 · 삭제를 색인에 얹는다. 색인이 바뀌었으면 true. */
    fun update(created: List<File>, deleted: List<File>): Boolean
}
