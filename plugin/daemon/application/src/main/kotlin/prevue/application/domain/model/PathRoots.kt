package prevue.application.domain.model

import java.io.File

fun File.isUnder(root: File): Boolean = path.startsWith(root.path + File.separator)
