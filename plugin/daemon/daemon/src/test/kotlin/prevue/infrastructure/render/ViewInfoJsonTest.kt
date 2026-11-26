package prevue.infrastructure.render

import com.android.ide.common.rendering.api.ViewInfo
import java.io.File
import java.net.URLClassLoader
import java.nio.file.Path
import javax.tools.ToolProvider
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir

class ViewInfoJsonTest {
    @TempDir lateinit var dir: Path

    private class Fake(
        val tree: String = "N.n(\"Root\", 2)",
        val record: Boolean = true,
        val makeTree: Boolean = true,
        val lineGetter: Boolean = true,
    )

    // 진짜 ui-tooling 과 같은 이름이라 테스트 출력에 두면 통합 테스트의 렌더 클래스패스를 가린다 — 제 로더에만 싣는다.
    // Kotlin 함수 타입은 제 로더의 stdlib 것이라 데몬의 Function 과 다른 클래스다 — 진짜 렌더 로더와 같은 처지다
    private fun fakeAdapter(fake: Fake): Any {
        val runtime = "androidx.compose.runtime.tooling"
        val data = "androidx.compose.ui.tooling.data"
        val sources = mapOf(
            "$runtime.CompositionData" to "public interface CompositionData {}",
            "$runtime.CompositionGroup" to "public interface CompositionGroup { Object getNode(); }",
            "$runtime.CompositionInstance" to "public interface CompositionInstance {}",
            "androidx.compose.ui.unit.IntRect" to "public final class IntRect { int[] e; public IntRect(int... e) { this.e = e; }" +
                " public int getLeft() { return e[0]; } public int getTop() { return e[1]; }" +
                " public int getRight() { return e[2]; } public int getBottom() { return e[3]; } }",
            "$data.SourceLocation" to "public final class SourceLocation { int h;" +
                " public SourceLocation(int h) { this.h = h; } public String getSourceFile() { return \"A.kt\"; }" +
                (if (fake.lineGetter) " public int getLineNumber() { return h * 10; }" else "") +
                " public int getPackageHash() { return h; } }",
            "$data.SourceContext" to "public interface SourceContext { String getName();" +
                " androidx.compose.ui.unit.IntRect getBounds(); SourceLocation getLocation(); }",
            "$data.ContextCache" to "public final class ContextCache {}",
            "$data.N" to "import java.util.*; public final class N implements $runtime.CompositionGroup, SourceContext {" +
                " String name; Integer h; N[] c; N[] s = {};" +
                " public static N n(String name, Integer h, N... c) { N n = new N(); n.name = name; n.h = h; n.c = c; return n; }" +
                " public N stitch(N... s) { this.s = s; return this; }" +
                " public Object getNode() { return null; } public String getName() { return name; }" +
                " public androidx.compose.ui.unit.IntRect getBounds() { return new androidx.compose.ui.unit.IntRect(0, 0, 10, 10); }" +
                " public SourceLocation getLocation() { return h == null ? null : new SourceLocation(h); } }",
            "$data.D" to "public final class D implements $runtime.CompositionData { public final N root; public D(N root) { this.root = root; } }",
            "$data.CompositionDataTreeKt" to "import java.util.*; import kotlin.jvm.functions.*; public final class CompositionDataTreeKt {" +
                (if (!fake.makeTree) "" else
                    " public static List makeTree(Set set, Function1 prepare, Function4 factory, Function3 result, ContextCache cache) {" +
                        " List out = new ArrayList(); for (Object d : set) out.add(result.invoke(null, build(((D) d).root, factory, result), List.of()));" +
                        " return out; }" +
                        " static Object build(N n, Function4 f, Function3 r) {" +
                        " List kids = new ArrayList(); for (N c : n.c) kids.add(build(c, f, r));" +
                        " List st = new ArrayList(); for (N c : n.s) st.add(r.invoke(null, build(c, f, r), List.of()));" +
                        " return f.invoke(n, n, kids, st); }") + " }",
            "androidx.compose.ui.tooling.CompositionDataRecord" to "public interface CompositionDataRecord { java.util.Set getStore(); }",
            "androidx.compose.ui.tooling.ComposeViewAdapter" to "import $data.*; public class ComposeViewAdapter {" +
                (if (!fake.record) "" else
                    " private final CompositionDataRecord slotTableRecord = () -> java.util.Set.of(new D(${fake.tree}));") + " }",
        )
        val files = sources.map { (fqn, body) ->
            val pkg = fqn.substringBeforeLast('.')
            File(dir.toFile(), fqn.replace('.', '/') + ".java").apply { parentFile.mkdirs(); writeText("package $pkg; $body") }
        }
        val stdlib = File(Unit::class.java.protectionDomain.codeSource.location.toURI())
        val javac = ToolProvider.getSystemJavaCompiler()
        val args = listOf("-nowarn", "-cp", stdlib.path, "-d", dir.toString()) + files.map { it.path }
        assertEquals(0, javac.run(null, null, null, *args.toTypedArray()))
        return URLClassLoader(arrayOf(dir.toUri().toURL(), stdlib.toURI().toURL()), null)
            .loadClass("androidx.compose.ui.tooling.ComposeViewAdapter").getConstructor().newInstance()
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

    private fun roots(fake: Fake) = listOf(view("FrameLayout", null, view("ComposeViewAdapter", fakeAdapter(fake))))

    private fun composed(tree: String, origins: (Int) -> ComposableOrigin? = { null }): List<Map<String, Any?>> =
        ViewInfoJson.compose(ViewInfoJson.read(roots(Fake(tree)))!!.second, origins)

    private fun flat(tree: List<*>): Map<String, Map<*, *>> = buildMap {
        fun walk(list: List<*>) {
            for (n in list) { val m = n as Map<*, *>; put(m["name"] as String, m); walk(m["children"] as List<*>) }
        }
        walk(tree)
    }

    @Test fun `출처는 안쪽 노드 중 부른 자리와 다른 패키지, 없으면 첫 안쪽 노드의 패키지다 — 모르면 싣지 않는다`() {
        val known = mapOf(1 to ComposableOrigin.COMPOSE, 2 to ComposableOrigin.PROJECT, 3 to ComposableOrigin.LIBRARY)
        val origins = flat(composed(
            "N.n(\"Screen\", 2," +
                " N.n(\"Row\", 2, N.n(\"rowLayout\", 1))," +
                " N.n(\"Card\", 2, N.n(\"group\", null), N.n(\"cardBody\", 2))," +
                " N.n(\"Image\", 2, N.n(\"imageBody\", 3))," +
                " N.n(\"Stripped\", 2, N.n(\"noSource\", null))," +
                " N.n(\"Unknown\", 2, N.n(\"elsewhere\", 9))," +
                " N.n(\"Leaf\", 2)," +
                " N.n(\"Constraint\", 2, N.n(\"callerLambda\", 2), N.n(\"libraryBody\", 3))," +
                " N.n(\"Wrapped\", 2, N.n(\"group\", null, N.n(\"wrappedBody\", 3))))",
            known::get,
        )).mapValues { it.value["origin"] }
        assertEquals("project", origins["Screen"])
        assertEquals("compose", origins["Row"])
        assertEquals("project", origins["Card"])
        assertEquals("library", origins["Image"])
        assertEquals(null, origins["Stripped"])
        assertEquals(null, origins["Unknown"])
        assertEquals(null, origins["Leaf"])
        assertEquals("library", origins["Constraint"])
        assertEquals("library", origins["Wrapped"])
    }

    @Test fun `노드는 위치의 파일 · 줄 · 영역을 싣고 이어 붙인 서브컴포지션을 제 자식 뒤에 둔다`() {
        val nodes = flat(composed("N.n(\"Lazy\", 4, N.n(\"header\", 5)).stitch(N.n(\"item\", 6), N.n(\"bare\", null))"))
        val lazy = nodes.getValue("Lazy")
        assertEquals(listOf("A.kt", 40, listOf(0, 0, 10, 10)), listOf(lazy["fileName"], lazy["lineNumber"], lazy["bounds"]))
        assertEquals(listOf("header", "item", "bare"), (lazy["children"] as List<*>).map { (it as Map<*, *>)["name"] })
        assertEquals(listOf("", -1), listOf(nodes.getValue("bare")["fileName"], nodes.getValue("bare")["lineNumber"]))
    }

    @Test fun `어댑터에 컴포지션 기록 필드가 없으면 그 이름을 판 짝 실패로 내고 트리를 짓지 않는다`() {
        val roots = roots(Fake(record = false))
        assertEquals("ComposeViewAdapter.slotTableRecord", ViewInfoJson.toolingMismatch(roots))
        assertThrows(IllegalStateException::class.java) { ViewInfoJson.read(roots) }
    }

    @Test fun `ui-tooling-data에 트리 함수가 없으면 그 이름을 판 짝 실패로 낸다`() {
        assertEquals("CompositionDataTreeKt.makeTree", ViewInfoJson.toolingMismatch(roots(Fake(makeTree = false))))
    }

    @Test fun `위치가 줄 getter를 갖지 않으면 빈 자리 대신 그 이름을 판 짝 실패로 낸다`() {
        assertEquals("SourceLocation.getLineNumber", ViewInfoJson.toolingMismatch(roots(Fake(lineGetter = false))))
    }

    @Test fun `표면이 다 있으면 판 짝 실패가 아니고, Compose 프리뷰가 아니면 보지 않는다`() {
        assertEquals(null, ViewInfoJson.toolingMismatch(roots(Fake())))
        assertEquals(null, ViewInfoJson.toolingMismatch(listOf(view("FrameLayout", null))))
        assertEquals(null, ViewInfoJson.read(listOf(view("FrameLayout", null))))
    }
}
