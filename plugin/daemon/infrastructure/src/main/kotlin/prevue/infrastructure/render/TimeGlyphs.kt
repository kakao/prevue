package prevue.infrastructure.render

import java.awt.BasicStroke
import java.awt.Font
import java.awt.Shape
import java.awt.font.FontRenderContext
import java.awt.geom.AffineTransform
import java.awt.geom.Area
import java.awt.geom.Path2D
import java.awt.geom.Point2D
import java.io.File

internal class TimeGlyphs private constructor(val outline: Shape, val advance: Double, val middle: Double) {
    companion object {
        private const val TEXT = "9:41"
        private const val EM = 1000.0
        private const val IOS_ADVANCE = 2016.0
        private const val IOS_DOT = 152f
        private const val MEDIUM_GAIN = 28f
        private const val MEDIUM_TRACK = 10.5
        private const val IOS_DOTS = "M798 -530 L798 -529 M798 -172 L798 -171"

        val ios: TimeGlyphs = of(
            Area(pathOf(
                """
            M330 -724 C364 -722 410 -716 445 -698 C480 -680 517 -644 540 -618 C563 -592 572 -565 582 -539
            C592 -513 598 -487 603 -461 C608 -435 609 -408 610 -382 C611 -356 610 -330 607 -304 C604 -278 601 -251 595 -225
            C589 -199 583 -173 571 -147 C559 -121 542 -92 521 -69 C500 -46 475 -24 442 -10 C409 4 360 15 321 15
            C282 15 235 1 206 -10 C177 -21 164 -36 149 -49 C134 -62 124 -75 114 -88 C104 -101 97 -115 92 -127
            C87 -139 86 -152 85 -160 C84 -168 85 -174 85 -177 L200 -177 C205 -169 217 -140 229 -127 C241 -114 253 -107 270 -102
            C287 -97 308 -94 330 -95 C352 -96 382 -99 401 -108 C420 -117 432 -134 442 -147 C452 -160 456 -173 462 -186
            C468 -199 472 -212 475 -225 C478 -238 479 -252 481 -265 C483 -278 486 -294 488 -304 C490 -314 490 -321 491 -324
            L480 -338 L466 -324 C460 -317 440 -294 428 -284 C416 -274 420 -273 397 -265 C374 -257 324 -238 291 -238
            C258 -238 222 -254 197 -265 C172 -276 153 -291 138 -304 C123 -317 116 -330 107 -343 C98 -356 92 -369 87 -382
            C82 -395 78 -409 75 -422 C72 -435 71 -451 70 -461 C69 -471 68 -470 69 -480 C70 -490 72 -507 74 -520
            C76 -533 80 -546 84 -559 C88 -572 93 -585 101 -598 C109 -611 118 -624 130 -637 C142 -650 158 -664 176 -676
            C194 -688 214 -700 240 -708 C266 -716 296 -726 330 -724 Z M330 -614 C354 -614 384 -607 403 -598
            C422 -589 433 -572 443 -559 C453 -546 459 -533 463 -520 C467 -507 468 -493 468 -480 C468 -467 468 -454 465 -441
            C462 -428 458 -415 449 -402 C440 -389 429 -374 409 -363 C389 -352 356 -335 330 -335 C304 -335 272 -352 252 -363
            C232 -374 222 -389 213 -402 C204 -415 199 -428 195 -441 C191 -454 191 -467 191 -480 C191 -493 193 -507 197 -520
            C201 -533 207 -546 217 -559 C227 -572 239 -589 258 -598 C277 -607 306 -614 330 -614 Z M1265 -706 L1447 -706 L1447 -235
            L1542 -235 L1542 -137 L1447 -137 L1447 0 L1329 0 L1329 -137 L983 -137 L983 -250 L1265 -706 Z M1095 -235 L1329 -235
            L1329 -592 L1312 -592 L1095 -235 Z M1820 -706 L1947 -706 L1947 0 L1821 0 L1821 -586 L1655 -470 L1638 -470 L1638 -574
            L1820 -706 Z
                """,
            )).apply { add(Area(BasicStroke(IOS_DOT, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND).createStrokedShape(pathOf(IOS_DOTS)))) },
            IOS_ADVANCE,
        )

        fun medium(regular: File): TimeGlyphs {
            val font = Font.createFont(Font.TRUETYPE_FONT, regular).deriveFont(EM.toFloat())
            val glyphs = font.createGlyphVector(FontRenderContext(null, true, true), TEXT)
            for (i in 0..glyphs.numGlyphs) {
                val at = glyphs.getGlyphPosition(i)
                glyphs.setGlyphPosition(i, Point2D.Double(at.x + i * MEDIUM_TRACK, at.y))
            }
            val outline = Area(glyphs.outline)
            outline.add(Area(BasicStroke(MEDIUM_GAIN, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND).createStrokedShape(outline)))
            return of(outline, glyphs.getGlyphPosition(glyphs.numGlyphs).x)
        }

        private fun of(outline: Area, advance: Double): TimeGlyphs {
            val box = outline.bounds2D
            return TimeGlyphs(AffineTransform.getScaleInstance(1 / EM, 1 / EM).createTransformedShape(outline), advance / EM, -box.centerY / EM)
        }

        private fun pathOf(path: String): Path2D.Double = Path2D.Double(Path2D.WIND_EVEN_ODD).apply {
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
    }
}
