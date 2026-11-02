package prevue.daemon.domain.port

import java.awt.image.BufferedImage
import prevue.daemon.entity.ListState
import prevue.daemon.entity.LiveTree
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.entity.SemanticNode

fun interface LiveSessionFactory {
    suspend fun open(p: PreviewSpec, interactive: Boolean, ownLoader: Boolean): LiveSession
}

interface LiveSession {
    val preview: PreviewSpec
    val opened: RenderOutput

    suspend fun touch(type: String, x: Int, y: Int)
    fun type(text: String): String?
    fun scroll(x: Int, y: Int, dx: Float, dy: Float): Boolean
    fun tick(forceImage: Boolean = false): Frame
    suspend fun look(semantics: Boolean = false): Look
    fun lists(): List<ListState>
    fun semantics(): List<SemanticNode>
    suspend fun renderAt(ms: Long, frameMs: Long = 16): RenderOutput
    fun close()

    class Look(val out: RenderOutput, val tree: LiveTree)
}

class Frame(val changed: Boolean, val idle: Boolean, val image: BufferedImage?, val handlerQueue: Int, val choreographerQueue: Int, val ms: Long)
