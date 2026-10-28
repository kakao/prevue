package prevue.daemon.adapter.render

import prevue.daemon.adapter.render.LazyListReflection.Raw

internal class LazyListReader {
    private val warnOnce = WarnOnce("게으른 목록의 상태를 읽지 못했다 — #N 은 읽는 순서로 센다")

    fun readIn(session: LayoutlibSession, adapter: Any?): List<Raw> = onSession(session) { LazyListReflection.read(adapter) }

    fun rereadIn(session: LayoutlibSession, states: List<Any>): List<Raw> =
        if (states.isEmpty()) emptyList() else onSession(session) { LazyListReflection.reread(states) }

    private fun onSession(session: LayoutlibSession, read: () -> List<Raw>): List<Raw> {
        var raws = emptyList<Raw>()
        runCatching { session.onSession { raws = read() } }.onFailure(warnOnce::invoke)
        return raws
    }
}
