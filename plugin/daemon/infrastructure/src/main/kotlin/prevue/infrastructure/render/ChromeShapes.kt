package prevue.infrastructure.render

import java.awt.BasicStroke
import java.awt.geom.AffineTransform
import java.awt.geom.Area
import java.awt.geom.Path2D
import java.awt.geom.Rectangle2D
import java.awt.geom.RoundRectangle2D
import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

internal class TimeGlyphs(val outline: java.awt.Shape, val advance: Double, val height: Double)

internal class Piece(val shape: java.awt.Shape, val fill: Boolean, val stroke: Float = 0f, val opacity: Float = 1f)

internal object ChromeShapes {
    private const val ARC_STEPS = 24
    private const val WIFI_X = 35.33
    private const val WIFI_Y = 12.6
    private const val WIFI_HALF = 41.0
    private const val ROUND = .5
    private const val EM = 1000.0
    private const val MITER = 4f

    val signal: List<Piece> = listOf(4.67, 7.0, 9.67, 12.33).mapIndexed { i, h -> Piece(round(i * 5.33, 12.33 - h, 3.33, h, 1.0), fill = true) }

    val wifi: List<Piece> = listOf(
        band(WIFI_X, WIFI_Y, 10 + ROUND, 12.6 - ROUND),
        band(WIFI_X, WIFI_Y, 6 + ROUND, 8.27 - ROUND),
        band(WIFI_X, WIFI_Y - ROUND, 0.0, 3.93 - ROUND),
    ).map { Piece(it, fill = true, stroke = (ROUND * 2).toFloat()) }

    val battery: List<Piece> = listOf(
        Piece(round(51.5, .17, 24.0, 12.0, 3.7), fill = false, stroke = 1f, opacity = .4f),
        Piece(round(53.0, 1.67, 21.0, 9.0, 2.3), fill = true),
        Piece(corners(77.0, 4.17, 1.33, 4.0, listOf(0.0, .93, .93, 0.0)), fill = true, opacity = .5f),
    )

    val android: List<Piece> = listOf(
        Piece(wedge(8.85, 12.5, 12.0, 45.0), fill = true, stroke = 1f),
        Piece(Path2D.Double().apply { moveTo(22.0, 13.0); lineTo(35.0, 13.0); lineTo(35.0, 0.0); closePath() }, fill = true, stroke = 1f),
        Piece(round(41.5, -.2, 3.0, 1.6, .5), fill = true),
        Piece(round(40.0, 1.4, 6.0, 11.6, 1.2), fill = true),
    )

    val duo: List<Piece> = buildList {
        val dial = Path2D.Double().apply {
            moveTo(-16.0, 9.0)
            arcTo(-16.0 to 9.0, 18.0, large = true, 16.0 to 9.0)
        }
        val waves = Path2D.Double().apply {
            moveTo(-8.0, -1.0)
            quadTo(0.0, -9.0, 8.0, -1.0)
            moveTo(-5.0, 2.0)
            quadTo(0.0, -3.0, 5.0, 2.0)
        }
        add(Piece(dial, fill = false, stroke = 2.5f))
        add(Piece(waves, fill = false, stroke = 2.5f))
        add(Piece(dot(0.0, 5.0, 1.7), fill = true))
        val beads = listOf(-10.0 to 16.0, -5.0 to 19.0, 0.0 to 20.0, 5.0 to 19.0, 10.0 to 16.0)
        beads.forEach { (x, y) -> add(Piece(dot(x, y, 1.6), fill = true, opacity = .35f)) }
    }

    val iosTime = timeGlyphs(
        advance = 1920, height = 705,
        strokes = listOf(
            112f to "M290 -649 C385 -649 454 -574 454 -485 C454 -393 385 -320 290 -320 C195 -320 126 -393 126 -485 C126 -574 195 -649 290 -649 Z",
            112f to "M290 -649 C385 -649 454 -574 454 -485 C454 -195 378 -56 268 -56 C195 -56 145 -90 125 -146",
            118f to "M1320 0 L1320 -705",
            100f to "M1330 -740 L955 -215 L1465 -215",
            118f to "M1810 0 L1810 -705",
            100f to "M1815 -712 L1598 -548",
        ),
        dots = 145f to "M715 -430 L715 -429 M715 -80 L715 -79",
    )

    val androidTime = timeGlyphs(
        advance = 1860, height = 711,
        strokes = listOf(
            96f to "M282 -663 C373 -663 444 -592 444 -501 C444 -410 373 -339 282 -339 C191 -339 120 -410 120 -501 C120 -592 191 -663 282 -663 Z",
            96f to "M282 -663 C373 -663 444 -592 444 -501 C444 -170 360 -48 235 -48 L170 -48",
            100f to "M1280 0 L1280 -711",
            88f to "M1290 -745 L917 -235 L1417 -235",
            100f to "M1760 0 L1760 -711",
            88f to "M1767 -715 L1545 -605",
        ),
        dots = 125f to "M690 -455 L690 -454 M690 -63 L690 -62",
    )

    fun round(x: Double, y: Double, w: Double, h: Double, r: Double) = RoundRectangle2D.Double(x, y, w, h, r * 2, r * 2)

