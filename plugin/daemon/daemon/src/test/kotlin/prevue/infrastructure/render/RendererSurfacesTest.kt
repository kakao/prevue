package prevue.infrastructure.render

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class RendererSurfacesTest {
    @Suppress("unused")
    private class Shaped(private val kept: Int = 0)

    @Test fun `열리지 않는 표면을 모두 이름으로 돌려준다`() {
        val surfaces = listOf(
            Surface("Shaped.kept") { RendererSurfaces.field(Shaped::class.java, "kept") },
            Surface("Shaped.renamed") { RendererSurfaces.field(Shaped::class.java, "renamed") },
            Surface("Shaped.gone") { RendererSurfaces.field(Shaped::class.java, "gone") },
        )
        assertEquals(listOf("Shaped.renamed", "Shaped.gone"), RendererSurfaces.unopened(surfaces))
    }

    @Test fun `판 짝 실패는 열지 못한 표면을 문장에 싣는다`() {
        val message = RendererMismatch(listOf("Renderer.renderService", "ModuleClassLoaderManager.preloader")).message.orEmpty()
        assertTrue("Renderer.renderService, ModuleClassLoaderManager.preloader" in message, message)
    }

    @Test fun `뿌리 표면이 열리지 않으면 그것에 기대는 표면은 따로 세지 않는다`() {
        val root = Surface("Shaped.renamedRoot") { RendererSurfaces.field(Shaped::class.java, "renamedRoot") }
        val leaf = Surface("Shaped.leaf", root) { RendererSurfaces.field(root.value.type, "leaf") }
        assertEquals(listOf("Shaped.renamedRoot"), RendererSurfaces.unopened(listOf(root, leaf)))
    }
}
