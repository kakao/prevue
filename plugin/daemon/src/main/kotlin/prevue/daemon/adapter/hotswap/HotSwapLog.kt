package prevue.daemon.adapter.hotswap

import java.io.File
import prevue.daemon.domain.model.ExternalResult
import prevue.daemon.domain.model.ReloadResult
import prevue.daemon.domain.model.ShowResult
import prevue.daemon.domain.port.BuildNotice
import prevue.daemon.domain.port.CompileResult
import prevue.daemon.domain.port.SourceChange

internal object HotSwapLog {
    fun line(change: SourceChange, r: ReloadResult, files: List<File> = change.files): String? {
        val names = files.map { it.name }
        return when (r) {
            is ReloadResult.Rendered -> rendered(names, r.result)
            is ReloadResult.CompileFailed -> "reload $names: ok=false detect=${r.timing?.detectMs}ms wait=${r.timing?.waitMs}ms " +
                "compile=${r.compile.ms}ms total=${r.totalMs}ms COMPILE"
            ReloadResult.NothingShown -> null
            is ReloadResult.Unchanged -> "reload $names: unchanged — 내용이 지금 그림과 같다"
            is ReloadResult.ResourcesStale -> "reload $names: stale resources — ${r.why.text}"
            is ReloadResult.NeedsGradleBuild -> "reload $names: needs Gradle build — ${r.why.text}"
        }
    }

    private fun rendered(names: List<String>, s: ShowResult): String {
        val timing = "detect=${s.timing?.detectMs}ms wait=${s.timing?.waitMs}ms compile=${s.shot.compile?.ms}ms"
        val render = "task=${s.shot.out.taskMs}ms render=${s.shot.out.renderMs}ms total=${s.shot.totalMs}ms"
        val path = when (s.shot.compile?.exitCode) { CompileResult.LITERALS -> " literals"; CompileResult.RESOURCES -> " resources"; else -> "" }
        return "reload $names: ok=${s.ok} $timing $render saveToScreen=${s.saveToScreenMs}ms ${s.shot.out.failure ?: ""}$path"
    }

    fun line(n: BuildNotice, r: ExternalResult): String? {
        if (!n.done || r == ExternalResult.NoPreview) return null
        val c = n.change
        return "밖의 변화 own ${c.own.size} · deps ${c.deps.size} · res ${c.resources.size} · build ${c.buildFiles.size}: " + when (r) {
            is ExternalResult.Redrawn -> "ok=${r.result.ok} total=${r.result.shot.totalMs}ms ${r.result.shot.out.failure ?: ""}"
            else -> r.javaClass.simpleName
        }
    }
}
