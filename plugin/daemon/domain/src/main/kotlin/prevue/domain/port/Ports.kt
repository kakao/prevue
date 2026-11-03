package prevue.domain.port

class Ports(
    val engine: PreviewRenderer,
    val sessions: LiveSessionFactory,
    val compiler: Compiler,
    val previews: PreviewRepository,
    val sourceFiles: SourceFileRepository,
    val memory: MemoryMeter = MemoryMeter { null },
    val resources: ResourceValues? = null,
)

class Watchers(val sources: SourceWatcher? = null, val builds: BuildWatcher? = null, val values: SourceWatcher? = null)
