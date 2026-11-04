package prevue.adapter.infra

import java.io.File
import dev.zacsweers.metro.Inject
import prevue.adapter.dump.AppIdentity
import prevue.adapter.process.Reveal
import prevue.adapter.source.GitHead

@Inject
public class TargetCheckout internal constructor(dumps: Dumps, paths: DaemonPaths) {
    private val repoRoot = dumps.target.repoRoot
    private val identity = (dumps.app ?: dumps.home).let { AppIdentity(it.manifests, it.resourceDirs.map(::File)) }

    public val outDir: File = paths.out
    public val appName: String? get() = identity.name
    public val appIcon: ByteArray? get() = identity.icon

    public fun branch(): String? = GitHead.read(repoRoot)
    public fun reveal(): Unit = Reveal.open(repoRoot)
}
