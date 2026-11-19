package prevue.infrastructure.render

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

class ApkManifestTest {
    private fun manifest(uses: String) = """<manifest xmlns:a="http://schemas.android.com/apk/res/android">$uses</manifest>""".toByteArray()

    @Test fun `병합 매니페스트의 targetSdk를 읽고 없으면 Android의 minSdk 기본 규칙을 따른다`() {
        assertEquals(34, ApkManifest.targetSdkXml(manifest("""<uses-sdk a:minSdkVersion="24" a:targetSdkVersion="34"/>""")))
        assertEquals(24, ApkManifest.targetSdkXml(manifest("""<uses-sdk a:minSdkVersion="24"/>""")))
        assertEquals(1, ApkManifest.targetSdkXml(manifest("")))
        assertThrows<IllegalStateException> { ApkManifest.targetSdkXml(manifest("""<uses-sdk a:targetSdkVersion="Baklava"/>""")) }
    }
}
