package prevue.daemon

import java.awt.geom.Area
import java.awt.geom.Rectangle2D
import java.io.File
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.condition.EnabledIf
import prevue.infrastructure.render.TimeGlyphs

@EnabledIf("prevue.daemon.TimeGlyphsIntegrationTest#available")
class TimeGlyphsIntegrationTest {
    private val medium = TimeGlyphs.medium(File(PearlFixture.layoutlib()!!, "data/fonts/RobotoStatic-Regular.ttf"))

    @Test fun `layoutlib 의 Roboto 400 으로 만든 시각은 Roboto Medium 굵기 · 폭이다`() {
        val stem = Area(medium.outline).apply { intersect(Area(Rectangle2D.Double(1.5, -.2, 1.0, .001))) }.bounds2D.width
        assertEquals(.1187, stem, .004, "1 의 줄기 — Roboto Medium(v2.138)은 .1187em")
        assertEquals(1.970, medium.advance, .01, "9:41 폭 — Roboto Medium(v2.138)은 1.970em")
    }

    companion object {
        @JvmStatic fun available() = PearlFixture.layoutlib() != null
    }
}
