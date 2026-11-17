package prevue.infrastructure.render

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class RendererSurfacesTest {
    @Suppress("unused")
    private class Shaped(private val kept: Int = 0)

    @Suppress("unused")
    private class RenamedTask(private val myRenderSession: Any? = null, private val myLayoutlibCallback: Any? = null)

    @Suppress("unused")
    private class RenamedSessionImpl(private val mRootView: Any? = null)

    @Test fun `열리지 않는 표면을 모두 이름으로 돌려준다`() {
        val surfaces = listOf(
            Surface("Shaped.kept") { RendererSurfaces.field(Shaped::class.java, "kept") },
            Surface("Shaped.renamed") { RendererSurfaces.field(Shaped::class.java, "renamed") },
            Surface("Shaped.gone") { RendererSurfaces.field(Shaped::class.java, "gone") },
        )
        assertEquals(listOf("Shaped.renamed", "Shaped.gone"), RendererSurfaces.unopened(surfaces))
    }

    @Test fun `뿌리 표면이 열리지 않으면 그것에 기대는 표면은 따로 세지 않는다`() {
        val root = Surface("Shaped.renamedRoot") { RendererSurfaces.field(Shaped::class.java, "renamedRoot") }
        val leaf = Surface("Shaped.leaf", root) { RendererSurfaces.field(root.value.type, "leaf") }
        assertEquals(listOf("Shaped.renamedRoot"), RendererSurfaces.unopened(listOf(root, leaf)))
    }

    @Test fun `진짜 렌더러 · layoutlib 클래스에서는 세션 표면이 모두 열린다`() {
        assertEquals(emptyList<String>(), RendererSurfaces.unopened(SessionSurfaces().all()))
    }

    @Test fun `세션 정리와 세션 루트의 표면이 바뀌면 이름으로 잡힌다`() {
        val surfaces = SessionSurfaces(
            task = RenamedTask::class.java,
            sessionImpl = RenamedSessionImpl::class.java,
            cleanerName = "com.android.tools.rendering.RenamedSessionCleaner",
        )
        assertEquals(
            listOf("RenderTask.myModuleClassLoaderReference", "RenderSessionCleaner.dispose", "RenderSessionImpl.mViewRoot"),
            RendererSurfaces.unopened(surfaces.all()),
        )
    }
}
