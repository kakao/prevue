package prevue.domain.model

import prevue.entity.Bitmap
import prevue.domain.port.LiveSession

class LiveFrame(val seq: Long, val image: Bitmap, val rest: Boolean)

class SettledShot(
    val inputSeq: Long,
    val frameSeq: Long,
    val look: LiveSession.Look,
    val stats: Map<String, Any?>,
    val settled: Boolean,
    val claimed: Boolean,
) {
    val out get() = look.out
    val frames get() = stats["frames"] as? Int ?: 0
}
