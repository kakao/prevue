package prevue.daemon.adapter.render

import com.android.resources.ResourceFolderType
import com.android.tools.configurations.Configuration
import com.android.tools.render.RenderEnvironmentBootstrapper
import com.android.tools.render.Renderer
import com.android.tools.render.compose.ComposeScreenshot
import com.android.tools.rendering.RenderLogger
import com.android.tools.rendering.RenderResult
import com.android.tools.rendering.RenderService
import com.android.tools.rendering.RenderTask
import com.android.tools.rendering.parsers.RenderXmlFileSnapshot
import com.intellij.openapi.Disposable
import com.intellij.openapi.util.CheckedDisposable
import com.intellij.openapi.util.Disposer
import java.io.File
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import prevue.daemon.adapter.dump.ClasspathSpec
import prevue.daemon.adapter.render.RenderOutputs.Companion.msSince
import prevue.daemon.entity.ListState
import prevue.daemon.entity.LiveTree
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.entity.SemanticNode
import prevue.daemon.entity.Phrase
import prevue.daemon.entity.phrase
import prevue.daemon.domain.port.FailureKind
import prevue.daemon.domain.port.Frame
import prevue.daemon.domain.port.LiveSession as SessionPort
import prevue.daemon.domain.port.LiveSessionFactory
import prevue.daemon.domain.port.PreviewRenderer
import prevue.daemon.domain.port.RenderOutput
import prevue.render.Shim

