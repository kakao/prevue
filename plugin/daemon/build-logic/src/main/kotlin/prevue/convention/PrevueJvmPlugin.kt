package prevue.convention

import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.tasks.compile.JavaCompile
import org.jetbrains.kotlin.gradle.dsl.KotlinJvmProjectExtension
import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

private const val BYTECODE = 17

class PrevueJvmPlugin : Plugin<Project> {
    override fun apply(target: Project) {
        target.pluginManager.apply("org.jetbrains.kotlin.jvm")
        if (target.path in setOf(":adapter:infra", ":adapter:entry")) target.extensions.getByType(KotlinJvmProjectExtension::class.java).explicitApi()
        target.tasks.withType(JavaCompile::class.java).configureEach {
            it.options.release.set(BYTECODE)
        }
        target.tasks.withType(KotlinCompile::class.java).configureEach {
            it.compilerOptions.jvmTarget.set(JvmTarget.fromTarget(BYTECODE.toString()))
            it.compilerOptions.freeCompilerArgs.add("-Xjdk-release=$BYTECODE")
        }
    }
}
