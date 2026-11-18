package prevue.infrastructure.render

import com.android.tools.rendering.RenderTask
import com.android.tools.rendering.classloading.ModuleClassLoader
import com.intellij.openapi.Disposable
import com.intellij.openapi.util.CheckedDisposable
import com.intellij.openapi.util.Disposer
import java.io.File
import java.util.zip.ZipFile
import kotlin.concurrent.withLock
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import prevue.application.port.PrevueDispatchers
import prevue.infrastructure.dump.ClasspathSpec
import prevue.application.domain.model.PreviewSpec

internal class SharedLoaders(private val spec: ClasspathSpec, surfaces: RendererSurfaces, dispatchers: PrevueDispatchers) : AutoCloseable {
    data class Preloaded(val held: Int, val used: Int, val projectHeld: List<String>)

    var currentEmpty = true
        private set
    var current: ClassLoader? = null
    private var next: ModuleClassLoader? = null
    private val learned = LinkedHashSet<String>()
    private val projectSeen = HashSet<String>()
    private val preloads = CoroutineScope(SupervisorJob() + dispatchers.io.limitedParallelism(1))
    private val topUps = ArrayList<Job>()
    private val active = HashMap<ModuleClassLoader, Int>()
    private val retired = LinkedHashSet<ModuleClassLoader>()

    private val manager: Any = surfaces.manager.value
    private val createLoader = surfaces.createClassLoader.value
    private val sharedLoader = surfaces.sharedLoader.value
    private val sharedLock = surfaces.sharedLock.value

    private var projectJarClasses: Set<String>? = null

    private fun projectClasses(): Set<String> = projectJarClasses ?: run {
        spec.projectClassPath.filter { it !in spec.rClassJars }.map(::File)
            .filter { it.isFile && it.name.endsWith(".jar") }
            .flatMapTo(HashSet(), ::classNamesIn).also { projectJarClasses = it }
    }
    private val projectDirs: List<File> by lazy { spec.projectClassPath.map(::File).filterNot { it.isFile } }

    private fun isProjectClass(name: String): Boolean =
        name in projectClasses() || projectDirs.any { File(it, name.replace('.', '/') + ".class").exists() }

    private fun armNext() {
        stopTopUps()
        next?.dispose()
        next = createLoader.invoke(manager, null) as ModuleClassLoader
        preload(learned.toList())
    }

    fun claimedForNewGeneration() {
        armNext()
        currentEmpty = false
    }

    fun learnFrom(task: RenderTask) {
        val loaded = task.classLoader as? ModuleClassLoader ?: return
        if (loaded === next) return
        preload(loaded.nonProjectLoadedClasses.filter(::learnLibraryClass))
    }

    private fun preload(names: Collection<String>) {
        val waiting = next ?: return
        if (names.isEmpty()) return
        topUps += preloads.launch {
            for (name in names) {
                ensureActive()
                runCatching { Class.forName(name, false, waiting) }
                    .onFailure { System.err.println("[prevue] 라이브러리 선로딩 실패: $name — $it") }
            }
        }
    }

    fun track(task: RenderTask, disposable: CheckedDisposable): ClassLoader? {
        val loader = task.classLoader
        if (loader is ModuleClassLoader) active[loader] = (active[loader] ?: 0) + 1
        Disposer.register(disposable, Disposable { try { task.releaseRender() } finally { released(loader) } })
        return loader
    }

    private fun released(loader: ClassLoader?) {
        if (loader !is ModuleClassLoader) return
        val remaining = (active[loader] ?: 1) - 1
        if (remaining > 0) active[loader] = remaining else active.remove(loader)
        disposeRetired()
    }

    private fun learnLibraryClass(name: String): Boolean {
        if (name in learned || name in projectSeen) return false
        if (isProjectClass(name)) {
            projectSeen += name
            return false
        }
        return learned.add(name)
    }

    fun preloaded(live: ClassLoader?): Preloaded {
        val used = (live as? ModuleClassLoader)?.nonProjectLoadedClasses.orEmpty().filterNot(::isProjectClass)
        val held = next?.nonProjectLoadedClasses.orEmpty() + next?.projectLoadedClasses.orEmpty()
        return Preloaded(used.count { it in held }, used.size, held.filter(::isProjectClass))
    }

    fun reportBlank(p: PreviewSpec, why: RenderVerdict.Blank, loader: ClassLoader?, gen: Int, tasks: Int) {
        val previewClass = p.fqn.substringBeforeLast('.')
        val overlay = spec.projectClassPath.firstOrNull()?.let { File(it, previewClass.replace('.', '/') + ".class") }
        System.err.println(
            "[prevue] 빈 그림 $why — ${p.fqn} · gen=$gen tasks=$tasks ${describe(loader, previewClass)}" +
                " · 오버레이=${overlay?.takeIf { it.isFile }?.lastModified() ?: "없음"}",
        )
    }

    private fun describe(loader: ClassLoader?, previewClass: String): String =
        "currentEmpty=$currentEmpty current=${loader != null && loader === current} next=${loader != null && loader === next} nextArmed=${next != null}" +
            " held=${held(loader as? ModuleClassLoader, previewClass)} nextHeld=${held(next, previewClass)}"

    private fun held(loader: ModuleClassLoader?, name: String): String = when {
        loader == null -> "-"
        name in loader.projectLoadedClasses -> "project"
        name in loader.nonProjectLoadedClasses -> "library"
        else -> "no"
    }

    fun codeChanged() {
        stopTopUps()
        sharedLock.withLock {
            (sharedLoader.get(manager) as? ModuleClassLoader)?.let { retired += it }
            sharedLoader.set(manager, next)
            next = null
        }
        currentEmpty = true
        current = null
        disposeRetired()
    }

    fun buildChanged() {
        stopTopUps()
        next?.dispose()
        next = null
        learned.clear()
        projectSeen.clear()
        projectJarClasses = null
        codeChanged()
    }

    private fun disposeRetired() {
        val unused = retired.filter { it !in active }
        unused.forEach { it.dispose() }
        retired.removeAll(unused.toSet())
    }

    private fun stopTopUps() {
        topUps.forEach { it.cancel() }
        runBlocking { topUps.joinAll() }
        topUps.clear()
    }

    override fun close() {
        stopTopUps()
        preloads.cancel()
        next?.dispose()
        next = null
        disposeRetired()
    }

    private companion object {
        fun classNamesIn(jar: File): List<String> = ZipFile(jar).use { z ->
            z.entries().asSequence().map { it.name }.filter { it.endsWith(".class") }
                .map { it.removeSuffix(".class").replace('/', '.') }.toList()
        }
    }
}
