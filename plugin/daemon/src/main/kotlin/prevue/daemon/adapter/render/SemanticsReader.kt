package prevue.daemon.adapter.render

import prevue.daemon.entity.SemanticNode

internal class SemanticsReader {
    private val warnOnce = WarnOnce("시맨틱 트리를 읽지 못했다 — scroll 응답에 semantics 가 빠진다")

    fun readIn(session: LayoutlibSession): List<SemanticNode> {
        val root = session.viewRoot() ?: return emptyList()
        var read = SemanticsTree.Read(emptyList(), null)
        runCatching { session.onSession { read = SemanticsTree.read(root) } }.onFailure(warnOnce::invoke)
        read.failure?.let(warnOnce::invoke)
        return read.nodes
    }
}
