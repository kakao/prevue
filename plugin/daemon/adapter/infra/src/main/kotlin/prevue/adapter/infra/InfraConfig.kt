package prevue.adapter.infra

import java.io.File

public data class InfraConfig(
    public val classpath: File,
    public val layoutlib: File,
    public val compiler: File,
    public val bridge: File,
    public val port: Int,
    public val resourcesFrom: File? = null,
    public val cache: File = classpath.absoluteFile.parentFile,
    public val out: File? = null,
    public val overlay: File? = null,
    public val androidJar: File? = null,
    public val watching: Boolean = true,
    public val extraWatch: List<File> = emptyList(),
    public val preload: Boolean = true,
)
