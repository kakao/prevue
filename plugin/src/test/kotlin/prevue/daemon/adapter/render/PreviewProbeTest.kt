package prevue.daemon.adapter.render

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import prevue.daemon.adapter.render.PreviewProbe.Presence
import prevue.daemon.adapter.render.RenderVerdict.Blank

class PreviewProbeTest {
    private val probe = PreviewProbe(javaClass.classLoader)
    private val owner = StubPreviews::class.java.name

    @Test fun `렌더 로더의 클래스에 프리뷰 메서드가 있으면 찾았다`() {
        assertEquals(Presence.FOUND, probe.presence("$owner.filled"))
    }

    // 빌드에 있던 옛 스텁 — 클래스는 있는데 저장으로 더한 프리뷰 메서드가 없다. 렌더러는 이 실패를 삼키고 빈 그림을 성공으로 낸다
    @Test fun `클래스는 있는데 메서드가 없으면 메서드 없음이다`() {
        assertEquals(Presence.NO_METHOD, probe.presence("$owner.addedLater"))
    }

    // 메서드를 훑으면 인자 타입까지 올라와 로더마다 클래스가 늘고 조작이 느려진다 — 트리가 빈 성공 렌더에서만 훑는다(RenderVerdict)
    @Test fun `메서드를 보지 않으면 클래스만 판정한다`() {
        assertEquals(Presence.FOUND, probe.presence("$owner.addedLater", checkMethod = false))
        assertEquals(Presence.NO_CLASS, probe.presence("missing.NowhereKt.Preview", checkMethod = false))
    }

    @Test fun `클래스가 없으면 클래스 없음이다`() {
        assertEquals(Presence.NO_CLASS, probe.presence("missing.NowhereKt.Preview"))
    }

    // value class 인자 · 멤버 프리뷰는 JVM 이름이 `이름-해시`다 — 렌더러는 그 이름도 찾아 그린다
    @Test fun `맹글링된 이름과 상위 클래스의 메서드도 찾았다`() {
        assertEquals(Presence.FOUND, probe.presence("$owner.mangled"))
        assertEquals(Presence.FOUND, probe.presence("$owner.inherited"))
    }

    @Test fun `로더를 모르면 판정하지 않는다`() {
        assertEquals(Presence.FOUND, PreviewProbe(null).presence("missing.NowhereKt.Preview"))
    }

    @Test fun `메서드가 없으면 렌더 결과와 상관없이 빈 그림이다`() {
        assertEquals(Blank.NO_METHOD, RenderVerdict.blank(Presence.NO_METHOD, succeeded = true, treeEmpty = false))
        assertEquals(Blank.NO_METHOD, RenderVerdict.blank(Presence.NO_METHOD, succeeded = false, treeEmpty = true))
    }

    // 원래 비어 있는 화면도 있어 실패가 아니라 경고로 싣는다(RenderVerdict.of)
    @Test fun `성공했는데 트리가 비면 빈 그림이다`() {
        assertEquals(Blank.EMPTY_TREE, RenderVerdict.blank(Presence.FOUND, succeeded = true, treeEmpty = true))
    }

    // 실패한 렌더의 빈 트리는 그 실패가 말한다 — 빈 그림으로 덮지 않는다
    @Test fun `실패한 렌더의 빈 트리나 트리가 있는 성공은 빈 그림이 아니다`() {
        assertEquals(null, RenderVerdict.blank(Presence.FOUND, succeeded = false, treeEmpty = true))
        assertEquals(null, RenderVerdict.blank(Presence.FOUND, succeeded = true, treeEmpty = false))
    }

    @Suppress("unused")
    private open class BasePreviews {
        fun inherited() {}
    }

    @Suppress("unused")
    private class StubPreviews : BasePreviews() {
        fun filled() {}

        @JvmName("mangled-1a2b")
        fun mangled() {}
    }
}
