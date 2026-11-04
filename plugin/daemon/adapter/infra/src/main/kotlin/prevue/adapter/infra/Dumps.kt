package prevue.adapter.infra

import java.io.File
import java.io.IOException
import java.io.UncheckedIOException
import prevue.adapter.dump.ClasspathSpec

internal class Dumps(val home: ClasspathSpec, val app: ClasspathSpec?) {
    val target: ClasspathSpec = app?.let { home.withResourcesFrom(it) } ?: home
    val renderedApp: ClasspathSpec? = if (app == null) home else app.takeIf { ClasspathSpec.appHolds(home, it) }

    init {
        require(target.resourceApkPath.isNotBlank()) {
            "${target.project}(${target.variant})에 리소스 APK가 없다 — 라이브러리 모듈은 혼자서는 못 그린다. " +
                "이 모듈을 포함하는 앱 모듈의 덤프를 --resources-from <app.json>으로 준다"
        }
    }

    fun specOf(module: String, paths: DaemonPaths): ClasspathSpec = when {
        module == home.project -> home
        app != null && module == app.project -> app
        else -> paths.dumpOf(module, home.variant).takeIf { it.isFile }?.let(ClasspathSpec::load) ?: (app ?: home).dependency(module)
    }

    companion object {
        fun load(config: InfraConfig): Dumps = Dumps(read(config.classpath), config.resourcesFrom?.let(::read))

        private fun read(file: File): ClasspathSpec = try { ClasspathSpec.load(file) }
            catch (e: IOException) { throw UncheckedIOException(e) }
    }
}

internal class AndroidJar(val file: File)
