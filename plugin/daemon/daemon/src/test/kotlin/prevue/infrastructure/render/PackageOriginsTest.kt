package prevue.infrastructure.render

import java.io.File
import java.nio.file.Path
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir

/** 렌더러의 packageHash 는 패키지 이름 String.hashCode() 의 절댓값이다 — 클래스패스의 패키지로 되돌려 출처를 가린다. */
class PackageOriginsTest {
    @TempDir lateinit var dir: Path

    private fun jar(name: String, vararg classes: String) = File(dir.toFile(), name).apply {
        ZipOutputStream(outputStream()).use { z -> classes.forEach { z.putNextEntry(ZipEntry(it)); z.closeEntry() } }
    }.path

    private fun classes(name: String, vararg classes: String) = File(dir.toFile(), name).apply {
        classes.forEach { File(this, it).apply { parentFile.mkdirs(); writeText("") } }
    }.path

    private fun hash(pkg: String) = kotlin.math.abs(pkg.hashCode())

    @Test fun `androidx compose 는 Compose, 프로젝트 출력은 프로젝트, 나머지 클래스패스는 외부 라이브러리, 모르는 해시는 없음`() {
        val project = classes("app-classes", "com/example/pearl/core/ui/CupKt.class")
        val compose = jar("foundation-layout.jar", "androidx/compose/foundation/layout/RowKt.class")
        val coil = jar("coil.jar", "coil3/compose/AsyncImageKt.class")
        val origins = PackageOrigins(listOf(project), listOf(project, compose, coil))

        assertEquals(ComposableOrigin.COMPOSE, origins.of(hash("androidx.compose.foundation.layout")))
        assertEquals(ComposableOrigin.PROJECT, origins.of(hash("com.example.pearl.core.ui")))
        assertEquals(ComposableOrigin.LIBRARY, origins.of(hash("coil3.compose")))
        assertEquals(null, origins.of(hash("org.nowhere")))
        assertEquals(-710273174, "com.example.pearl.core.ui".hashCode())   // 부호 있는 값이 와도 같은 패키지로 본다
        assertEquals(ComposableOrigin.PROJECT, origins.of("com.example.pearl.core.ui".hashCode()))
    }

    @Test fun `프로젝트 경로 앞의 렌더 오버레이가 androidx compose 클래스를 실어도 Compose 다`() {
        val overlay = classes("overlay", "androidx/compose/foundation/layout/RowKt.class")
        val origins = PackageOrigins(listOf(overlay), listOf(overlay))
        assertEquals(ComposableOrigin.COMPOSE, origins.of(hash("androidx.compose.foundation.layout")))
    }

    @Test fun `앱의 R jar 는 라이브러리 패키지마다 R 을 싣는다 — 프로젝트 출력으로 보지 않는다`() {
        val rJar = jar("R.jar", "androidx/constraintlayout/compose/R.class", "com/example/a/R.class")
        val project = classes("app-classes", "com/example/a/A.class")
        val library = jar("constraintlayout-compose.jar", "androidx/constraintlayout/compose/ConstraintLayoutKt.class")
        val origins = PackageOrigins(listOf(project), listOf(rJar, project, library))
        assertEquals(ComposableOrigin.LIBRARY, origins.of(hash("androidx.constraintlayout.compose")))
        assertEquals(ComposableOrigin.PROJECT, origins.of(hash("com.example.a")))
    }

    @Test fun `저장으로 생긴 새 프로젝트 패키지는 처음 모를 때 프로젝트 출력을 다시 읽어 찾는다`() {
        val project = classes("app-classes", "com/example/a/A.class")
        val origins = PackageOrigins(listOf(project), listOf(project))
        assertEquals(ComposableOrigin.PROJECT, origins.of(hash("com.example.a")))
        File(project, "com/example/b/B.class").apply { parentFile.mkdirs(); writeText("") }
        assertEquals(ComposableOrigin.PROJECT, origins.of(hash("com.example.b")))
    }
}
