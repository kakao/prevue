package prevue.daemon.domain.runtime

import app.cash.turbine.test
import java.io.File
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import prevue.daemon.fake.Fixture
import prevue.daemon.fake.workspace
import prevue.daemon.domain.port.SourceChange
import prevue.daemon.domain.model.WorkspaceEvent

/** D-56. 빠른 열기의 목록 — 이 데몬이 열 수 있는 프리뷰 파일만, 목록이 바뀔 때만 알린다. */
class PreviewCatalogTest {
    private val fx = Fixture(previews = 2)
    private val uc = fx.useCases()

    @AfterEach fun tearDown() = fx.close()

    private fun filesChanged() = uc.workspace.events.filter { it == WorkspaceEvent.PreviewFilesChanged }
    private fun names() = uc.readPreviewFiles()!!.map { it.file.name }.sorted()
    private fun change(changed: List<File> = emptyList(), created: List<File> = emptyList(), deleted: List<File> = emptyList()) =
        runBlocking { uc.indexPreviewFiles(SourceChange(changed, 0, 0, 0, created, deleted)) }

    @Test fun `처음 훑으면 프리뷰가 있는 파일만 함수와 함께 실린다`() {
        assertNull(uc.readPreviewFiles())   // 다 훑기 전에는 "없다"가 아니라 "모른다"
        fx.libFile                            // 프리뷰 없는 의존 모듈 파일
        runBlocking {
            filesChanged().test {
                uc.indexPreviewFiles()
                awaitItem()
            }
        }
        val files = uc.readPreviewFiles()!!
        assertEquals(listOf("Cards.kt"), files.map { it.file.name })   // Dup.kt · Theme.kt는 프리뷰가 없다
        assertEquals(listOf("Card0", "Card1"), files.single().functions)
        assertEquals(":app", files.single().module)
    }

    @Test fun `새 파일 · 프리뷰 변화 · 삭제는 알리고 mtime만 바뀐 저장은 조용하다`() {
        runBlocking {
            filesChanged().test {
                uc.indexPreviewFiles()
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
                assertEquals(listOf("Card0", "Card1", "Card9"), uc.readPreviewFiles()!!.first { it.file.name == "Cards.kt" }.functions)
                awaitItem()

                other.delete()
                change(deleted = listOf(other))
                assertEquals(listOf("Cards.kt"), names())
                awaitItem()
            }
        }
    }

    @Test fun `다른 앱의 파일은 프리뷰가 있어도 싣지 않는다`() {
        runBlocking { uc.indexPreviewFiles() }
        val elsewhere = File(fx.root, "other-app/src/X.kt").apply { parentFile.mkdirs(); writeText("package x\n@Preview\nfun X() {}\n") }
        change(created = listOf(elsewhere))
        assertEquals(listOf("Cards.kt"), names())
    }
}
