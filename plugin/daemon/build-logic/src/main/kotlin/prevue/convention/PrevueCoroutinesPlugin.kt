package prevue.convention

import org.gradle.api.GradleException
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.artifacts.VersionCatalogsExtension

private const val CATALOG = "libs"
private const val RENDERER_COROUTINES = "kotlinx-coroutines-renderer"

class PrevueCoroutinesPlugin : Plugin<Project> {
    override fun apply(target: Project) {
        target.pluginManager.apply(PrevueJvmPlugin::class.java)
        val rendererCoroutines = target.extensions.getByType(VersionCatalogsExtension::class.java)
            .named(CATALOG).findLibrary(RENDERER_COROUTINES)
            .orElseThrow { GradleException("version catalog '$CATALOG' has no library '$RENDERER_COROUTINES'") }
        target.dependencies.addProvider("compileOnly", rendererCoroutines)
    }
}
