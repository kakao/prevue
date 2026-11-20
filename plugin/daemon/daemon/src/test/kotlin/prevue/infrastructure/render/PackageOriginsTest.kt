package prevue.infrastructure.render

import java.io.File
import java.nio.file.Path
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir

class PackageOriginsTest {
    @TempDir lateinit var dir: Path

    private fun jar(name: String, vararg classes: String) = File(dir.toFile(), name).apply {
        ZipOutputStream(outputStream()).use { z -> classes.forEach { z.putNextEntry(ZipEntry(it)); z.closeEntry() } }
    }.path

    private fun classes(name: String, vararg classes: String) = File(dir.toFile(), name).apply {
        classes.forEach { File(this, it).apply { parentFile.mkdirs(); writeText("") } }
    }.path

    private fun hash(pkg: String) = kotlin.math.abs(pkg.hashCode())

    @Test fun `androidx(Compose 본체와 Jetpack) 는 Compose, 프로젝트 출력은 프로젝트, 나머지 클래스패스는 외부 라이브러리, 모르는 해시는 없음`() {
        val project = classes("app-classes", "com/example/pearl/core/ui/CupKt.class")
        val compose = jar("foundation-layout.jar", "androidx/compose/foundation/layout/RowKt.class")
        val navigation = jar("navigation-compose.jar", "androidx/navigation/compose/NavHostKt.class")
        val coil = jar("coil.jar", "coil3/compose/AsyncImageKt.class")
        val origins = PackageOrigins(listOf(project), listOf(project, compose, navigation, coil))

        assertEquals(ComposableOrigin.COMPOSE, origins.of(hash("androidx.compose.foundation.layout")))
        assertEquals(ComposableOrigin.COMPOSE, origins.of(hash("androidx.navigation.compose")))
        assertEquals(ComposableOrigin.PROJECT, origins.of(hash("com.example.pearl.core.ui")))
        assertEquals(ComposableOrigin.LIBRARY, origins.of(hash("coil3.compose")))
        assertEquals(null, origins.of(hash("org.nowhere")))
        assertEquals(-710273174, "com.example.pearl.core.ui".hashCode())
        assertEquals(ComposableOrigin.PROJECT, origins.of("com.example.pearl.core.ui".hashCode()))
    }

    @Test fun `프로젝트 경로 앞의 렌더 오버레이가 androidx compose 클래스를 실어도 Compose 다`() {
        val overlay = classes("overlay", "androidx/compose/foundation/layout/RowKt.class")
        val origins = PackageOrigins(listOf(overlay), listOf(overlay))
        assertEquals(ComposableOrigin.COMPOSE, origins.of(hash("androidx.compose.foundation.layout")))
    }

    @Test fun `앱의 R jar 는 라이브러리 패키지마다 R 을 싣는다 — 프로젝트 출력으로 보지 않는다`() {
        val rJar = jar("R.jar", "coil3/compose/R.class", "com/example/a/R.class")
        val project = classes("app-classes", "com/example/a/A.class")
        val library = jar("coil.jar", "coil3/compose/AsyncImageKt.class")
        val origins = PackageOrigins(listOf(project), listOf(rJar, project, library))
        assertEquals(ComposableOrigin.LIBRARY, origins.of(hash("coil3.compose")))
        assertEquals(ComposableOrigin.PROJECT, origins.of(hash("com.example.a")))
    }

    @Test fun `저장이 오버레이에 새 패키지를 컴파일하면 처음 모를 때 프로젝트 경로를 다시 읽어 프로젝트로 찾는다`() {
        val overlay = classes("overlay", "com/example/a/A.class")
        val project = classes("app-classes", "com/example/a/A.class")
        val origins = PackageOrigins(listOf(overlay, project), listOf(overlay, project))
        assertEquals(ComposableOrigin.PROJECT, origins.of(hash("com.example.a")))
        File(overlay, "com/example/b/B.class").apply { parentFile.mkdirs(); writeText("") }
        assertEquals(ComposableOrigin.PROJECT, origins.of(hash("com.example.b")))
    }
}
