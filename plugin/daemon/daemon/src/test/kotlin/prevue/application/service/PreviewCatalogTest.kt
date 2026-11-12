package prevue.application.service

import app.cash.turbine.test
import java.io.File
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import prevue.daemon.fake.Fixture
import prevue.application.port.SourceChange
import prevue.application.domain.model.WorkspaceEvent

/** D-56. 빠른 열기의 목록 — 이 데몬이 열 수 있는 프리뷰 파일만, 목록이 바뀔 때만 알린다. */
class PreviewCatalogTest {
    private val fx = Fixture(previews = 2)
    private val uc = fx.graph()

    @AfterEach fun tearDown() = fx.close()

    private fun filesChanged() = uc.workspace.events.filter { it == WorkspaceEvent.PreviewFilesChanged }
    private fun names() = uc.status.readPreviewFiles()!!.map { it.file.name }.sorted()
    private fun change(changed: List<File> = emptyList(), created: List<File> = emptyList(), deleted: List<File> = emptyList()) =
        runBlocking { uc.watchers.indexPreviewFiles(SourceChange(changed, 0, 0, 0, created, deleted)) }

    @Test fun `처음 훑으면 프리뷰가 있는 파일만 함수와 함께 실린다`() {
        assertNull(uc.status.readPreviewFiles())   // 다 훑기 전에는 "없다"가 아니라 "모른다"
        fx.libFile                            // 프리뷰 없는 의존 모듈 파일
        runBlocking {
            filesChanged().test {
                uc.watchers.indexPreviewFiles()
                awaitItem()
            }
        }
        val files = uc.status.readPreviewFiles()!!
        assertEquals(listOf("Cards.kt"), files.map { it.file.name })   // Dup.kt · Theme.kt는 프리뷰가 없다
        assertEquals(listOf("Card0", "Card1"), files.single().functions)
        assertEquals(":app", files.single().module)
    }

    @Test fun `새 파일 · 프리뷰 변화 · 삭제는 알리고 mtime만 바뀐 저장은 조용하다`() {
        runBlocking {
            filesChanged().test {
                uc.watchers.indexPreviewFiles()
                awaitItem()                                          // 처음 훑기의 알림 — 아래 단계의 알림과 섞이지 않게 먼저 받는다

                val other = fx.previewFile("Other")
                change(created = listOf(other))
                assertEquals(listOf("Cards.kt", "Other.kt"), names())
                awaitItem()

                fx.file.setLastModified(fx.file.lastModified() + 2_000)
                change(changed = listOf(fx.file))
                expectNoEvents()

                fx.file.appendText("@Preview\nfun Card9() {}\n")
                change(changed = listOf(fx.file))
                assertEquals(listOf("Card0", "Card1", "Card9"), uc.status.readPreviewFiles()!!.first { it.file.name == "Cards.kt" }.functions)
                awaitItem()

                other.delete()
                change(deleted = listOf(other))
                assertEquals(listOf("Cards.kt"), names())
                awaitItem()
            }
        }
    }

    private fun calls(name: String) = uc.status.readPreviewFiles()!!.single { it.file.name == name }.calls

    private fun screens() = File(fx.srcRoot, "demo/Screens.kt").apply {
        writeText("""
            package demo
            @Composable fun Banner() { Text("x") }
            @Preview @Composable fun ScreenPreview() { AppTheme { Banner(); Chip(); Text("y") } }
        """.trimIndent())
    }

    private fun lib(name: String, text: String) = File(fx.libRoot, "lib/$name.kt").apply { parentFile.mkdirs(); writeText("package lib\n$text") }

    @Test fun `Preview 본문이 직접 부른 이름은 프로젝트에 정의가 있는 것만 싣고, 정의는 파일이 아닌 모듈을 단다`() {
        runBlocking { uc.watchers.indexPreviewFiles() }
        change(created = listOf(screens(), lib("Chips", "@Composable fun Chip() {}\n")))
        assertEquals(mapOf("ScreenPreview" to listOf("Banner", "Chip")), calls("Screens.kt"))
        val defs = uc.status.readPreviewIndex()!!.composables
        assertEquals(":app", defs.getValue("Banner").single().module)
        assertEquals(":lib", defs.getValue("Chip").single().module)
        assertEquals(listOf("Banner", "Chip", "ScreenPreview"), defs.keys.sorted())
    }

