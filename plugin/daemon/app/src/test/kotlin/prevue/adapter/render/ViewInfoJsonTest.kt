package prevue.adapter.render

import com.android.ide.common.rendering.api.ViewInfo
import java.io.File
import java.net.URLClassLoader
import java.nio.file.Path
import javax.tools.ToolProvider
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir

class ViewInfoJsonTest {
    @TempDir lateinit var dir: Path

    // 진짜 ui-tooling 과 같은 이름이라 테스트 출력에 두면 통합 테스트의 렌더 클래스패스를 가린다 — 제 로더에만 싣는다
    private fun adapterWithoutTreeGetter(): Any {
        val src = File(dir.toFile(), "androidx/compose/ui/tooling/ComposeViewAdapter.java").apply {
            parentFile.mkdirs()
            writeText("package androidx.compose.ui.tooling; public class ComposeViewAdapter { public java.util.List<Object> getViewInfos() { return null; } }")
        }
        val javac = ToolProvider.getSystemJavaCompiler()
        assertEquals(0, javac.run(null, null, null, "-d", dir.toString(), src.path))
        return URLClassLoader(arrayOf(dir.toUri().toURL()), null).loadClass("androidx.compose.ui.tooling.ComposeViewAdapter")
            .getConstructor().newInstance()
    }

    private fun node(name: String, b: List<Int>, vararg children: Map<String, Any?>) =
        mapOf("name" to name, "fileName" to "A.kt", "lineNumber" to 1, "bounds" to b, "children" to children.toList())

    // 아이템을 감싼 같은 박스의 그룹은 클립이 아니다 — 넣으면 잘린 카드의 보이는 자리가 카드 자신으로 좁아져 "다 보인다"가 된다
    @Test fun `노드마다 자기를 넘는 넓이 있는 조상 박스의 교집합을 싣는다`() {
        val tree = listOf(
            node("Root", listOf(0, 0, 1000, 2000),
                node("Grid", listOf(0, 213, 1000, 2000),
                    node("Group", listOf(0, 0, 0, 0),
                        node("Item", listOf(489, -93, 903, 225),
                            node("Card", listOf(489, -93, 903, 225), node("Name", listOf(500, -50, 800, 0))))))),
        )
        val boxes = ViewInfoJson.nodes(tree).associate { it.name to it.ancestorsBox }
        assertEquals(null, boxes["Root"])
        assertEquals(listOf(0, 0, 1000, 2000), boxes["Grid"])
        assertEquals(listOf(0, 213, 1000, 2000), boxes["Card"])
        assertEquals(listOf(489, 213, 903, 225), boxes["Name"])
    }

    private fun view(name: String, viewObject: Any?, vararg children: ViewInfo) =
        ViewInfo(name, null, 0, 0, 100, 100, viewObject, null, null).apply { setChildren(children.toList()) }

    @Test fun `ui-tooling 판이 트리 접근자를 갖지 않으면 그 이름을 판 짝 실패로 낸다`() {
        val roots = listOf(view("FrameLayout", null, view("ComposeViewAdapter", adapterWithoutTreeGetter())))
        assertEquals("ComposeViewAdapter.getViewInfos\$ui_tooling", ViewInfoJson.toolingMismatch(roots))
        assertEquals(emptyList<Any>(), ViewInfoJson.compose(roots))
    }

    @Test fun `Compose 프리뷰가 아니면 판 짝을 묻지 않는다`() {
        assertEquals(null, ViewInfoJson.toolingMismatch(listOf(view("FrameLayout", Any()))))
    }
}
