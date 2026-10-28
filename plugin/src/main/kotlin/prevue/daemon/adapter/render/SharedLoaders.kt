package prevue.daemon.adapter.render

import com.android.tools.render.Renderer
import com.android.tools.rendering.RenderTask
import com.android.tools.rendering.classloading.ModuleClassLoader
import com.android.tools.rendering.classloading.Preloader
import java.io.File
import java.util.concurrent.Executor
import java.util.zip.ZipFile
import prevue.daemon.adapter.dump.ClasspathSpec
import prevue.daemon.entity.PreviewSpec

internal class SharedLoaders(private val spec: ClasspathSpec, private val renderer: Renderer) {
    data class Preloaded(val held: Int, val used: Int, val projectHeld: List<String>)

    var currentEmpty = true
        private set
    var current: ClassLoader? = null
    private var next: ModuleClassLoader? = null
    private val learned = LinkedHashSet<String>()
    private val projectSeen = HashSet<String>()
    private val topUps = ArrayList<Preloader<*>>()

    private val manager: Any by lazy { field(Renderer::class.java, "moduleClassLoaderManager").get(renderer) }
    private val createLoader by lazy { manager.javaClass.getDeclaredMethod("createClassLoader", ClassLoader::class.java).apply { isAccessible = true } }
    private val preloaderField by lazy { field(manager.javaClass, "preloader") }
    private val preloadExecutor: Executor by lazy { field(manager.javaClass, "preloaderExecutor").get(manager) as Executor }
    private val sharedCache: Any by lazy { field(manager.javaClass, "sharedClassLoaders").get(manager) }
    private val invalidateAll by lazy { Class.forName("com.google.common.cache.Cache", true, manager.javaClass.classLoader).getMethod("invalidateAll") }

    @Suppress("UNCHECKED_CAST")
    private val composeClasses: Collection<String> by lazy {
        Class.forName("com.android.tools.render.ComposeClassesKt", true, manager.javaClass.classLoader)
            .getMethod("getCOMPOSE_CLASSES").invoke(null) as Collection<String>
    }

    private val projectJarClasses: Set<String> by lazy {
        spec.projectClassPath.filter { it !in spec.rClassJars }.map(::File)
            .filter { it.isFile && it.name.endsWith(".jar") }
            .flatMapTo(HashSet(), ::classNamesIn)
    }
    private val projectDirs: List<File> by lazy { spec.projectClassPath.map(::File).filterNot { it.isFile } }

    private fun isProjectClass(name: String): Boolean =
        name in projectJarClasses || projectDirs.any { File(it, name.replace('.', '/') + ".class").exists() }

    fun armNext() {
        val loader = createLoader.invoke(manager, null) as ModuleClassLoader
        next = loader
        stopTopUps()
        preloaderField.set(manager, Preloader(loader, preloadExecutor, LinkedHashSet(composeClasses).apply { addAll(learned) }))
    }

    fun claimedForNewGeneration() {
        armNext()
        currentEmpty = false
    }

    fun learnFrom(task: RenderTask) {
        val loaded = task.classLoader as? ModuleClassLoader ?: return
        val waiting = next ?: return
        if (loaded === waiting) return
        val fresh = loaded.nonProjectLoadedClasses.filterTo(ArrayList(), ::learnLibraryClass)
        if (fresh.isNotEmpty()) topUps += Preloader(waiting, preloadExecutor, fresh)
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
        invalidateAll.invoke(sharedCache)
        currentEmpty = true
        current = null
    }

    suspend fun <T> withPreloaderParked(park: Boolean, block: suspend () -> T): T {
        val parked = if (park) preloaderField.get(manager).also { preloaderField.set(manager, null) } else null
        try {
            return block()
        } finally {
            if (parked != null) preloaderField.set(manager, parked)
        }
    }

    private fun stopTopUps() {
        topUps.forEach { it.cancel() }
        topUps.clear()
    }

    private companion object {
        fun field(owner: Class<*>, name: String) = owner.getDeclaredField(name).apply { isAccessible = true }

        fun classNamesIn(jar: File): List<String> = ZipFile(jar).use { z ->
            z.entries().asSequence().map { it.name }.filter { it.endsWith(".class") }
                .map { it.removeSuffix(".class").replace('/', '.') }.toList()
        }
    }
}
