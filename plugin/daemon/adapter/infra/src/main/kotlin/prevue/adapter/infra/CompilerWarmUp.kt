package prevue.adapter.infra

import java.io.File
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import dev.zacsweers.metro.Inject
import prevue.adapter.compile.HotCompiler
import prevue.entity.ModuleGraph

@Inject
public class CompilerWarmUp internal constructor(
    private val compiler: HotCompiler,
    private val dumps: Dumps,
    private val graph: ModuleGraph,
    private val paths: DaemonPaths,
    private val scope: CoroutineScope,
    private val log: InfraLog,
) {
    public fun start(file: String?, after: Job?) {
        scope.launch(CoroutineName("prevue-warmup")) {
            after?.join()
            val warmFile = file?.substringBefore('#')?.let { File(it) }?.takeIf { it.isFile }
                ?: dumps.target.sourceRoots.asSequence().flatMap { it.walkTopDown() }.takeWhile { isActive }.firstOrNull {
                    it.extension == "kt" && it.readText().contains("@Preview")
                }
            if (warmFile == null || !isActive) return@launch
            val r = compiler.warmUp(graph.ownerOf(warmFile.canonicalFile), warmFile, paths.warmup, shouldContinue = { isActive })
            val last = r.lastOrNull()
            log("컴파일러 웜업 ${r.size}회 ${r.joinToString("·") { it.ms.toString() }}ms ${last?.exitCode}" +
                if (last?.ok == false) "\n${last.messages}" else "")
        }
    }
}
