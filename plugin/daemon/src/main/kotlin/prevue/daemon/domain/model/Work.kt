package prevue.daemon.domain.model

import java.io.File
import prevue.daemon.entity.PreviewSpec

sealed interface Work {
    val by: String

    data class Compiling(val files: List<File>, override val by: String) : Work
    data class Rendering(val preview: PreviewSpec, override val by: String) : Work
}

data class BoardFill(val since: Long, val ms: Long, val cards: Int)
