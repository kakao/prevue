package prevue.application.domain.model

data class ModuleInfo(
    val repo: String,
    val module: String,
    val variant: String,
    val kotlinModule: String,
    val borrowedFrom: String?,
    val borrowedCount: Int?,
    val modules: List<String> = listOf(module),
    val sourceSet: String? = null,
)