class RenderEngine(
    private val spec: ClasspathSpec,
    private val layoutlibDir: File,
    override val outDir: File,
) : PreviewRenderer, LiveSessionFactory, AutoCloseable {
    val renderer: Renderer
    override val bootstrapMs: Long
    val negatives: ApkNegatives.Fixed?
    private val renderService: RenderService
    private val baseConfiguration: Configuration
    private val resourceIds: ResourceIds

    var preloadNext: Boolean = true
    private val loaderCount = MutableStateFlow(LoaderCount(0, 0))
    override val loaderGen: Int get() = loaderCount.value.gen
    override val tasksOnLoader: Int get() = loaderCount.value.tasks

    private val artifacts = RenderArtifactStore(outDir)
    private val outputs = RenderOutputs(artifacts) { p, why, loader -> loaders.reportBlank(p, why, loader, loaderGen, tasksOnLoader) }
    override var outMaxBytes: Long
        get() = artifacts.maxBytes
        set(value) { artifacts.maxBytes = value }
    override val outBytes: Long get() = artifacts.bytes
    override fun protect(keep: () -> Set<String>) = artifacts.protect(keep)

    private val loaders: SharedLoaders
    private val literals = LiteralLedger()
    private val shapes = PreviewShapes()

    private var live: LayoutlibSession? = null
    var renderTimeoutSec: Long = 30

    private val watch = RenderThreadWatch()
    val lost: StateFlow<Lost?> get() = watch.lost
    private val lostThread: Phrase? get() = watch.reason

    private val touchMode = MutableStateFlow<String?>(null)
    override val touchModeError: String? get() = touchMode.value
    private var scrollBroken: String? = null
    private var treeRefreshBroken: String? = null

    private val lazyListReader = LazyListReader()
    private val semanticsReader = SemanticsReader()

    private val ripples = RippleCalmer { System.err.println("[prevue] $it") }
    val calmedRipples: Int get() = ripples.calmed

    init {
        val t = System.nanoTime()
        renderer = RenderEnvironmentBootstrapper(
            File(layoutlibDir, "data/fonts").absolutePath, spec.resourceApkPath, spec.namespace,
            spec.classPath, spec.projectClassPath, layoutlibDir.absolutePath, spec.resourceDirs, spec.rClassJars,
        ).bootstrap()
        bootstrapMs = msSince(t)
        negatives = ApkNegatives.fix(renderer, spec.resourceApkPath)
        renderService = privateField("renderService") as RenderService
        baseConfiguration = privateField("baseConfiguration") as Configuration
        resourceIds = ResourceIds(renderer)
        loaders = SharedLoaders(spec, renderer)
        outDir.mkdirs()
    }

    private fun privateField(name: String): Any = Renderer::class.java.getDeclaredField(name).apply { isAccessible = true }.get(renderer)

    internal fun preloaded(): SharedLoaders.Preloaded = loaders.preloaded(live?.task?.classLoader)

    override fun codeChanged() { shapes.recount(); loaders.codeChanged(); outputs.afterBuild = false }

    override fun patchLiterals(owner: String, values: Map<String, Any>): Boolean {
        if (!preloadNext) { literals.record(owner, values); return true }
        val loader = loaders.current ?: return false
        if (runCatching { Class.forName(owner, false, loader) }.isFailure) return false
        val before = literals.snapshot(owner)
        literals.record(owner, values)
        val err = literals.applyTo(loader) ?: return true
        literals.restore(owner, before)
        codeChanged()
        System.err.println("[prevue] 리터럴 값을 넣지 못했다 — 컴파일로 간다: $err")
        return false
    }

    override fun dropLiterals(owners: Collection<String>) = literals.drop(owners)

    override fun buildChanged() {
        if (preloadNext) loaders.armNext()
        codeChanged()
        outputs.afterBuild = true
        forgetShapes()
    }

    override fun forgetShapes() = shapes.forgetAll()

    override suspend fun awaitWrites() = artifacts.awaitWrites()

    override suspend fun written(out: RenderOutput): RenderOutput = out.copy(phases = out.phases + out.written.await())

    override fun instanceCount(p: PreviewSpec): Int {
        if (p.methodParams.isEmpty()) return 1
        return shapes.count(p) {
            runCatching { screenshot(p).toPreviewElement(renderer.module).resolveXmlLayouts().count() }.getOrElse { 1 }.coerceAtLeast(1)
        }
    }

    private fun screenshot(p: PreviewSpec) = ComposeScreenshot(p.fqn, p.methodParams, p.params, p.previewId, "")

    override suspend fun show(p: PreviewSpec, ownLoader: Boolean): RenderOutput = render(p, interactive = false, ownLoader)

    override suspend fun open(p: PreviewSpec, interactive: Boolean, ownLoader: Boolean): SessionPort {
        val out = render(p, interactive, ownLoader)
        return Handle(live.takeIf { out.ok }, out)
    }

    private suspend fun render(p: PreviewSpec, interactive: Boolean, ownLoader: Boolean): RenderOutput {
        if (lostThread != null) return lostOutput(p)
        val ph = mutableMapOf<String, Long>()
        val t = System.nanoTime()
        disposeLive()
        ph["disposeMs"] = msSince(t)
        val own = interactive || ownLoader
        val started = when (val s = start(p, ph, usePrivate = own || !preloadNext, park = own && preloadNext, counted = !own)) {
            is Start.Ready -> s
            is Start.Failed -> return s.out
        }
        live = started.session
        val out = if (interactive) renderInteractive(started.timing) else renderLive(started.timing)
        learnFrom(started)
        return out
    }

    override suspend fun showAside(p: PreviewSpec): RenderOutput {
        if (lostThread != null) return lostOutput(p)
        val usePrivate = !preloadNext || live?.task?.classLoader?.let { it === loaders.current } == true
        val started = when (val s = start(p, mutableMapOf(), usePrivate, park = usePrivate && preloadNext, counted = true)) {
            is Start.Ready -> s
            is Start.Failed -> return s.out
        }
        try {
            return renderOn(started.session, started.timing, remember = false).also { learnFrom(started) }
        } finally {
            if (lostThread == null) dispose(started.session)
        }
    }

    override fun copyImage(out: RenderOutput, previewId: String): RenderOutput = out.copy(
        preview = out.preview.copy(previewId = previewId), image = artifacts.imageFile(previewId), tree = null,
        written = artifacts.copyImage(out.preview.previewId, previewId), phases = emptyMap(),
    )

    private fun learnFrom(s: Start.Ready) {
        if (!s.usePrivate && preloadNext && lostThread == null) loaders.learnFrom(s.session.task)
    }

    private fun layoutFor(p: PreviewSpec, ph: MutableMap<String, Long>): Pair<Configuration, String>? {
        val t = System.nanoTime()
        val element = screenshot(p).toPreviewElement(renderer.module)
        val cfg = baseConfiguration.clone()
        Shim.applyTo(element, cfg)
        val layouts = shapes.layouts(p) { element.resolveXmlLayouts().toList() }
        ph["elementMs"] = msSince(t)
        if (layouts.isEmpty()) return null
        return cfg to layouts[p.paramIndex.coerceIn(0, layouts.size - 1)]
    }

    private sealed interface Start {
        class Ready(val session: LayoutlibSession, val timing: RenderTiming, val usePrivate: Boolean) : Start
        class Failed(val out: RenderOutput) : Start
    }

    private suspend fun start(p: PreviewSpec, ph: MutableMap<String, Long>, usePrivate: Boolean, park: Boolean, counted: Boolean): Start {
        val t0 = System.nanoTime()
        val (cfg, xml) = layoutFor(p, ph) ?: return Start.Failed(failedBefore(p, phrase("render.noInstances")))
        val logger = RenderLogger()
        val disposable = Disposer.newCheckedDisposable()
        val tb = System.nanoTime()
        val task = when (val built = buildTask(p, cfg, logger, disposable, usePrivate, park)) {
            is Built.Task -> built.task
            is Built.Failed -> return Start.Failed(built.out)
        }
        ph["buildMs"] = msSince(tb)
        Disposer.register(disposable, Disposable { task.releaseRender() })
        val loader: ClassLoader? = task.classLoader
        loader?.let(literals::applyTo)?.let { e ->
            Disposer.dispose(disposable)
            return Start.Failed(failedBefore(p, phrase("render.literalsNotApplied", "why" to e)))
        }
        if (!usePrivate) loaders.current = loader
        task.setTimeout(renderTimeoutSec * 1000)
        task.setXmlFile(RenderXmlFileSnapshot(renderer.project, "layout.xml", ResourceFolderType.LAYOUT, xml))
        val session = LayoutlibSession(p, task, disposable, logger) { renderTimeoutSec }
        val timing = RenderTiming(msSince(t0), 0, loaders.currentEmpty || usePrivate, ph)
        if (counted) countTask()
        resourceIds.registeredByFirstLoader()
        return Start.Ready(session, timing, usePrivate)
    }

    private sealed interface Built {
        class Task(val task: RenderTask) : Built
        class Failed(val out: RenderOutput) : Built
    }

    private suspend fun buildTask(
        p: PreviewSpec, cfg: Configuration, logger: RenderLogger, disposable: CheckedDisposable, usePrivate: Boolean, park: Boolean,
    ): Built {
        val before = RenderTiming.failedBeforeRender(true)
        return loaders.withPreloaderParked(park) {
            try {
                val task = renderService.taskBuilder(renderer.module, cfg, logger).apply { if (usePrivate) usePrivateClassLoader() }.build(disposable).get()
                if (task != null) Built.Task(task)
                else Built.Failed(failedBefore(p, phrase("render.taskNotCreated", "why" to logger.messages.joinToString { it.html })))
            } catch (e: Exception) {
                Disposer.dispose(disposable)
                Built.Failed(if (hung(p)) lostOutput(p) else outputs.failed(p, FailureKind.EXCEPTION, phrase("render.taskFailed", "why" to e), before))
            }
        }
    }

    private fun countTask() {
        val fresh = preloadNext && loaders.currentEmpty
        if (fresh) loaders.claimedForNewGeneration()
        val now = loaderCount.value
        loaderCount.value = if (fresh) LoaderCount(now.gen + 1, 1) else now.copy(tasks = now.tasks + 1)
    }

    private suspend fun renderInteractive(timing: RenderTiming): RenderOutput {
        val (out, attachError) = TouchModeWindow.attach { renderLive(timing) }
        if (out.ok) touchMode.value = live?.ensureTouchMode(attachError) ?: attachError
        return out
    }

    private inner class Handle(private val session: LayoutlibSession?, override val opened: RenderOutput) : SessionPort {
        override val preview: PreviewSpec get() = opened.preview

        private fun l(): LayoutlibSession = session?.takeIf { it === live } ?: error(lostThread?.text ?: CLOSED)

        override suspend fun look(semantics: Boolean): SessionPort.Look {
            val l = l()
            outputs.forgetTree()
            val out = renderLive(RenderTiming(0, 0, false), relayout = true)
            val nodes = ViewInfoJson.nodes(outputs.lastCompose)
            val raws = lazyListReader.readIn(l, outputs.lastAdapter)
            held = raws.mapNotNull { it.handle.state }
            val (lists, states) = LazyListPlacement.placeAll(raws, nodes)
            return SessionPort.Look(out, LiveTree(out.width, out.height, nodes, lists, states, if (semantics) semanticsReader.readIn(l) else emptyList()))
        }

        private var held: List<Any> = emptyList()

        override fun lists(): List<ListState> = LazyListPlacement.unplaced(lazyListReader.rereadIn(l(), held))

        override fun semantics(): List<SemanticNode> = semanticsReader.readIn(l())

        override fun scroll(x: Int, y: Int, dx: Float, dy: Float): Boolean {
            val l = l()
            if (scrollBroken != null) return false
            l.anchor()
            return try {
                val root = l.viewRoot() ?: error(NO_ROOT)
                l.wheel(root, x, y, dx, dy)
                true
            } catch (e: Exception) {
                scrollBroken = e.toString()
                System.err.println("[prevue] 휠을 넣지 못했다 — 휠 스크롤을 끈다: $e")
                false
            }
        }

        override suspend fun touch(type: String, x: Int, y: Int) {
            val l = l()
            l.anchor()
            l.touch(type, x, y)
        }

        override fun type(text: String): String? {
            val l = l()
            l.anchor()
            val root = l.viewRoot() ?: return NO_ROOT
            return l.type(root, text)
        }

        override fun tick(forceImage: Boolean): Frame = l().frame(forceImage, ripples)

        override suspend fun renderAt(ms: Long, frameMs: Long): RenderOutput {
            val l = l()
            val waiting = l.realClockWarning()
            l.step(ms, frameMs)
            val out = renderLive(RenderTiming(0, 0, false), relayout = true)
            return (waiting ?: l.realClockWarning())?.takeIf { out.ok }?.let { out.copy(warnings = out.warnings + it) } ?: out
        }

        override fun close() {
            if (session != null && session === live) disposeLive()
        }
    }

    internal fun focusedView(): String? = (live ?: error(NOTHING_SHOWN)).focusedViewName()

    private suspend fun renderLive(timing: RenderTiming, relayout: Boolean = false): RenderOutput =
        renderOn(live ?: error(NOTHING_SHOWN), timing, relayout)

    private suspend fun renderOn(l: LayoutlibSession, timing: RenderTiming, relayout: Boolean = false, remember: Boolean = true): RenderOutput {
        if (lostThread != null) return lostOutput(l.preview)
        val t = System.nanoTime()
        val result: RenderResult = try {
            l.task.render().get(renderTimeoutSec, TimeUnit.SECONDS)
        } catch (e: TimeoutException) {
            return renderFailed(l, timing, t, FailureKind.TIMEOUT, phrase("render.timedOut", "sec" to renderTimeoutSec), timedOut = true)
        } catch (e: Exception) {
            return renderFailed(l, timing, t, FailureKind.EXCEPTION, phrase("render.exception", "why" to e), timedOut = false)
        }
        val renderMs = msSince(t)
        if (relayout) refreshTree(l, result)
        val out = outputs.written(l.preview, result, l.logger, timing.copy(renderMs = renderMs), l.task.classLoader, remember)
        return if (!out.ok && hung(l.preview)) lostOutput(l.preview) else out
    }

    private suspend fun renderFailed(
        l: LayoutlibSession, timing: RenderTiming, since: Long, kind: FailureKind, message: Phrase, timedOut: Boolean,
    ): RenderOutput {
        if (hung(l.preview, timedOut)) return lostOutput(l.preview)
        if (l === live) disposeLive()
        return outputs.failed(l.preview, kind, message, timing.copy(renderMs = msSince(since)))
    }

    private fun refreshTree(l: LayoutlibSession, result: RenderResult) {
        val why = l.rebuildTree(result) ?: return
        if (treeRefreshBroken != null) return
        treeRefreshBroken = why
        System.err.println("[prevue] 트리를 지금 화면으로 다시 짓지 못했다 — 첫 화면의 트리가 남는다: $why")
    }

    private suspend fun hung(p: PreviewSpec, timedOut: Boolean = false): Boolean = watch.hung(p, timedOut).also { if (it) live = null }

    private fun lostOutput(p: PreviewSpec) = outputs.failed(p, FailureKind.TIMEOUT, lostWhy(), RenderTiming.failedBeforeRender(false))
    private fun lostWhy() = lostThread ?: phrase("render.nothingShown")
    private fun failedBefore(p: PreviewSpec, why: Phrase) = outputs.failed(p, FailureKind.EXCEPTION, why, RenderTiming.failedBeforeRender(true))

    fun invalidateResourceIds() = resourceIds.forget()

    fun disposeLive() {
        if (lostThread != null) { live = null; return }
        live?.let(::dispose)
        live = null
    }

    private fun dispose(l: LayoutlibSession) {
        runCatching { SessionDisposal.dispose(l.task) }.onFailure { e -> System.err.println("[prevue] 세션 정리 실패: $e") }
        runCatching { Disposer.dispose(l.disposable) }.onFailure { e -> System.err.println("[prevue] disposable 정리 실패: $e") }
    }

    override fun close() {
        try { disposeLive() } finally {
            try { artifacts.close() } finally { if (lostThread == null) renderer.close() }
        }
    }

    private data class LoaderCount(val gen: Int, val tasks: Int)

    private companion object {
        const val NOTHING_SHOWN = "보여 주는 프리뷰가 없다"
        const val CLOSED = "라이브 세션이 닫혔다"
        const val NO_ROOT = "세션의 루트 뷰를 찾지 못했다"
    }
}
