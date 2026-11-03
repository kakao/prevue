package prevue.daemon.adapter.http.mapper

import java.io.File
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import prevue.daemon.entity.Progress
import prevue.daemon.entity.Semantics
import prevue.daemon.entity.ViewNode
import prevue.daemon.domain.model.GoneItem
import prevue.daemon.domain.model.TabView
import prevue.daemon.domain.model.SeenItem
import prevue.daemon.domain.model.Miss
import prevue.daemon.domain.model.TypeResult
import prevue.daemon.domain.model.WaitResult
import prevue.daemon.domain.policy.NodeTarget

/** 스킬 · 사람이 읽는 실패 문구 — 다음에 칠 명령을 그대로 담고 있어 글자가 바뀌면 안내가 어긋난다. */
class ResultMapperTest {
    private val node = ViewNode("Row", "Cards.kt", 3, 0, 0, 10, 10)

    @Test fun `겨냥이 빗나간 문구`() {
        assertEquals(
            "Cards.kt:3 에 노드가 2개다 — #N 으로 고른다(목록 아이템은 목록 전체에서 N번째, 아니면 읽는 순서)",
            Miss.Choose("Cards.kt:3", NodeTarget.inReadingOrder(listOf(node, node))).toJson()["error"],
        )
        assertEquals("choose", Miss.Choose("Cards.kt:3", NodeTarget.inReadingOrder(listOf(node))).toJson()["need"])
        assertEquals(
            "Cards.kt:3#40 은 지금 화면에 없다",
            Miss.OffScreen("Cards.kt:3#40", emptyList()).toJson()["error"],
        )
        assertEquals(
            "Cards.kt:3#25 — 그 줄의 후보는 2개다(읽는 순서, 마지막 Cards.kt:3#2). 게으른 목록의 아이템이면 목록 순번을 못 읽은 것이다 — matches 에서 다시 고른다",
            Miss.NoSuch("Cards.kt:3#25", 25, NodeTarget.inReadingOrder(listOf(node, node))).toJson()["error"],
        )
        assertEquals("Cards.kt:3#30 — 목록은 25개다", Miss.NoSuch("Cards.kt:3#30", 30, NodeTarget.inReadingOrder(listOf(node)), 25).toJson()["error"])
        assertEquals("Cards.kt:3 의 노드가 지금 화면의 트리에 없다", Miss.Missing("Cards.kt:3").toJson()["error"])
    }

    @Test fun `포커스된 필드가 없을 때의 문구`() {
        assertEquals(
            mapOf("ok" to false, "error" to "포커스된 텍스트 필드가 없다 — 먼저 prevue touch --at <파일>:<라인> 으로 필드를 누른다", "why" to "x"),
            TypeResult.NoField("x").toJson(),
        )
    }

    @Test fun `인터랙티브 중인 보드의 wait 문구`() {
        val r = WaitResult.BoardDone(File("/a/B.kt"), 1, complete = false, waitedMs = 5, stale = emptyMap(), cards = emptyList(), interactiveCard = 2).toJson()
        assertEquals(2, r["interactive"])
        assertEquals(
            "카드 2 가 인터랙티브(사람이 뷰어에서 조작 중일 수 있다)라 다른 카드는 다시 그리지 않았다 — " +
                "카드 2 말고는 저장 전 그림이다. 조작이 끝나면(prevue focus 2 --off) 나머지를 그린다",
            r["message"],
        )
    }

    @Test fun `시맨틱은 Compose 이름 그대로, 값 있는 키만, 동작은 배열 하나`() {
        val s = Semantics(
            text = "행 3", role = "Checkbox", toggleableState = "Off", selected = false,
            progress = Progress(0.3f, 0f, 1f, 0), actions = setOf("setText", "click"),
        )
        assertEquals(
            mapOf(
                "text" to "행 3", "role" to "Checkbox", "selected" to false, "toggleableState" to "Off",
                "progress" to mapOf("current" to 0.3f, "min" to 0f, "max" to 1f), "actions" to listOf("click", "setText"),
            ),
            s.toJson(),
        )
        assertEquals(mapOf("heading" to true, "disabled" to true, "focused" to true), Semantics(heading = true, disabled = true, focused = true).toJson())
        assertEquals(mapOf("current" to 2f, "min" to 0f, "max" to 4f, "steps" to 3), Semantics(progress = Progress(2f, 0f, 4f, 3)).toJson()["progress"])
    }

    @Test fun `탭은 KMP 소스 세트가 있을 때만 싣는다`() {
        val f = File("/r/feature/a/src/commonMain/kotlin/Screen.kt")
        assertEquals("commonMain", TabView(f.path, f, null, ":feature:a", active = true, stale = false, sourceSet = "commonMain").toJson()["sourceSet"])
        assertEquals(false, TabView(f.path, f, null, ":app", active = true, stale = false).toJson().containsKey("sourceSet"))
    }

    @Test fun `아이템은 없는 값을 싣지 않는다`() {
        assertEquals(mapOf("index" to 6007, "box" to listOf(1, 2, 3, 4), "visible" to 1.0), SeenItem(6007, null, listOf(1, 2, 3, 4), 1.0, null, null).toJson())
        assertEquals(mapOf("index" to 0, "key" to 1), GoneItem(0, 1, null).toJson())
    }
}