    fun corners(x: Double, y: Double, w: Double, h: Double, r: List<Double>): Path2D.Double = Path2D.Double().apply {
        val k = .5523
        moveTo(x + r[0], y)
        lineTo(x + w - r[1], y)
        curveTo(x + w - r[1] * (1 - k), y, x + w, y + r[1] * (1 - k), x + w, y + r[1])
        lineTo(x + w, y + h - r[2])
        curveTo(x + w, y + h - r[2] * (1 - k), x + w - r[2] * (1 - k), y + h, x + w - r[2], y + h)
        lineTo(x + r[3], y + h)
        curveTo(x + r[3] * (1 - k), y + h, x, y + h - r[3] * (1 - k), x, y + h - r[3])
        lineTo(x, y + r[0])
        curveTo(x, y + r[0] * (1 - k), x + r[0] * (1 - k), y, x + r[0], y)
        closePath()
    }

    private fun timeGlyphs(advance: Int, height: Int, strokes: List<Pair<Float, String>>, dots: Pair<Float, String>): TimeGlyphs {
        val outline = Area()
        strokes.forEach { (width, path) ->
            outline.add(Area(BasicStroke(width, BasicStroke.CAP_BUTT, BasicStroke.JOIN_MITER, MITER).createStrokedShape(pathOf(path))))
        }
        outline.add(Area(BasicStroke(dots.first, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND).createStrokedShape(pathOf(dots.second))))
        outline.intersect(Area(Rectangle2D.Double(-EM, -height.toDouble(), EM * 4, EM * 2)))
        return TimeGlyphs(AffineTransform.getScaleInstance(1 / EM, 1 / EM).createTransformedShape(outline), advance / EM, height / EM)
    }

    private fun pathOf(path: String): Path2D.Double = Path2D.Double(Path2D.WIND_NON_ZERO).apply {
        Regex("([MLCZ])([^MLCZ]*)").findAll(path).forEach { m ->
            val n = m.groupValues[2].trim().split(Regex("\\s+")).filter(String::isNotEmpty).map(String::toDouble)
            when (m.groupValues[1]) {
                "M" -> moveTo(n[0], n[1])
                "L" -> lineTo(n[0], n[1])
                "C" -> curveTo(n[0], n[1], n[2], n[3], n[4], n[5])
                "Z" -> closePath()
            }
        }
    }

    private fun dot(cx: Double, cy: Double, r: Double) = java.awt.geom.Ellipse2D.Double(cx - r, cy - r, r * 2, r * 2)

    private fun at(cx: Double, cy: Double, r: Double, deg: Double): Pair<Double, Double> {
        val a = deg * PI / 180
        return cx + r * sin(a) to cy - r * cos(a)
    }

    private fun band(cx: Double, cy: Double, inner: Double, outer: Double): Path2D.Double = Path2D.Double().apply {
        val (ox0, oy0) = at(cx, cy, outer, -WIFI_HALF)
        val (ox1, oy1) = at(cx, cy, outer, WIFI_HALF)
        if (inner > 0) {
            moveTo(ox0, oy0)
            arcTo(ox0 to oy0, outer, large = false, ox1 to oy1)
            val (ix1, iy1) = at(cx, cy, inner, WIFI_HALF)
            val (ix0, iy0) = at(cx, cy, inner, -WIFI_HALF)
            lineTo(ix1, iy1)
            arcTo(ix1 to iy1, inner, large = false, ix0 to iy0, clockwise = false)
        } else {
            moveTo(cx, cy)
            lineTo(ox0, oy0)
            arcTo(ox0 to oy0, outer, large = false, ox1 to oy1)
        }
        closePath()
    }

    private fun wedge(cx: Double, cy: Double, r: Double, half: Double): Path2D.Double = Path2D.Double().apply {
        val (x0, y0) = at(cx, cy, r, -half)
        val (x1, y1) = at(cx, cy, r, half)
        moveTo(cx, cy)
        lineTo(x0, y0)
        arcTo(x0 to y0, r, large = false, x1 to y1)
        closePath()
    }

    private fun Path2D.Double.arcTo(from: Pair<Double, Double>, r: Double, large: Boolean, to: Pair<Double, Double>, clockwise: Boolean = true) {
        val (x0, y0) = from
        val (x1, y1) = to
        val mx = (x0 + x1) / 2
        val my = (y0 + y1) / 2
        val dx = x1 - x0
        val dy = y1 - y0
        val chord = sqrt(dx * dx + dy * dy)
        val away = sqrt((r * r - chord * chord / 4).coerceAtLeast(0.0))
        val side = if (large == clockwise) -1 else 1
        val cx = mx - side * away * dy / chord
        val cy = my + side * away * dx / chord
        val a0 = atan2(y0 - cy, x0 - cx)
        var a1 = atan2(y1 - cy, x1 - cx)
        if (clockwise && a1 < a0) a1 += 2 * PI
        if (!clockwise && a1 > a0) a1 -= 2 * PI
        for (i in 1..ARC_STEPS) {
            val a = a0 + (a1 - a0) * i / ARC_STEPS
            lineTo(cx + r * cos(a), cy + r * sin(a))
        }
    }
}
