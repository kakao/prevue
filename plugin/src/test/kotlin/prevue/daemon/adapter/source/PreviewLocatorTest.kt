package prevue.daemon.adapter.source

import java.io.File
import java.nio.file.Files
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

/**
 * 소스 + 클래스 파일로 `@Preview`를 찾는다. 픽스처(`prevue.fixture.preview`)는 공개 저장소에서 본 모양을 옮긴 것이고,
 * 테스트가 그 소스와 함께 컴파일된 클래스 파일을 읽는다 — 이름을 아는 애노테이션은 없다.
 */
class PreviewLocatorTest {
    private val classPath = System.getProperty("java.class.path").split(File.pathSeparator)
    private val screens = File("src/test/kotlin/prevue/fixture/preview/Screens.kt")
    private val workDir = lazy { Files.createTempDirectory("prevue-src").toFile() }
    /**
     * 클래스 파일보다 옛것으로 찍은 소스 복사본 — 클래스 파일을 읽는 길을 늘 탄다. 원본을 그대로 읽으면 판정이 디스크의 mtime 순서에 걸린다:
     * 내용 없이 mtime만 새로워진 소스(체크아웃 · 일괄 치환)는 Gradle이 다시 컴파일하지 않아 클래스 파일이 소스보다 옛것으로 남는다.
     */
    private val compiled by lazy { screensAt("old", 1_000L) }

    private fun screensAt(dir: String, mtime: Long): File =
        screens.copyTo(File(workDir.value, "$dir/${screens.name}")).also { check(it.setLastModified(mtime)) { "mtime을 못 찍었다: $it" } }

    @AfterEach fun tearDown() { if (workDir.isInitialized()) workDir.value.deleteRecursively() }

    private fun previews(file: File = compiled, multi: MultiPreview = MultiPreview(classPath)) =
        PreviewLocator.fromFile(file, multi).groupBy({ it.fqn.substringAfterLast('.') }, { it.params })

    @Test fun `직접 단 Preview 의 상수 참조는 클래스 파일에 접힌 값으로 읽는다`() {
        assertEquals(
            listOf(
                mapOf("name" to "Post screen navrail", "device" to "id:pixel_c"),
                mapOf("name" to "Post screen navrail (dark)", "uiMode" to "33", "device" to "id:pixel_c"),
            ),
            previews()["NavRail"],
        )
    }

    @Test fun `클래스 파일이 소스보다 오래됐으면 소스의 리터럴로 읽는다 — 저장 뒤 컴파일 전`() {
        val copy = screensAt("new", System.currentTimeMillis() + 86_400_000)
        // Devices.PIXEL_C는 소스로 풀 수 없어 빠지고, `or`로 합친 uiMode는 알려진 상수라 푼다.
        assertEquals(
            listOf(mapOf("name" to "Post screen navrail"), mapOf("name" to "Post screen navrail (dark)", "uiMode" to "33")),
            previews(copy)["NavRail"],
        )
    }

    @Test fun `직접 만든 멀티프리뷰를 푼다`() {
        assertEquals(
            listOf(mapOf("name" to "Day", "fontScale" to "1.0"), mapOf("name" to "Night", "uiMode" to "32", "fontScale" to "1.0")),
            previews()["Home"],
        )
    }

    @Test fun `Preview 와 멀티프리뷰를 함께 단 멀티프리뷰는 각자 펼친다`() {
        // 순서는 소스 순서가 아니다 — 클래스 파일이 RUNTIME(직접 만든 것)과 BINARY(`@Preview`) 애노테이션을 따로 담는다.
        assertEquals(
            listOf("dark theme", "large font", "phone", "small font", "tablet"),
            previews()["Card"]!!.map { it.getValue("name") }.sorted(),
        )
    }

    @Test fun `한 함수에 멀티프리뷰 둘 · Preview 하나짜리 멀티프리뷰`() {
        assertEquals(
            listOf(
                mapOf("name" to "Light", "device" to "spec:width=891dp,height=411dp"),
                mapOf("name" to "Dark", "uiMode" to "33", "device" to "spec:width=891dp,height=411dp"),
                mapOf("name" to "Tall", "heightDp" to "1200"),
            ),
            previews()["Both"],
        )
    }

    @Test fun `별칭으로 import 한 Preview 도 Preview 다`() {
        assertEquals(listOf(mapOf("name" to "aliased", "widthDp" to "200")), previews()["Aliased"])
    }

    @Test fun `멀티프리뷰 선언이 오버레이에서 바뀌면 다음 읽기에 맞는다`() {
        val overlay = Files.createTempDirectory("prevue-overlay").toFile()
        val multi = MultiPreview(listOf(overlay.path) + classPath)
        val dayNight = "prevue.fixture.preview.DayNight"
        assertEquals(2, multi.expand(dayNight).size)
        // 핫 컴파일이 오버레이에 새 클래스를 쓴 것처럼 — 선언이 `@Preview` 하나로 바뀌었다.
        val tall = classPath.map { File(it, "prevue/fixture/preview/Tall.class") }.first { it.isFile }
        val target = File(overlay, "prevue/fixture/preview/DayNight.class").apply { parentFile.mkdirs() }
        tall.copyTo(target)
        assertEquals(listOf(mapOf("name" to "Tall", "heightDp" to "1200")), multi.expand(dayNight))
        target.delete()
        assertEquals(2, multi.expand(dayNight).size)
        overlay.deleteRecursively()
    }