    @Test fun `다른 파일에 정의가 생기면 그 파일만 읽고도 호출이 늘고, 정의만 바뀐 저장도 알린다`() {
        runBlocking {
            filesChanged().test {
                uc.watchers.indexPreviewFiles()
                awaitItem()
                val screens = screens()
                change(created = listOf(screens))
                awaitItem()
                assertEquals(listOf("Banner"), calls("Screens.kt")["ScreenPreview"])

                screens.appendText("\n@Preview @Composable fun Unread() { Chip() }\n")   // 알리지 않은 고침 — 다시 읽으면 드러난다
                val theme = lib("Theme", "@Composable fun AppTheme(content: @Composable () -> Unit) {}\n@Composable fun Chip() {}\n")
                change(created = listOf(theme))
                awaitItem()
                assertEquals(mapOf("ScreenPreview" to listOf("AppTheme", "Banner", "Chip")), calls("Screens.kt"))

                theme.writeText("package lib\n@Composable fun AppTheme(content: @Composable () -> Unit) {}\n")
                change(changed = listOf(theme))
                awaitItem()
                assertEquals(listOf("AppTheme", "Banner"), calls("Screens.kt")["ScreenPreview"])

                theme.setLastModified(theme.lastModified() + 2_000)
                change(changed = listOf(theme))
                expectNoEvents()
            }
        }
    }

    private fun previewsOf(name: String) = uc.status.findPreviews(name)!!

    @Test fun `컴포저블 이름으로 본문이 직접 부르는 Preview 의 FQN 을 찾고, 점이 든 이름은 마지막 마디로 찾는다`() {
        assertNull(uc.status.findPreviews("Banner"))
        runBlocking { uc.watchers.indexPreviewFiles() }
        change(created = listOf(screens(), lib("Chips", "@Composable fun Chip() {}\n")))
        val banner = previewsOf("Banner")
        assertEquals(listOf("demo.ScreensKt.ScreenPreview" to "ScreenPreview"), banner.previews.map { it.fqn to it.function })
        assertEquals(listOf(":app"), banner.definitions.map { it.module })
        assertEquals("Banner", previewsOf(" Banner() ").name)
        val chip = previewsOf("lib.Chip")
        assertEquals("Chip", chip.name)
        assertEquals(listOf("demo.ScreensKt.ScreenPreview"), chip.previews.map { it.fqn })
        assertEquals(listOf(":lib"), chip.definitions.map { it.module })
    }

    @Test fun `같은 이름의 정의가 여럿이면 모두 싣고 Preview 는 이름으로만 찾는다`() {
        runBlocking { uc.watchers.indexPreviewFiles() }
        change(created = listOf(screens(), lib("Banners", "@Composable fun Banner() {}\n")))
        val banner = previewsOf("Banner")
        assertEquals(listOf(":app", ":lib"), banner.definitions.map { it.module }.sorted())
        assertEquals(listOf("demo.ScreensKt.ScreenPreview"), banner.previews.map { it.fqn })
    }

    @Test fun `부르는 Preview 가 없으면 정의만, 프로젝트에 정의가 없거나 대소문자가 다르면 둘 다 비어 있다`() {
        runBlocking { uc.watchers.indexPreviewFiles() }
        change(created = listOf(screens(), lib("Lonely", "@Composable fun Lonely() {}\n")))
        val lonely = previewsOf("Lonely")
        assertEquals(emptyList<Any>(), lonely.previews)
        assertEquals(listOf(":lib"), lonely.definitions.map { it.module })
        for (name in listOf("Text", "banner", "Nope")) {
            val none = previewsOf(name)
            assertEquals(emptyList<Any>(), none.previews, name)
            assertEquals(emptyList<Any>(), none.definitions, name)
        }
    }

    @Test fun `다른 앱의 파일은 프리뷰가 있어도 싣지 않는다`() {
        runBlocking { uc.watchers.indexPreviewFiles() }
        val elsewhere = File(fx.root, "other-app/src/X.kt").apply { parentFile.mkdirs(); writeText("package x\n@Preview\nfun X() {}\n") }
        change(created = listOf(elsewhere))
        assertEquals(listOf("Cards.kt"), names())
    }
}
