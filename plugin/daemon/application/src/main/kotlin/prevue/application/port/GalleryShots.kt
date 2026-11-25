package prevue.application.port

import java.io.File

interface GalleryShots {
    class Shot(val id: String, val index: Int, val name: String, val variant: String?, val width: Int, val height: Int, val drawnAt: Long)
    class Kept(val sheets: Int, val shots: List<Shot>, val failedAt: Map<Int, Long>)

    suspend fun keep(file: File, sheets: Int, index: Int, out: RenderOutput): Shot
    suspend fun fail(file: File, sheets: Int, index: Int)
    suspend fun forgetFailures()
    fun kept(file: File): Kept?
    fun image(id: String): File?

    companion object {
        const val FRONT = 3
        const val TRY = 6
    }
}