    @Test fun `클래스 파일 없이 소스만으로 — 파사드 · 장마다 id · 제공자 · 끼어든 선언`() {
        val dir = Files.createTempDirectory("prevue-src").toFile()
        val file = File(dir, "gallery.kt").apply {
            writeText(
                """
                @file:JvmName("Gallery")
                package demo.ui

                import androidx.compose.ui.tooling.preview.Preview
                import androidx.compose.ui.tooling.preview.PreviewParameter
                import demo.data.Users as People

                @Preview(name = "a", widthDp = 200)
                @Preview(name = "b", device = Devices.PIXEL_4)
                @Composable
                fun Grid(@PreviewParameter(People::class, limit = 2) user: User, onClick: () -> Unit, label: String = "x, y") {}

                @Preview
                val notAFunction = 1

                fun after() {}

                @Preview
                @Composable
                private fun Single(@PreviewParameter(provider = demo.data.Fqn::class) x: X) {}
                """.trimIndent(),
            )
        }
        try {
            val specs = PreviewLocator.fromFile(file)
            assertEquals(listOf("demo.ui.Gallery.Grid", "demo.ui.Gallery.Grid", "demo.ui.Gallery.Single"), specs.map { it.fqn })
            assertEquals(listOf("Grid", "Grid_1", "Single"), specs.map { it.previewId })
            assertEquals(listOf(0, 1, 2), specs.map { it.index })
            assertEquals(listOf(mapOf("name" to "a", "widthDp" to "200"), mapOf("name" to "b"), emptyMap()), specs.map { it.params })
            assertEquals(listOf(mapOf("provider" to "demo.data.Users", "limit" to "2")), specs[0].methodParams)
            assertEquals(listOf(mapOf("provider" to "demo.data.Fqn")), specs[2].methodParams)
        } finally {
            dir.deleteRecursively()
        }
    }

    @Test fun `파일 이름이 파사드가 되고 패키지가 없으면 앞에 붙이지 않는다`() {
        val dir = Files.createTempDirectory("prevue-src").toFile()
        val file = File(dir, "screens.kt").apply { writeText("@Preview\nfun A() {}\n") }
        try {
            assertEquals(listOf("ScreensKt.A"), PreviewLocator.fromFile(file).map { it.fqn })
        } finally {
            dir.deleteRecursively()
        }
    }

    @Test fun `최상위 쉼표만 자른다 — 괄호 · 대괄호 · 제네릭 · 문자열 · 화살표`() {
        assertEquals(
            listOf("a: () -> Unit", "b: Map<String, Int>", "c: String = \"x, \\\"y\"", "d: List<(Int, Int) -> Unit>", "e = f(1, [2, 3])"),
            PreviewLocator.splitTopLevel("a: () -> Unit, b: Map<String, Int>, c: String = \"x, \\\"y\", d: List<(Int, Int) -> Unit>, e = f(1, [2, 3]) , "),
        )
        assertEquals(listOf(">x", "a > b", "y"), PreviewLocator.splitTopLevel(">x, a > b, y"))
        assertEquals(listOf("m: Map<() -> Unit, Int>", "n"), PreviewLocator.splitTopLevel("m: Map<() -> Unit, Int>, n"))
    }

    @Test fun `이름 인자는 a = b 뿐이다 — 같지 않음 · 같음 비교는 위치 인자다`() {
        assertEquals(mapOf("name" to "x != y"), PreviewLocator.parseArgsRaw("x != y"))
        assertEquals(mapOf("name" to "x == y"), PreviewLocator.parseArgsRaw("x == y"))
        assertEquals(mapOf("name" to "P::class", "limit" to "3"), PreviewLocator.parseArgsRaw("P::class, limit = 3"))
        assertEquals(
            mapOf("name" to "n", "fontScale" to "1.5", "backgroundColor" to "4294967295", "widthDp" to "1000"),
            PreviewLocator.parseArgs("\"n\", fontScale = 1.5f, backgroundColor = 0xFFFF_FFFF, widthDp = 1_000, device = Devices.PIXEL_4"),
        )
    }

    @Test fun `소스 대비책은 코틀린 or 와 FQN 으로 쓴 Configuration 상수를 푼다`() {
        assertEquals(
            mapOf("uiMode" to "33"),
            PreviewLocator.parseArgs("uiMode = android.content.res.Configuration.UI_MODE_NIGHT_YES or Configuration.UI_MODE_TYPE_NORMAL"),
        )
        assertEquals(mapOf("uiMode" to "33"), PreviewLocator.parseArgs("uiMode = UI_MODE_NIGHT_YES | UI_MODE_TYPE_NORMAL"))
    }
}
