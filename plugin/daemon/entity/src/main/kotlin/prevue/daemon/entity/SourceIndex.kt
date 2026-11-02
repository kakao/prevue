package prevue.daemon.entity

/** 베이스네임 → 저장소 상대 경로들(FR-20). 뷰어가 트리에서 프레임워크 노드를 거르는 데 쓴다. */
data class SourceIndex(val root: String, val roots: List<String>, val files: Map<String, List<String>>)
