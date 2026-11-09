package prevue.application.domain.model

import java.io.File

/** 이 데몬이 열 수 있는 프리뷰 파일 하나(D-56) — 빠른 열기가 찾는다. [functions]는 소스 순서의 프리뷰 함수 이름이다(멀티프리뷰는 하나로). */
data class PreviewFile(val file: File, val module: String, val mtimeMs: Long, val functions: List<String>, val calls: Map<String, List<String>>)

data class ComposableDefinition(val file: File, val module: String)

data class PreviewIndex(val files: List<PreviewFile>, val composables: Map<String, List<ComposableDefinition>>)

data class SourceOutline(val composables: List<String>, val calls: Map<String, List<String>>)
