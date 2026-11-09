package prevue.daemon

import java.io.File
import java.nio.file.Files
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.junit.jupiter.api.condition.EnabledIf
import prevue.application.port.PrevueDispatchers
import prevue.daemon.fake.LaneSpy
import prevue.daemon.fake.realDispatchers

/** 컴파일러는 진짜 컴파일러 · 브리지 jar 없이는 서지 않아 단위 테스트가 아니라 여기서 줄을 본다. */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@EnabledIf("prevue.daemon.HotCompilerLaneIntegrationTest#available")
class HotCompilerLaneIntegrationTest {
    private val out = Files.createTempDirectory("prevue-lane").toFile()

    @Test fun `컴파일러 상태는 io 의 한 줄 뷰에서만 만진다`() = runBlocking {
        val io = LaneSpy(realDispatchers.io)
        val default = LaneSpy(realDispatchers.default)
        val home = PearlFixture.warmup().first
        val compiler = PearlFixture.hotCompiler(home, File(out, "overlay"), PrevueDispatchers(io, default))
        try {
            val src = File(out, "src/com/example/pearl/lane/Lane.kt").apply { parentFile.mkdirs(); writeText("package com.example.pearl.lane\n\nobject Lane { fun one(): Int = 1 }\n") }
            val r = compiler.compile(home.project, listOf(src))
            assertTrue(r.ok, r.messages)
            compiler.builtAt(home.project)
            compiler.hasClass(home.project, "com.example.pearl.lane.Lane")
        } finally { compiler.close() }
        assertEquals(listOf(1 to "prevue-compiler"), io.lanes())
        assertTrue(io.view("prevue-compiler").dispatched >= 3, "컴파일 · 표지 · 클래스 확인이 청한 뷰에서 돌지 않았다")
        assertEquals(emptyList<LaneSpy.View>(), default.views)
        assertEquals(0 to 0, io.dispatched to default.dispatched, "뷰를 거치지 않고 디스패처에 바로 올렸다")
    }

    @AfterAll fun down() { out.deleteRecursively(); PearlFixture.stopGradle() }

    companion object {
        @JvmStatic fun available(): Boolean = PearlFixture.available()
    }
}
