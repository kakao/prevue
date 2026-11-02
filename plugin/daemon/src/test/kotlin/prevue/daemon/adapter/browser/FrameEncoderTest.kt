package prevue.daemon.adapter.browser

import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import javax.imageio.ImageIO
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Timeout

/** 인코딩을 틱과 뗀 뒤에도 지켜야 할 셋 — 보이는 폭으로 줄이기, 멈춘 그림은 원래 크기 PNG, 그림이 뒤로 가지 않기. 장부는 부르는 쪽 하나가 쥔다. */
@OptIn(ExperimentalCoroutinesApi::class)
@Timeout(20)
class FrameEncoderTest {
    private class Rig(scope: TestScope) {
        val done = ArrayList<FrameEncoder.Encoded>()
        val enc = FrameEncoder(scope.backgroundScope, StandardTestDispatcher(scope.testScheduler), {}) { done += it }
        val parts = ArrayList<FrameEncoder.Part>()
        val skipped get() = enc.dropped

        fun TestScope.settle() {
            while (true) {
                runCurrent()
                if (done.isEmpty()) return
                val batch = done.toList(); done.clear()
                for (e in batch) enc.finished(e)?.let { parts += it }
            }
        }
    }

    private fun img(w: Int, h: Int, rgb: Int) = BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB).apply {
        for (y in 0 until h) for (x in 0 until w) setRGB(x, y, rgb)
    }
    private fun size(p: FrameEncoder.Part) = ImageIO.read(ByteArrayInputStream(p.bytes)).let { it.width to it.height }

    @Test fun `폭을 들으면 그 폭으로 줄인 JPEG이고 모르면 원래 크기다`() = runTest {
        val r = Rig(this)
        with(r) {
            enc.submit(img(400, 800, 0xff336699.toInt()), png = false, width = null); settle()
            assertEquals(400 to 800, size(parts.last()))
            enc.submit(img(400, 800, 0xff336699.toInt()), png = false, width = 200); settle()
            assertEquals("image/jpeg", parts.last().type)
            assertEquals(200 to 400, size(parts.last()))
        }
    }

    @Test fun `멈춘 그림은 폭과 상관없이 원래 크기 PNG다`() = runTest {
        val r = Rig(this)
        with(r) {
            enc.submit(img(400, 800, 0xff336699.toInt()), png = true, width = 100); settle()
            assertEquals(1, parts.size)
            assertEquals("image/png", parts.single().type)
            assertEquals(400 to 800, size(parts.single()))
        }
    }

    @Test fun `밀려도 마지막에 맡긴 그림이 마지막에 나가고 버린 수를 센다`() = runTest {
        val r = Rig(this)
        with(r) {
            val colors = (1..40).map { 0xff000000.toInt() or (it * 6) }
            for (c in colors) enc.submit(img(30, 60, c), png = true, width = null)
            settle()
            assertEquals(colors.last(), ImageIO.read(ByteArrayInputStream(parts.last().bytes)).getRGB(0, 0))
            assertEquals(3, parts.size, "워커 둘이 처음 둘을, 줄의 마지막 하나를 그린다")
            assertEquals(colors.size - parts.size.toLong(), skipped)
            assertTrue(enc.idle)
        }
    }

    @Test fun `늦게 끝난 옛 그림은 새 그림 뒤에 나가지 않는다`() = runTest {
        val r = Rig(this)
        with(r) {
            enc.submit(img(30, 60, 0xff010101.toInt()), png = true, width = null)
            enc.submit(img(30, 60, 0xff020202.toInt()), png = true, width = null)
            runCurrent()
            val (old, new) = done.sortedBy { it.job.seq }; done.clear()
            assertEquals(0xff020202.toInt(), ImageIO.read(ByteArrayInputStream(enc.finished(new)!!.bytes)).getRGB(0, 0))
            assertEquals(null, enc.finished(old))
            assertEquals(1L, skipped)
        }
    }

    @Test fun `끄면 돌던 인코딩은 보내지 않는다`() = runTest {
        val r = Rig(this)
        with(r) {
            enc.submit(img(120, 240, 0xff112233.toInt()), png = true, width = null)
            enc.reset()
            settle()
            assertTrue(parts.isEmpty(), "끈 뒤에 ${parts.size}장이 나갔다")
        }
    }
}
