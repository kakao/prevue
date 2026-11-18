package prevue.infrastructure.render

import com.android.ide.common.rendering.api.RenderSession
import com.android.tools.configurations.Configuration
import com.android.tools.render.Renderer
import com.android.tools.render.StandaloneRenderModelModule
import com.android.tools.rendering.RenderService
import com.android.tools.rendering.RenderTask
import com.android.tools.rendering.classloading.ModuleClassLoader
import java.lang.reflect.Field
import java.lang.reflect.Method
import java.util.concurrent.locks.Lock
import prevue.application.domain.model.phrase

internal class Surface<T>(val label: String, val needs: Surface<*>? = null, open: () -> T) {
    val value: T by lazy(open)
    val opens: Boolean get() = runCatching { value }.isSuccess
}

internal class RendererMismatch(val unopened: List<String>) :
    IllegalStateException(phrase("renderer.mismatch", "surfaces" to unopened.joinToString()).text)

internal class RendererSurfaces(renderer: Renderer) {
    val renderService = Surface("Renderer.renderService") { field(Renderer::class.java, "renderService").get(renderer) as RenderService }
    val baseConfiguration = Surface("Renderer.baseConfiguration") { field(Renderer::class.java, "baseConfiguration").get(renderer) as Configuration }
    val manager = Surface("Renderer.moduleClassLoaderManager") { field(Renderer::class.java, "moduleClassLoaderManager").get(renderer) }
    val createClassLoader = Surface("ModuleClassLoaderManager.createClassLoader", manager) {
        managerClass().getDeclaredMethod("createClassLoader", ClassLoader::class.java).apply { isAccessible = true }
    }
    val sharedLoader = Surface("ModuleClassLoaderManager.currentSharedClassLoader", manager) {
        field(managerClass(), "currentSharedClassLoader")
    }
    val sharedLock = Surface("ModuleClassLoaderManager.sharedClassLoadersLock", manager) {
        field(managerClass(), "sharedClassLoadersLock").get(manager.value) as Lock
    }
    val dependencies = Surface("StandaloneRenderModelModule.dependencies") { field(StandaloneRenderModelModule::class.java, "dependencies") }
    val noDependencies = Surface("StandaloneModuleDependencies(List)") {
        Class.forName("com.android.tools.render.StandaloneModuleDependencies").getConstructor(List::class.java).newInstance(emptyList<String>())
    }

    val session = SessionSurfaces()

    private fun managerClass(): Class<*> = manager.value.javaClass

    fun all(): List<Surface<*>> = listOf(
        renderService, baseConfiguration, manager, createClassLoader, sharedLoader, sharedLock, dependencies, noDependencies,
    ) + session.all()

    fun opened(): RendererSurfaces = apply {
        val unopened = unopened(all())
        if (unopened.isNotEmpty()) throw RendererMismatch(unopened)
    }

    companion object {
        fun unopened(surfaces: List<Surface<*>>): List<String> =
            surfaces.filter { s -> s.needs?.opens != false && !s.opens }.map { it.label }

        fun field(owner: Class<*>, name: String): Field = owner.getDeclaredField(name).apply { isAccessible = true }
    }
}

internal class SessionSurfaces(
    task: Class<*> = RenderTask::class.java,
    cleanerName: String = "com.android.tools.rendering.RenderSessionCleaner",
) {
    val renderSession = Surface("RenderTask.myRenderSession") { RendererSurfaces.field(task, "myRenderSession") }
    val loaderReference = Surface("RenderTask.myModuleClassLoaderReference") { RendererSurfaces.field(task, "myModuleClassLoaderReference") }
    val layoutlibCallback = Surface("RenderTask.myLayoutlibCallback") { RendererSurfaces.field(task, "myLayoutlibCallback") }
    val cleaner = Surface<Method>("RenderSessionCleaner.dispose") {
        Class.forName(cleanerName, true, task.classLoader).getMethod("dispose", RenderSession::class.java, ModuleClassLoader::class.java)
    }

    fun all(): List<Surface<*>> = listOf(renderSession, loaderReference, layoutlibCallback, cleaner)
}
