package prevue.daemon

import java.io.File
import java.nio.file.Files
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

class DaemonArgsTest {
    private val tools = arrayOf("--classpath", "/p/app-debug.json", "--layoutlib", "/l", "--compiler", "/c", "--bridge", "/b", "--viewer", "/v")

    @Test fun `필수 경로만 주면 감시 · 미리 올리기는 켜지고 포트는 기본값이다`() {
        val a = DaemonArgs.parse(tools)
        assertEquals(File("/p/app-debug.json"), a.classpath)
        assertEquals(DaemonArgs.DEFAULT_PORT, a.port)
        assertTrue(a.watching)
        assertTrue(a.preload)
        assertEquals(emptyList<File>(), a.extraWatch)
        assertNull(a.show)
        assertNull(a.resourcesFrom)
    }

    @Test fun `값 없는 플래그는 다음 인자를 먹지 않는다`() {
        val a = DaemonArgs.parse(arrayOf("--no-watch", "--no-preload") + tools + arrayOf("--show", "/r/A.kt#2", "--port", "8901"))
        assertFalse(a.watching)
        assertFalse(a.preload)
        assertEquals("/r/A.kt#2", a.show)
        assertEquals(8901, a.port)
    }

    @Test fun `감시 디렉터리는 여러 번 줄 수 있고 다른 인자는 마지막 값이 이긴다`() {
        val a = DaemonArgs.parse(tools + arrayOf("--watch", "/x", "--root", "/a", "--watch", "/y", "--root", "/b"))
        assertEquals(listOf(File("/x"), File("/y")), a.extraWatch)
        assertEquals("/b", a.root)
    }

    @Test fun `필수 인자가 빠지거나 값이 없거나 -- 로 시작하지 않으면 사용법이다`() {
        assertThrows<UsageException> { DaemonArgs.parse(tools.copyOfRange(0, 8)) }
        assertThrows<UsageException> { DaemonArgs.parse(tools + arrayOf("--show")) }
        assertThrows<UsageException> { DaemonArgs.parse(tools + arrayOf("stray")) }
    }

    @Test fun `쓰는 디렉터리는 덤프 옆의 데몬 포트 아래 모듈마다다`() {
        val p = DaemonPaths.of(DaemonArgs.parse(tools + arrayOf("--port", "8901")), ":core:ui")
        assertEquals(File("/p"), p.cache)
        assertEquals(File("/p/daemon/8901/out/core_ui"), p.out)
        assertEquals(File("/p/daemon/8901/overlay/core_ui"), p.overlay)
        assertEquals(File("/p/daemon/8901/overlay/core_ui.modules"), p.overlayModules)
        assertEquals(File("/p/daemon/8901/warmup"), p.warmup)
        assertEquals(File("/p/core_ui-demoDebug.json"), p.dumpOf(":core:ui", "demoDebug"))
        val given = DaemonPaths.of(DaemonArgs.parse(tools + arrayOf("--out", "/o", "--overlay", "/v2")), ":app")
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
