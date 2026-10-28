package prevue.daemon.adapter.render

import com.android.tools.render.Renderer
import com.android.tools.render.StandaloneRenderModelModule

internal class ResourceIds(private val renderer: Renderer) {
    private val depsField = StandaloneRenderModelModule::class.java.getDeclaredField("dependencies").apply { isAccessible = true }
    private val packagesToRead: Any = depsField.get(renderer.module)
    private val nothingToRead: Any = Class.forName("com.android.tools.render.StandaloneModuleDependencies")
        .getConstructor(List::class.java).newInstance(emptyList<String>())
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
