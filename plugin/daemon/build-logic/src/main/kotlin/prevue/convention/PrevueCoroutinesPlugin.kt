package prevue.convention

import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.artifacts.VersionCatalogsExtension

class PrevueCoroutinesPlugin : Plugin<Project> {
    override fun apply(target: Project) {
        target.pluginManager.apply(PrevueJvmPlugin::class.java)
        val rendererCoroutines = target.extensions.getByType(VersionCatalogsExtension::class.java)
            .named("libs").findLibrary("kotlinx-coroutines-renderer").get()
        listOf("compileOnly", "testCompileOnly").forEach {
            target.dependencies.addProvider(it, rendererCoroutines)
        }
    }
}
