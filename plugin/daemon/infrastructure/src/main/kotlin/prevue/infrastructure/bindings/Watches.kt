package prevue.infrastructure.bindings

import java.io.File
import prevue.infrastructure.dump.ClasspathSpec
import prevue.infrastructure.render.ApkWithAssets
import prevue.infrastructure.source.ValueDirs
import prevue.application.domain.model.ModuleGraph

internal class Watches(
    val watching: Boolean,
    val roots: List<File>,
    val valueDirs: List<File>,
    val ownOut: List<File>,
    val depOut: List<File>,
    val resources: List<File>,
    val buildFiles: List<File>,
) {
    fun buildGroups() = listOf("own" to ownOut, "deps" to depOut, "resources" to resources, "build-files" to buildFiles)

    fun report(graph: ModuleGraph, log: (String) -> Unit) {
        log("감시 중: 모듈 ${graph.nodes.size}개 · 루트 ${roots.size}개 (${graph.nodes.joinToString { it.path }})")
        log("밖의 변화 감시: 산출물 ${ownOut.size}+${depOut.size} · 리소스 ${resources.size} · 빌드 파일 ${buildFiles.size}")
    }

    companion object {
        fun of(config: InfraConfig, graph: ModuleGraph, spec: ClasspathSpec): Watches {
            val watching = config.watching
            val roots = if (!watching) emptyList() else
                (graph.roots + config.extraWatch.filter { it.isDirectory }).map { it.canonicalFile }.distinct()
            val valueDirs = if (!watching) emptyList() else ValueDirs.of(graph.resRoots)
            val rJars = spec.rClassJars.map { File(it) }
            val ownOut = graph.nodes.flatMap { it.outputs }.filter { it !in rJars && it.exists() }
            val depOut = spec.projectClassPath.map { File(it) }.filter { it !in ownOut && it !in rJars && it.exists() }
            val resDirs = graph.nodes.flatMap { it.resRoots }
                .flatMap { r -> r.walkTopDown().filter { it.isDirectory } }
                .filter { it.canonicalFile !in valueDirs }
            val assetDirs = ApkWithAssets.cmpRoots(spec.assetsDirs.map(::File)).flatMap { r -> r.walkTopDown().filter { it.isDirectory } }
            val resources = (listOfNotNull(spec.resourceApkPath.takeIf { it.isNotBlank() }?.let { File(it) }) + rJars)
                .filter { it.exists() } + resDirs + assetDirs
            return Watches(watching, roots, valueDirs, ownOut, depOut, resources, spec.buildFiles)
        }
    }
}
