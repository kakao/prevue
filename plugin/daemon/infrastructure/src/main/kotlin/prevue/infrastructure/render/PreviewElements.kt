package prevue.infrastructure.render

import com.android.tools.render.StandaloneRenderModelModule
import com.android.tools.render.compose.ComposeScreenshot
import java.io.File
import prevue.application.domain.model.PreviewSpec

internal class PreviewElements(
    private val module: StandaloneRenderModelModule,
    overlay: File,
    private val currentLoader: () -> ClassLoader?,
) {
    private val shapes = PreviewShapes()
    private val objectProviders = ObjectProviders(overlay)

    fun instances(p: PreviewSpec): List<String?> {
        if (p.methodParams.isEmpty()) return listOf(null)
        return shapes.instances(p) {
            val n = runCatching { element(p).resolveXmlLayouts().count() }.getOrElse { 1 }.coerceAtLeast(1)
            ProviderValues.labels(module, p.methodParams.first()["provider"], n)
        }
    }

    fun element(p: PreviewSpec) =
        ComposeScreenshot(p.fqn, objectProviders.swapped(p.methodParams, ::classBytes), p.params, p.previewId, "").toPreviewElement(module)

    fun layouts(p: PreviewSpec, resolve: () -> List<String>): List<String> = shapes.layouts(p, resolve)

    fun codeChanged() { shapes.recount(); objectProviders.forget() }

    fun forgetAll() { shapes.forgetAll(); objectProviders.forget() }

    private fun classBytes(name: String): ByteArray? = runCatching {
        val path = name.replace('.', '/') + ".class"
        currentLoader()?.getResourceAsStream(path)?.use { it.readBytes() } ?: ProviderValues.bytes(module, path)
    }.getOrNull()
}
