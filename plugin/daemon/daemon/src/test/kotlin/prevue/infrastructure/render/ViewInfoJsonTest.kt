package prevue.infrastructure.render

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
    private fun fakeTooling(adapterBody: String, viewInfoBody: String = ""): Any {
        val pkg = File(dir.toFile(), "androidx/compose/ui/tooling").apply { mkdirs() }
        val adapter = File(pkg, "ComposeViewAdapter.java").apply {
            writeText("package androidx.compose.ui.tooling; public class ComposeViewAdapter { $adapterBody }")
        }
        val viewInfo = File(pkg, "ViewInfo.java").apply {
            writeText("package androidx.compose.ui.tooling; public class ViewInfo { $viewInfoBody }")
        }
        val javac = ToolProvider.getSystemJavaCompiler()
        assertEquals(0, javac.run(null, null, null, "-d", dir.toString(), adapter.path, viewInfo.path))
        return URLClassLoader(arrayOf(dir.toUri().toURL()), null).loadClass("androidx.compose.ui.tooling.ComposeViewAdapter")
            .getConstructor().newInstance()
    }

    private fun adapterWithoutTreeGetter() = fakeTooling("public java.util.List<Object> getViewInfos() { return null; }")

    private fun adapterWithNode(nodeGetters: String) = fakeTooling(
        "public java.util.List<ViewInfo> getViewInfos\$ui_tooling() { return java.util.List.of(new ViewInfo()); }",
        nodeGetters + " public java.util.List<ViewInfo> getChildren() { return java.util.List.of(); }" +
            " public Edges getBounds() { return new Edges(); }" +
            " public static class Edges { public int getLeft() { return 0; } public int getTop() { return 0; }" +
            " public int getRight() { return 0; } public int getBottom() { return 0; } }",
    )

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

    private fun adapterWithTree(tree: String) = fakeTooling(
        "public java.util.List<ViewInfo> getViewInfos\$ui_tooling() { return java.util.List.of($tree); }",
        "String n; Integer h; ViewInfo[] c;" +
            " public ViewInfo(String n, Integer h, ViewInfo... c) { this.n = n; this.h = h; this.c = c; }" +
            " public String getName() { return n; } public String getFileName() { return \"A.kt\"; } public int getLineNumber() { return 1; }" +
            " public java.util.List<ViewInfo> getChildren() { return java.util.List.of(c); }" +
            " public Loc getLocation() { return h == null ? null : new Loc(h); }" +
            " public Edges getBounds() { return new Edges(); }" +
            " public static class Loc { int h; Loc(int h) { this.h = h; } public int getPackageHash() { return h; } }" +
            " public static class Edges { public int getLeft() { return 0; } public int getTop() { return 0; }" +
            " public int getRight() { return 10; } public int getBottom() { return 10; } }",
    )

    private fun originsOf(tree: String): Map<String, Any?> {
        val known = mapOf(1 to ComposableOrigin.COMPOSE, 2 to ComposableOrigin.PROJECT, 3 to ComposableOrigin.LIBRARY)
        val out = HashMap<String, Any?>()
        fun walk(list: List<*>) {
            for (n in list) { val m = n as Map<*, *>; out[m["name"] as String] = m["origin"]; walk(m["children"] as List<*>) }
        }
        walk(ViewInfoJson.compose(listOf(view("ComposeViewAdapter", adapterWithTree(tree))), known::get))
        return out
    }

    @Test fun `출처는 안쪽 노드 중 부른 자리와 다른 패키지, 없으면 첫 안쪽 노드의 패키지다 — 모르면 싣지 않는다`() {
        val origins = originsOf(
            "new ViewInfo(\"Screen\", 2," +
                " new ViewInfo(\"Row\", 2, new ViewInfo(\"rowLayout\", 1))," +
                " new ViewInfo(\"Card\", 2, new ViewInfo(\"group\", null), new ViewInfo(\"cardBody\", 2))," +
                " new ViewInfo(\"Image\", 2, new ViewInfo(\"imageBody\", 3))," +
                " new ViewInfo(\"Stripped\", 2, new ViewInfo(\"noSource\", null))," +
                " new ViewInfo(\"Unknown\", 2, new ViewInfo(\"elsewhere\", 9))," +
                " new ViewInfo(\"Leaf\", 2)," +
                " new ViewInfo(\"Constraint\", 2, new ViewInfo(\"callerLambda\", 2), new ViewInfo(\"libraryBody\", 3))," +
                " new ViewInfo(\"Wrapped\", 2, new ViewInfo(\"group\", null, new ViewInfo(\"wrappedBody\", 3))))",
        )
        assertEquals("project", origins["Screen"])
        assertEquals("compose", origins["Row"])
        assertEquals("project", origins["Card"])
        assertEquals("library", origins["Image"])
        assertEquals(null, origins["Stripped"])
        assertEquals(null, origins["Unknown"])
        assertEquals(null, origins["Leaf"])
        assertEquals("library", origins["Constraint"])
        assertEquals("library", origins["Wrapped"])   // 위치 없는 그룹은 건너 안쪽의 첫 위치를 본다   // 부른 쪽 콘텐츠 람다가 먼저 와도 부른 자리와 다른 패키지를 고른다
    }

    @Test fun `ui-tooling 판이 트리 접근자를 갖지 않으면 그 이름을 판 짝 실패로 낸다`() {
        val roots = listOf(view("FrameLayout", null, view("ComposeViewAdapter", adapterWithoutTreeGetter())))
        assertEquals("ComposeViewAdapter.getViewInfos\$ui_tooling", ViewInfoJson.toolingMismatch(roots))
        assertEquals(emptyList<Any>(), ViewInfoJson.compose(roots))
    }

    @Test fun `ui-tooling 노드가 위치 getter를 갖지 않으면 빈 자리 대신 그 이름을 판 짝 실패로 낸다`() {
        val roots = listOf(view("ComposeViewAdapter", adapterWithNode("public String getFileName() { return \"A.kt\"; }")))
        assertEquals("ViewInfo.getLineNumber", ViewInfoJson.toolingMismatch(roots))
    }

    @Test fun `ui-tooling 노드가 위치 getter를 다 가지면 판 짝 실패가 아니다`() {
        val getters = "public String getFileName() { return \"A.kt\"; } public int getLineNumber() { return 1; }"
        assertEquals(null, ViewInfoJson.toolingMismatch(listOf(view("ComposeViewAdapter", adapterWithNode(getters)))))
    }
}
