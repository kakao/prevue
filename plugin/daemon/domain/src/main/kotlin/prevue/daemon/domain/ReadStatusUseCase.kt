package prevue.daemon.domain

import prevue.daemon.domain.model.EngineStats
import prevue.daemon.domain.model.ModuleInfo
import prevue.daemon.domain.model.ScreenSize
import prevue.daemon.domain.model.Status
import prevue.daemon.domain.model.WatchStats
import prevue.daemon.domain.port.BuildWatcher
import prevue.daemon.domain.port.Compiler
import prevue.daemon.domain.port.MemoryMeter
import prevue.daemon.domain.port.PreviewRenderer
import prevue.daemon.domain.port.SourceWatcher
import prevue.daemon.domain.runtime.Workspace
import prevue.daemon.domain.runtime.WorkspaceState

/** 데몬이 지금 무엇을 보여 주고 어떤 상태인가 — 에이전트의 `prevue status`. 줄을 서지 않는다: 저장 중에도 물을 수 있어야 한다. */
class ReadStatusUseCase(
    private val ws: Workspace,
    private val engine: PreviewRenderer,
    private val compiler: Compiler,
    private val sources: SourceWatcher?,
    private val builds: BuildWatcher?,
    private val memory: MemoryMeter,
    private val values: SourceWatcher? = null,
) {
    operator fun invoke(): Status {
        val rt = Runtime.getRuntime()
        val s = ws.now
        return Status(
            module = shownModule(s),
            preview = s.current, shownBy = s.shownBy, shownAt = s.shownAt,
            board = s.board?.view(), interactive = s.interactive, reloadPending = ws.reloadPending,
            selection = s.selection, tabs = s.tabViews(ws.graph), renderModules = s.renderModules.toList(), stale = s.stale, last = s.lastResult,
            // NFR-6. 상주 프로세스가 얼마를 쥐고 있는지. 안 보이면 절제할 근거가 없다.
            engine = EngineStats(
                compilerWarm = compiler.warm, bootstrapMs = engine.bootstrapMs,
                loaderGen = engine.loaderGen, tasksOnLoader = engine.tasksOnLoader,
                overlay = compiler.overlayDir.absolutePath, out = engine.outDir.absolutePath,
                outBytes = engine.outBytes, outMaxBytes = engine.outMaxBytes, touchModeError = engine.touchModeError,
                heapUsedMb = (rt.totalMemory() - rt.freeMemory()) / 1024 / 1024, heapMaxMb = rt.maxMemory() / 1024 / 1024,
                rssMb = memory.rssMb(),
            ),
            watch = sources?.let { w -> WatchStats(w.stats, builds?.stats.orEmpty(), values?.stats.orEmpty()) },
            lastRenderMs = s.lastRenderMs,
            focusAttachedAt = s.focusAttachedAt,
            work = s.work, lastShown = s.lastShown, boardFill = s.boardFill, size = s.shownSize(),
            postures = s.livePostures()?.drawn(s.shownTarget()?.second).orEmpty(),
            kmp = ws.graph.kmp,
        )
    }

    /** 지금 보드(없으면 한 장)의 파일을 가진 모듈. 아무것도 안 열었으면 띄운 모듈이다. */
    private fun shownModule(s: WorkspaceState): ModuleInfo {
        val file = s.board?.file ?: s.current?.file ?: return ws.module
        val m = ws.graph.ownerOf(file)
        val owner = if (m == ws.module.module) ws.module else ws.module.copy(module = m, kotlinModule = ws.graph.node(m)?.kotlinModule ?: "")
        return owner.copy(sourceSet = ws.graph.sourceSetOf(file))
    }
}
