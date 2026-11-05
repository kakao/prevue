package prevue.infrastructure.render

import java.awt.image.BufferedImage
import java.awt.image.DataBufferInt
import prevue.application.domain.model.Bitmap

internal fun BufferedImage.toBitmap(): Bitmap {
    val premultiplied = when (type) {
        BufferedImage.TYPE_INT_ARGB -> false
        BufferedImage.TYPE_INT_ARGB_PRE -> true
        else -> null
    }
    val shared = (raster.dataBuffer as? DataBufferInt)?.data?.takeIf { it.size == width * height }
    return if (premultiplied != null && shared != null) Bitmap(width, height, shared, premultiplied)
    else Bitmap(width, height, getRGB(0, 0, width, height, null, 0, width))
}
