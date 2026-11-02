package prevue.daemon.adapter.browser

import java.awt.color.ColorSpace
import java.awt.image.BufferedImage
import java.awt.image.DataBuffer
import java.awt.image.DataBufferInt
import java.awt.image.DirectColorModel
import java.awt.image.Raster
import prevue.daemon.entity.Bitmap

private val MASKS = intArrayOf(0x00ff0000, 0x0000ff00, 0x000000ff, 0xff000000.toInt())

private fun argb(premultiplied: Boolean) =
    DirectColorModel(ColorSpace.getInstance(ColorSpace.CS_sRGB), 32, MASKS[0], MASKS[1], MASKS[2], MASKS[3], premultiplied, DataBuffer.TYPE_INT)

private val STRAIGHT = argb(premultiplied = false)
private val PREMULTIPLIED = argb(premultiplied = true)

internal fun Bitmap.toImage(): BufferedImage {
    val raster = Raster.createPackedRaster(DataBufferInt(pixels, pixels.size), width, height, width, MASKS, null)
    return BufferedImage(if (premultiplied) PREMULTIPLIED else STRAIGHT, raster, premultiplied, null)
}
