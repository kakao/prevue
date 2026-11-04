package prevue.convention

import org.gradle.api.Plugin
import org.gradle.api.Project

class PrevueMetroPlugin : Plugin<Project> {
    override fun apply(target: Project) {
        target.pluginManager.apply(PrevueCoroutinesPlugin::class.java)
        target.pluginManager.apply("dev.zacsweers.metro")
    }
}
