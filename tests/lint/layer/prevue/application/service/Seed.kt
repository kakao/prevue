package prevue.application.service

import java.awt.Color // 잡는다 ForbiddenImport/application
import java.io.File
import java.io.FileInputStream
import java.nio.file.Path // 잡는다 ForbiddenImport/application
import javax.imageio.ImageIO // 잡는다 ForbiddenImport/application
import kotlin.io.path.exists // 잡는다 ForbiddenImport/application
import prevue.application.port.Seed

fun seed(): List<Any> {
    val file = File("seed")
    file.exists() // 잡는다 ForbiddenMethodCall/application
    file.readText() // 잡는다 ForbiddenMethodCall/application
    file.forEachLine { } // 잡는다 ForbiddenMethodCall/application
    FileInputStream(file) // 잡는다 ForbiddenMethodCall/application
    return listOf(file.path, file.canonicalPath, "x".reader().readText())
}
