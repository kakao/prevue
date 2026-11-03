package prevue.adapter.infra

import java.io.File
import java.nio.file.Files
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class DaemonPathsTest {
    private val config = InfraConfig(File("/p/app-debug.json"), File("/l"), File("/c"), File("/b"), 8791)

    @Test fun `쓰는 디렉터리는 덤프 옆의 데몬 포트 아래 모듈마다다`() {
        val p = DaemonPaths.of(config.copy(port = 8901), ":core:ui")
        assertEquals(File("/p"), p.cache)
        assertEquals(File("/p/daemon/8901/out/core_ui"), p.out)
        assertEquals(File("/p/daemon/8901/overlay/core_ui"), p.overlay)
        assertEquals(File("/p/daemon/8901/overlay/core_ui.modules"), p.overlayModules)
        assertEquals(File("/p/daemon/8901/warmup"), p.warmup)
        assertEquals(File("/p/core_ui-demoDebug.json"), p.dumpOf(":core:ui", "demoDebug"))
        val given = DaemonPaths.of(config.copy(out = File("/o"), overlay = File("/v2")), ":app")
        assertEquals(File("/o"), given.out)
        assertEquals(File("/v2"), given.overlay)
    }

    @Test fun `android jar 는 가장 높은 플랫폼에서 — 소수점 판이 앞선다`() {
        val dirs = listOf("android-34", "android-36", "android-36.1", "android-TiramisuPrivacySandbox").map { File("/sdk/platforms/$it") }
        assertEquals("android-36.1", AndroidPlatforms.newest(dirs)?.name)
        assertNull(AndroidPlatforms.newest(emptyList()))
    }

    @Test fun `SDK 에 android jar 가 있는 플랫폼만 후보다`() {
        val sdk = Files.createTempDirectory("sdk").toFile()
        try {
            File(sdk, "platforms/android-35").mkdirs()
            File(sdk, "platforms/android-34").mkdirs()
            File(sdk, "platforms/android-34/android.jar").writeText("")
            assertEquals(File(sdk, "platforms/android-34/android.jar"), AndroidPlatforms.findJar(mapOf("ANDROID_HOME" to sdk.path)))
        } finally {
            sdk.deleteRecursively()
        }
    }

    @Test fun `빈 ANDROID_HOME 은 없는 것 — CLI 의 SDK 확인과 같은 순서로 찾는다`() {
        val sdk = Files.createTempDirectory("sdk").toFile()
        try {
            File(sdk, "platforms/android-34").mkdirs()
            File(sdk, "platforms/android-34/android.jar").writeText("")
            val env = mapOf("ANDROID_HOME" to "", "ANDROID_SDK_ROOT" to sdk.path)
            assertEquals(File(sdk, "platforms/android-34/android.jar"), AndroidPlatforms.findJar(env))
        } finally {
            sdk.deleteRecursively()
        }
    }
}
