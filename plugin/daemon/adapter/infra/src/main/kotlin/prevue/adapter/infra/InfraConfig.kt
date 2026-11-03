package prevue.adapter.infra

import java.io.File

data class InfraConfig(
    val classpath: File,
    val layoutlib: File,
    val compiler: File,
    val bridge: File,
    val port: Int,
    val resourcesFrom: File? = null,
    val cache: File = classpath.absoluteFile.parentFile,
    val out: File? = null,
    val overlay: File? = null,
    val androidJar: File? = null,
    val watching: Boolean = true,
    val extraWatch: List<File> = emptyList(),
    val preload: Boolean = true,
)
