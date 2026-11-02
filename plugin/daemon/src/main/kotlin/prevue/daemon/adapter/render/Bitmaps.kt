package prevue.daemon.adapter.render

import java.awt.image.BufferedImage
import java.awt.image.DataBufferInt
import prevue.daemon.entity.Bitmap

private val SHARED = mapOf(BufferedImage.TYPE_INT_ARGB to false, BufferedImage.TYPE_INT_ARGB_PRE to true)

internal fun BufferedImage.toBitmap(): Bitmap {
    val premultiplied = SHARED[type]
    val shared = (raster.dataBuffer as? DataBufferInt)?.data?.takeIf { premultiplied != null && it.size == width * height }
    return if (shared != null) Bitmap(width, height, shared, premultiplied == true)
    else Bitmap(width, height, getRGB(0, 0, width, height, null, 0, width))
}
