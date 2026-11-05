package prevue.infrastructure.render

import com.android.tools.render.Renderer

internal class ResourceIds(private val renderer: Renderer, surfaces: RendererSurfaces) {
    private val depsField = surfaces.dependencies.value
    private val packagesToRead: Any = depsField.get(renderer.module)
    private val nothingToRead: Any = surfaces.noDependencies.value
    private var registered = false

    fun registeredByFirstLoader() {
        if (registered) return
        depsField.set(renderer.module, nothingToRead)
        registered = true
    }

    fun forget() {
        depsField.set(renderer.module, packagesToRead)
        registered = false
    }
}
