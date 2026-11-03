package prevue.daemon.adapter.render

import prevue.daemon.entity.Verbatim
import java.awt.image.BufferedImage
import java.nio.file.Path
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import prevue.daemon.domain.port.FailureKind
import prevue.daemon.entity.PreviewSpec

class BuildOutputRetentionTest {
    @TempDir lateinit var directory: Path
    private val preview = PreviewSpec("demo.CardKt.Preview", "card", emptyMap(), null, 0)

    @Test fun `외부 빌드 직후 클래스 누락은 마지막 PNG와 트리를 보존한다`() = runBlocking {
        RenderArtifactStore(directory.toFile()).use { store ->
            store.write("card", BufferedImage(8, 8, BufferedImage.TYPE_INT_RGB), mapOf("success" to true), false).await()
            val image = store.imageFile("card").readBytes()
            val tree = store.treeFile("card").readBytes()
            val outputs = RenderOutputs(store).apply { afterBuild = true }
            val failed = outputs.failed(preview, FailureKind.NOT_FOUND, Verbatim("missing"), RenderTiming.failedBeforeRender(true))
            failed.written.await()
            assertNull(failed.image)
            assertNull(failed.tree)
            assertArrayEquals(image, store.imageFile("card").readBytes())
            assertArrayEquals(tree, store.treeFile("card").readBytes())
        }
    }

    @Test fun `빌드 중에도 다른 렌더 오류는 정상 실패 산출물로 남긴다`() = runBlocking {
        RenderArtifactStore(directory.toFile()).use { store ->
            store.write("card", BufferedImage(8, 8, BufferedImage.TYPE_INT_RGB), emptyMap(), false).await()
            val outputs = RenderOutputs(store).apply { afterBuild = true }
            val failed = outputs.failed(preview, FailureKind.EXCEPTION, Verbatim("actual"), RenderTiming.failedBeforeRender(true))
            failed.written.await()
            assertFalse(store.imageFile("card").exists())
            assertTrue(store.treeFile("card").readText().contains("EXCEPTION"))
            assertFalse(outputs.afterBuild)
        }
    }
}
