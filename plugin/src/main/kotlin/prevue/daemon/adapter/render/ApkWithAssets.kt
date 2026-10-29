package prevue.daemon.adapter.render

import java.io.File
import java.util.zip.ZipEntry
import java.util.zip.ZipFile
import java.util.zip.ZipOutputStream

// 외부: 렌더러의 StandaloneAssetFileOpener 는 리소스 APK 안의 assets/<경로>만 읽는다 — AGP 의 .ap_ 에는 assets/ 가 없다
object ApkWithAssets {
    const val FILE_NAME = "resources-with-assets.ap_"
    const val CMP_DIR = "composeResources"

    fun cmpRoots(assetsDirs: List<File>): List<File> = assetsDirs.map { File(it, CMP_DIR) }.filter { it.isDirectory }

    fun of(apk: File, assetsDirs: List<File>, dir: File): File {
        val assets = assetsDirs.flatMap { root ->
            File(root, CMP_DIR).walkTopDown().filter { it.isFile }.map { "assets/" + it.relativeTo(root).invariantSeparatorsPath to it }
        }
        val out = File(dir, FILE_NAME)
        out.delete()
        if (assets.isEmpty()) return apk
        dir.mkdirs()
        val tmp = File(dir, "$FILE_NAME.tmp")
        val seen = HashSet<String>()
        ZipOutputStream(tmp.outputStream().buffered()).use { zip ->
            for ((name, file) in assets) {
                if (!seen.add(name)) continue
                zip.putNextEntry(ZipEntry(name))
                file.inputStream().use { it.copyTo(zip) }
                zip.closeEntry()
            }
            ZipFile(apk).use { src ->
                for (e in src.entries()) {
                    if (!seen.add(e.name)) continue
                    zip.putNextEntry(ZipEntry(e).apply { compressedSize = -1 })
                    src.getInputStream(e).use { it.copyTo(zip) }
                    zip.closeEntry()
                }
            }
        }
        check(tmp.renameTo(out)) { "$out 에 리소스 APK 사본을 두지 못했다" }
        return out
    }
}
