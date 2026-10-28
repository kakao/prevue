package prevue.daemon.adapter.render

import java.io.File
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import prevue.daemon.domain.port.LiveSession
import prevue.daemon.domain.port.LiveSessionFactory
import prevue.daemon.domain.port.PreviewRenderer
import prevue.daemon.domain.port.RenderOutput
import prevue.daemon.domain.port.ResourceKey
import prevue.daemon.domain.port.ResourceLookup
import prevue.daemon.domain.port.ResourceEntry
import prevue.daemon.domain.port.ResourceValues
import prevue.daemon.entity.PreviewSpec

@OptIn(ExperimentalCoroutinesApi::class)
class BootingEngine(
    private val scope: CoroutineScope,
    override val outDir: File,
    boot: () -> RenderEngine,
) : PreviewRenderer, LiveSessionFactory, AutoCloseable {
    private class Booted(val engine: RenderEngine, val overlay: ResourceOverlay?)

    private val booted: Deferred<Booted> = scope.async(Dispatchers.IO + CoroutineName("prevue-renderer-boot")) {
        boot().let { Booted(it, ResourceOverlay.install(it.renderer)) }
    }

    private val ready: RenderEngine get() = booted.getCompleted().engine

    suspend fun await(): RenderEngine = booted.await().engine

    override suspend fun ready() { booted.await() }

    override fun close() {
        if (booted.isCompleted) ready.close() else booted.invokeOnCompletion { if (it == null) ready.close() }
    }

    override suspend fun show(p: PreviewSpec, ownLoader: Boolean): RenderOutput = await().show(p, ownLoader)
    override suspend fun showAside(p: PreviewSpec): RenderOutput = await().showAside(p)
    override suspend fun open(p: PreviewSpec, interactive: Boolean, ownLoader: Boolean): LiveSession = await().open(p, interactive, ownLoader)
    override fun copyImage(out: RenderOutput, previewId: String): RenderOutput = ready.copyImage(out, previewId)
    override fun codeChanged() = ready.codeChanged()
    override fun patchLiterals(owner: String, values: Map<String, Any>): Boolean = ready.patchLiterals(owner, values)
    override fun dropLiterals(owners: Collection<String>) = ready.dropLiterals(owners)
    override fun buildChanged() = ready.buildChanged()
    override fun forgetShapes() = ready.forgetShapes()
    override fun instanceCount(p: PreviewSpec): Int = ready.instanceCount(p)
    override fun protect(keep: () -> Set<String>) { scope.launch { await().protect(keep) } }
    override suspend fun written(out: RenderOutput): RenderOutput = await().written(out)
    override suspend fun awaitWrites() = await().awaitWrites()

    private val bootedNow: RenderEngine? get() = if (booted.isCompleted && booted.getCompletionExceptionOrNull() == null) ready else null
    override val bootstrapMs: Long get() = bootedNow?.bootstrapMs ?: 0
    override val loaderGen: Int get() = bootedNow?.loaderGen ?: 0
    override val tasksOnLoader: Int get() = bootedNow?.tasksOnLoader ?: 0
    override val outBytes: Long get() = bootedNow?.outBytes ?: 0
    override val outMaxBytes: Long get() = bootedNow?.outMaxBytes ?: 0
    override val touchModeError: String? get() = bootedNow?.touchModeError

    val resources: ResourceValues = object : ResourceValues {
        private val overlay: ResourceOverlay get() = checkNotNull(booted.getCompleted().overlay)
        override suspend fun ready(): Boolean = booted.await().overlay != null
        override fun parse(file: File, text: String): List<ResourceEntry>? = overlay.parse(file, text)
        override fun lookup(key: ResourceKey): ResourceLookup = overlay.lookup(key)
        override fun put(file: File, text: String, keys: Collection<ResourceKey>): Boolean = overlay.put(file, text, keys)
    }
}
