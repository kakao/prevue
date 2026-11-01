package prevue.daemon.adapter.render

import com.android.tools.configurations.Configuration
import com.android.tools.render.Renderer
import com.android.tools.render.StandaloneRenderModelModule
import com.android.tools.rendering.RenderService
import java.lang.reflect.Field
import java.util.concurrent.Executor
import prevue.daemon.entity.phrase

internal class Surface<T>(val label: String, open: () -> T) {
    val value: T by lazy(open)
    val opens: Boolean get() = runCatching { value }.isSuccess
}

internal class RendererMismatch(val unopened: List<String>) :
    IllegalStateException(phrase("renderer.mismatch", "surfaces" to unopened.joinToString()).text)

internal class RendererSurfaces(renderer: Renderer) {
    val renderService = Surface("Renderer.renderService") { field(Renderer::class.java, "renderService").get(renderer) as RenderService }
    val baseConfiguration = Surface("Renderer.baseConfiguration") { field(Renderer::class.java, "baseConfiguration").get(renderer) as Configuration }
    val manager = Surface("Renderer.moduleClassLoaderManager") { field(Renderer::class.java, "moduleClassLoaderManager").get(renderer) }
    val createClassLoader = Surface("ModuleClassLoaderManager.createClassLoader") {
        managerClass().getDeclaredMethod("createClassLoader", ClassLoader::class.java).apply { isAccessible = true }
    }
    val preloader = Surface("ModuleClassLoaderManager.preloader") { field(managerClass(), "preloader") }
    val preloadExecutor = Surface("ModuleClassLoaderManager.preloaderExecutor") { field(managerClass(), "preloaderExecutor").get(manager.value) as Executor }
    val sharedClassLoaders = Surface("ModuleClassLoaderManager.sharedClassLoaders") { field(managerClass(), "sharedClassLoaders").get(manager.value) }
    val invalidateAll = Surface("Cache.invalidateAll") {
        Class.forName("com.google.common.cache.Cache", true, managerClass().classLoader).getMethod("invalidateAll")
    }

    @Suppress("UNCHECKED_CAST")
    val composeClasses = Surface("ComposeClassesKt.COMPOSE_CLASSES") {
        Class.forName("com.android.tools.render.ComposeClassesKt", true, managerClass().classLoader)
            .getMethod("getCOMPOSE_CLASSES").invoke(null) as Collection<String>
    }
    val dependencies = Surface("StandaloneRenderModelModule.dependencies") { field(StandaloneRenderModelModule::class.java, "dependencies") }
    val noDependencies = Surface("StandaloneModuleDependencies(List)") {
        Class.forName("com.android.tools.render.StandaloneModuleDependencies").getConstructor(List::class.java).newInstance(emptyList<String>())
    }

    private fun managerClass(): Class<*> = manager.value.javaClass

    fun all(): List<Surface<*>> = listOf(
        renderService, baseConfiguration, manager, createClassLoader, preloader, preloadExecutor,
        sharedClassLoaders, invalidateAll, composeClasses, dependencies, noDependencies,
    )

    fun opened(): RendererSurfaces = apply {
        val unopened = unopened(all())
        if (unopened.isNotEmpty()) throw RendererMismatch(unopened)
    }

    companion object {
        fun unopened(surfaces: List<Surface<*>>): List<String> = surfaces.filterNot { it.opens }.map { it.label }

        fun field(owner: Class<*>, name: String): Field = owner.getDeclaredField(name).apply { isAccessible = true }
    }
}
