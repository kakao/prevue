package prevue.infrastructure.render

import java.awt.AlphaComposite
import java.awt.BasicStroke
import java.awt.Color
import java.awt.Font
import java.awt.Graphics2D
import java.awt.RenderingHints
import java.awt.font.TextAttribute
import java.awt.geom.AffineTransform
import java.awt.geom.Area
import java.awt.geom.Rectangle2D
import java.awt.image.BufferedImage
import prevue.application.domain.model.BarLook
import prevue.application.domain.model.ChromeLayout
import prevue.application.domain.model.DeviceModel
import prevue.application.domain.model.ChromeMark
import prevue.application.domain.model.DpBox
import prevue.application.domain.model.IconSet
import prevue.application.domain.model.InkBand
import prevue.application.domain.model.PreviewSpec
import prevue.application.domain.model.ScreenSize
import prevue.application.domain.model.SystemBars
import prevue.application.domain.model.systemBars
import prevue.application.domain.rule.DeviceChrome

internal object DeviceChromePainter {
    private const val TIME_TEXT = "9:41"
    private const val LIGHT_ABOVE = .6
    private const val SEMIBOLD = 600
    private const val WARM_PX = 8
    private val CAMERA = Color(0x050505)
    private val INK_DARK = Color.BLACK
    private val INK_LIGHT = Color.WHITE

    fun layoutOf(p: PreviewSpec): ChromeLayout? {
        val shown = p.systemBars as? SystemBars.Shown ?: return null
        if (shown.insets == null) return null
        return p.params[SystemBars.DEVICE_POSTURE]?.let(ScreenSize::postureOf)?.let(DeviceChrome::of)
    }

    fun warm() {
        val device = ScreenSize.Device(DeviceModel.entries.first { it.look == BarLook.IOS && it.status != null })
        paint(BufferedImage(WARM_PX, WARM_PX, BufferedImage.TYPE_INT_ARGB), DeviceChrome.of(device), clearCorners = true)
    }

    fun paint(image: BufferedImage, layout: ChromeLayout, clearCorners: Boolean) {
        val inks = layout.inkRegions.mapValues { (_, box) -> inkOver(image, layout, box) }
        val g = image.createGraphics()
        try {
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
            g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON)
            g.setRenderingHint(RenderingHints.KEY_STROKE_CONTROL, RenderingHints.VALUE_STROKE_PURE)
            g.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS, RenderingHints.VALUE_FRACTIONALMETRICS_ON)
            g.scale(image.width / layout.widthDp, image.height / layout.heightDp)
            layout.camera?.let { cam ->
                g.color = CAMERA
                g.fill(ChromeShapes.corners(cam.box.x, cam.box.y, cam.box.w, cam.box.h, cam.corners))
            }
            layout.marks.forEach { mark -> draw(g, mark, inks[mark.band] ?: INK_DARK) }
            if (clearCorners && image.colorModel.hasAlpha()) clearOutside(g, layout)
        } finally {
            g.dispose()
        }
    }

    private fun draw(g: Graphics2D, mark: ChromeMark, ink: Color) {
        g.color = ink
        when (mark) {
            is ChromeMark.Time -> text(g, mark)
            is ChromeMark.Handle -> g.fill(ChromeShapes.round(mark.box.x, mark.box.y, mark.box.w, mark.box.h, mark.rx))
            is ChromeMark.DuoIndicator -> pieces(g, ChromeShapes.duo, AffineTransform.getTranslateInstance(mark.x, mark.y), ink)
            is ChromeMark.Icons -> pieces(g, iconsOf(mark.set), AffineTransform(mark.scale, 0.0, 0.0, mark.scale, mark.x, mark.y), ink)
        }
    }

    private fun iconsOf(set: IconSet) = when (set) {
        IconSet.IOS_ALL -> ChromeShapes.signal + ChromeShapes.wifi + ChromeShapes.battery
        IconSet.IOS_LEFT -> ChromeShapes.signal + ChromeShapes.wifi
        IconSet.IOS_RIGHT -> ChromeShapes.battery
        IconSet.ANDROID -> ChromeShapes.android
    }

    private fun pieces(g: Graphics2D, pieces: List<Piece>, at: AffineTransform, ink: Color) {
        val saved = g.transform
        g.transform(at)
        pieces.forEach { p ->
            g.color = Color(ink.red, ink.green, ink.blue, (p.opacity * 255).toInt())
            if (p.fill) g.fill(p.shape)
            if (p.stroke > 0) {
                g.stroke = BasicStroke(p.stroke, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND)
                g.draw(p.shape)
            }
        }
        g.transform = saved
    }

    private fun text(g: Graphics2D, t: ChromeMark.Time) {
        val weight = if (t.weight >= SEMIBOLD) TextAttribute.WEIGHT_SEMIBOLD else TextAttribute.WEIGHT_MEDIUM
        val font = Font(mapOf(TextAttribute.FAMILY to Font.SANS_SERIF, TextAttribute.WEIGHT to weight, TextAttribute.SIZE to t.size.toFloat()))
        val glyphs = font.createGlyphVector(g.fontRenderContext, TIME_TEXT)
        val bounds = glyphs.logicalBounds
        val line = font.getLineMetrics(TIME_TEXT, g.fontRenderContext)
        val x = if (t.centered) t.x - bounds.width / 2 else t.x
        val y = if (t.middleBaseline) t.y + (line.ascent - line.descent) / 2 else t.y
        g.fill(glyphs.getOutline(x.toFloat(), y.toFloat()))
    }

    private fun clearOutside(g: Graphics2D, layout: ChromeLayout) {
        val outside = Area(Rectangle2D.Double(-1.0, -1.0, layout.widthDp + 2, layout.heightDp + 2))
        outside.subtract(Area(ChromeShapes.corners(0.0, 0.0, layout.widthDp, layout.heightDp, layout.radius)))
        g.composite = AlphaComposite.DstOut
        g.color = Color.BLACK
        g.fill(outside)
    }

    private fun inkOver(image: BufferedImage, layout: ChromeLayout, box: DpBox): Color {
        val sx = image.width / layout.widthDp
        val sy = image.height / layout.heightDp
        val x0 = (box.x * sx).toInt().coerceIn(0, image.width - 1)
        val y0 = (box.y * sy).toInt().coerceIn(0, image.height - 1)
        val x1 = ((box.x + box.w) * sx).toInt().coerceIn(x0 + 1, image.width)
        val y1 = ((box.y + box.h) * sy).toInt().coerceIn(y0 + 1, image.height)
        val row = IntArray(x1 - x0)
        var sum = 0.0
        var seen = 0
        for (y in y0 until y1) {
            image.getRGB(x0, y, row.size, 1, row, 0, row.size)
            for (argb in row) {
                if (argb ushr 24 == 0) continue
                sum += .2126 * (argb shr 16 and 0xff) + .7152 * (argb shr 8 and 0xff) + .0722 * (argb and 0xff)
                seen++
            }
        }
        return if (seen > 0 && sum / seen / 255 <= LIGHT_ABOVE) INK_LIGHT else INK_DARK
    }
}
