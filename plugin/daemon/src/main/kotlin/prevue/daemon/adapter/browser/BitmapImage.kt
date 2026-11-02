package prevue.daemon.adapter.browser

import java.awt.color.ColorSpace
import java.awt.image.BufferedImage
import java.awt.image.DataBuffer
import java.awt.image.DataBufferInt
import java.awt.image.DirectColorModel
import java.awt.image.Raster
import prevue.daemon.entity.Bitmap

private val MASKS = intArrayOf(0x00ff0000, 0x0000ff00, 0x000000ff, 0xff000000.toInt())

internal fun Bitmap.toImage(): BufferedImage {
    val cm = DirectColorModel(ColorSpace.getInstance(ColorSpace.CS_sRGB), 32, MASKS[0], MASKS[1], MASKS[2], MASKS[3], premultiplied, DataBuffer.TYPE_INT)
    val raster = Raster.createPackedRaster(DataBufferInt(pixels, pixels.size), width, height, width, MASKS, null)
    return BufferedImage(cm, raster, premultiplied, null)
}
