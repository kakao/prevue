package prevue.daemon.adapter.render

import java.io.File
import java.nio.file.Files
import java.util.zip.ZipEntry
import java.util.zip.ZipFile
import java.util.zip.ZipOutputStream
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Test

class ApkWithAssetsTest {
    private val root = Files.createTempDirectory("prevue-apk").toFile()
    @AfterEach fun tearDown() { root.deleteRecursively() }

    private val apk = File(root, "app.ap_").apply {
        ZipOutputStream(outputStream()).use { z ->
            z.putNextEntry(ZipEntry("resources.arsc")); z.write("arsc".toByteArray()); z.closeEntry()
            z.putNextEntry(ZipEntry("AndroidManifest.xml")); z.write("m".toByteArray()); z.closeEntry()
        }
    }
    private val daemon = File(root, "daemon")

    private fun entries(f: File) = ZipFile(f).use { z -> z.entries().asSequence().associate { e -> e.name to z.getInputStream(e).readBytes().decodeToString() } }

    @Test fun `CMP 리소스가 있으면 리소스 APK 에 assets 경로로 합친 사본을 쓰고 다른 에셋은 싣지 않는다`() {
        val merged = File(root, "merged").apply { File(this, "composeResources/app/font").mkdirs() }
        File(merged, "composeResources/app/font/sans.ttf").writeText("font")
        File(merged, "top.txt").writeText("top")
        val out = ApkWithAssets.of(apk, listOf(merged, File(root, "gone")), daemon)
        assertEquals(File(daemon, ApkWithAssets.FILE_NAME), out)
        assertEquals(
            mapOf("resources.arsc" to "arsc", "AndroidManifest.xml" to "m", "assets/composeResources/app/font/sans.ttf" to "font"),
            entries(out),
        )
        assertEquals("arsc", entries(apk)["resources.arsc"])
    }

    @Test fun `CMP 리소스가 없으면 원본을 그대로 쓰고 지난 사본을 지운다`() {
        File(daemon, ApkWithAssets.FILE_NAME).apply { parentFile.mkdirs(); writeText("old") }
        val empty = File(root, "empty").apply { mkdirs(); File(this, "lottie.json").writeText("{}") }
        assertEquals(apk, ApkWithAssets.of(apk, listOf(empty), daemon))
        assertFalse(File(daemon, ApkWithAssets.FILE_NAME).exists())
    }
}
