package prevue.daemon.adapter.browser

import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.OutputStream
import java.util.concurrent.CountDownLatch
import javax.imageio.ImageIO
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Timeout
import prevue.daemon.domain.model.LiveFrame
import prevue.daemon.fake.awaitUntil

/**
 * 스트림은 루프가 낸 화면을 인코딩만 한다 — 성질 넷: 마지막 프레임 · 정착 PNG는 나간다, 보는 사람이 없으면 인코딩하지 않는다,
 * 느린 구독자가 다른 구독자를 막지 않는다, 쉼 없이 바뀌어도 MJPEG가 깨지지 않는다.
 */
@OptIn(ExperimentalCoroutinesApi::class)
@Timeout(20)
class FrameStreamerTest {
    private val screen = MutableStateFlow<LiveFrame?>(null)
    private val watching = MutableStateFlow(false)
    private var seq = 0L

    private fun image(rgb: Int) = BufferedImage(32, 32, BufferedImage.TYPE_INT_RGB).apply { for (x in 0 until 32) for (y in 0 until 32) setRGB(x, y, rgb) }

    private fun emit(rgb: Int, rest: Boolean = false) { screen.value = LiveFrame(++seq, image(rgb), rest) }

    private fun TestScope.streamer(write: CoroutineContext? = null): FrameStreamer {
        val d = StandardTestDispatcher(testScheduler)
        return FrameStreamer(screen, watching, backgroundScope, {}, state = d, encode = d, write = write ?: d)
    }

    private class Socket : OutputStream() {
        private val buf = ByteArrayOutputStream()
        @Volatile var closed = false
        fun bytes(): ByteArray = synchronized(buf) { buf.toByteArray() }
        override fun write(b: Int) { synchronized(buf) { buf.write(b) } }
        override fun write(b: ByteArray, off: Int, len: Int) { synchronized(buf) { buf.write(b, off, len) } }
        override fun close() { closed = true }
    }

    @Test fun `보는 사람이 없으면 인코딩하지 않는다`() = runTest {
        val stream = streamer()
        stream.subscribe(Socket())
        repeat(20) { emit(it); runCurrent() }
        assertEquals(0L, stream.stats.value.encoded, "보지 않는데 인코딩했다")
        stream.stop(); runCurrent()
        val alone = streamer()
        watching.value = true
        repeat(20) { emit(it); runCurrent() }
        assertEquals(0L, alone.stats.value.encoded, "구독자 없이 인코딩했다")
    }

    @Test fun `빠르게 쏟아져도 마지막 프레임과 정착 PNG는 나간다`() = runTest {
        val stream = streamer()
        watching.value = true
        val socket = Socket()
        stream.subscribe(socket)
        runCurrent()
        repeat(200) { emit(0x101010 + it) }
        runCurrent()
        assertEquals("JPEG", lastType(socket.bytes()))
        assertTrue(near(0x101010 + 199, lastPicture(socket.bytes())!!.getRGB(16, 16)), "마지막 JPEG가 마지막 프레임이 아니다")
        repeat(50) { emit(0x202020 + it); if (it % 7 == 0) runCurrent() }
        emit(0x00ff00, rest = true)
        runCurrent()
        assertEquals("PNG", lastType(socket.bytes()))
        assertEquals(0x00ff00, lastPicture(socket.bytes())?.getRGB(0, 0)?.and(0xffffff))
        assertNull(mjpegError(socket.bytes()))
        assertTrue(stream.stats.value.conflated > 0, "StateFlow가 덮은 프레임을 세지 않았다")
    }

    @Test fun `새 구독자는 지금 화면부터 받는다`() = runTest {
        val stream = streamer()
        watching.value = true
        emit(0x0000ff, rest = true)
        runCurrent()
        val socket = Socket()
        stream.subscribe(socket)
        runCurrent()
        assertEquals(0x0000ff, lastPicture(socket.bytes())?.getRGB(0, 0)?.and(0xffffff))
    }

    @Test fun `끄면 구독을 끊고 세션이 닫혀도 구독은 남는다`() = runTest {
        val stream = streamer()
        watching.value = true
        val socket = Socket()
        stream.subscribe(socket)
        runCurrent()
        screen.value = null
        runCurrent()
        assertTrue(stream.hasSubscribers)
        emit(0x00ff00, rest = true)
        runCurrent()
        assertEquals(0x00ff00, lastPicture(socket.bytes())?.getRGB(0, 0)?.and(0xffffff), "다시 연 세션의 그림이 안 갔다")
        watching.value = false
        runCurrent()
        assertFalse(stream.hasSubscribers)
        assertTrue(socket.closed)
    }

    @Test fun `같은 뷰어가 스트림을 새로 열면 그 뷰어의 옛 스트림을 닫는다`() = runTest {
        val stream = streamer()
        watching.value = true
        val old = Socket(); val again = Socket(); val other = Socket(); val plain = Socket()
        stream.subscribe(old, "a")
        stream.subscribe(other, "b")
        stream.subscribe(plain)
        runCurrent()
        stream.subscribe(again, "a")
        runCurrent()
        assertTrue(old.closed, "같은 뷰어의 옛 스트림이 남았다")
        assertFalse(again.closed || other.closed || plain.closed, "다른 뷰어 · 이름표 없는 구독을 끊었다")
        emit(0x00ff00, rest = true)
        runCurrent()
        for (s in listOf(again, other, plain)) assertEquals(0x00ff00, lastPicture(s.bytes())?.getRGB(0, 0)?.and(0xffffff))
    }

    @Test fun `작은 뷰어가 나중에 폭을 알려도 붙은 뷰어 중 가장 큰 폭으로 줄이고, 떠난 뷰어의 폭은 빠진다`() = runTest {
        val stream = streamer()
        watching.value = true
        var gone = false
        val big = object : OutputStream() {
            override fun write(b: Int) { if (gone) throw java.io.IOException("closed") }
            override fun write(b: ByteArray, off: Int, len: Int) { if (gone) throw java.io.IOException("closed") }
        }
        val small = Socket()
        stream.subscribe(big, "big")
        stream.subscribe(small, "small")
        stream.viewport(300, "big")
        stream.viewport(100, "small")
        runCurrent()
        screen.value = LiveFrame(++seq, BufferedImage(400, 400, BufferedImage.TYPE_INT_RGB), false)
        runCurrent()
        assertEquals(300, lastPicture(small.bytes())?.width, "마지막에 알린 작은 폭으로 모두를 줄였다")
        gone = true
        screen.value = LiveFrame(++seq, BufferedImage(400, 400, BufferedImage.TYPE_INT_RGB), false)
        runCurrent()
        screen.value = LiveFrame(++seq, BufferedImage(400, 400, BufferedImage.TYPE_INT_RGB), false)
        runCurrent()
        assertEquals(100, lastPicture(small.bytes())?.width, "끊긴 뷰어의 폭이 남았다")
    }

    @Test fun `구독이 없는 뷰어 · 이름표 없는 폭은 줄이는 폭에 들지 않고, 같은 뷰어가 스트림을 새로 열어도 폭은 이어진다`() = runTest {
        val stream = streamer()
        watching.value = true
        val first = Socket()
        stream.subscribe(first, "a")
        stream.viewport(200, "a")
        stream.viewport(380, "gone")
        stream.viewport(390)
        runCurrent()
        stream.subscribe(Socket(), "a")
        val seen = Socket()
        stream.subscribe(seen)
        runCurrent()
        screen.value = LiveFrame(++seq, BufferedImage(400, 400, BufferedImage.TYPE_INT_RGB), false)
        runCurrent()
        assertEquals(200, lastPicture(seen.bytes())?.width)
    }

    @Test fun `멈춘 뒤에 온 구독은 바로 닫는다`() = runTest {
        val stream = streamer()
        stream.stop()
        runCurrent()
        val socket = Socket()
        stream.subscribe(socket)
        assertTrue(socket.closed)
    }

    @Test fun `느린 구독자가 다른 구독자를 막지 않는다`() = runTest {
        val stream = streamer(write = Dispatchers.IO)
        watching.value = true
        val gate = CountDownLatch(1)
        val stuck = object : OutputStream() {
            override fun write(b: Int) { gate.await() }
            override fun write(b: ByteArray, off: Int, len: Int) { gate.await() }
        }
        val fast = Socket()
        stream.subscribe(stuck)
        stream.subscribe(fast)
        runCurrent()
        try {
            repeat(30) { emit(0x101010 + it) }
            emit(0x00ff00, rest = true)
            runCurrent()
            awaitUntil("막힌 구독자가 있어도 다른 구독자의 마지막 그림", pollMs = 10) { lastPicture(fast.bytes())?.getRGB(0, 0)?.and(0xffffff) == 0x00ff00 }
        } finally { gate.countDown() }
    }

    // 구독자를 목록에 먼저 넣으면 첫 경계·마지막 그림을 쓰는 사이에 다른 파트가 끼어든다 — 끝나지 않는 애니메이션 화면에서 첫 화면이 안 떴다.
    @Test fun `그림이 쉼 없이 바뀌어도 느린 구독자의 MJPEG가 깨지지 않는다`() {
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
        val stream = FrameStreamer(screen, watching, scope, {})
        watching.value = true
        val warm = ByteArrayOutputStream().also(stream::subscribe)
        val busy = Thread {
            var n = 0
            // 실제 시간 — 끝나지 않는 애니메이션의 프레임 간격이다
            while (!Thread.currentThread().isInterrupted) { emit(n++); try { Thread.sleep(5) } catch (_: InterruptedException) { break } }
        }.apply { isDaemon = true; start() }
        try {
            awaitUntil("애니메이션이 스트림에 흐르기") { parts(warm.toByteArray()).size >= 3 }
            repeat(10) {
                val slow = SlowSocket()
                stream.subscribe(slow)
                awaitUntil("느린 구독자가 그림 몇 장을 받기", pollMs = 10) { parts(slow.bytes()).size >= 4 }
                val broken = mjpegError(slow.bytes())
                assertTrue(broken == null, "구독 ${it + 1}번째: $broken")
            }
        } finally { busy.interrupt(); busy.join(); stream.stop(); runBlocking { stream.awaitStopped() }; scope.cancel() }
    }

    /** 쓰기마다 잠깐 멈추는 느린 연결. 받은 바이트를 그대로 모은다. */
    private class SlowSocket : OutputStream() {
        private val buf = ByteArrayOutputStream()
        fun bytes(): ByteArray = synchronized(buf) { buf.toByteArray() }
        override fun write(b: Int) { synchronized(buf) { buf.write(b) } }
        override fun write(b: ByteArray, off: Int, len: Int) { synchronized(buf) { buf.write(b, off, len) }; Thread.sleep(15) }   // 실제 시간 — 느린 연결 흉내
    }

    private fun parts(bytes: ByteArray): List<String> {
        val s = String(bytes, Charsets.ISO_8859_1)
        val b = "--${FrameStreamer.BOUNDARY}\r\n"
        return s.removePrefix(b).split("\r\n$b").map { it.removePrefix(FrameStreamer.PART_HEAD) }
    }

    private fun near(want: Int, got: Int) = (0..16 step 8).all { sh -> kotlin.math.abs((want shr sh and 0xff) - (got shr sh and 0xff)) <= 4 }

    private fun lastBody(bytes: ByteArray): String? = parts(bytes).dropLast(1).lastOrNull()

    private fun lastType(bytes: ByteArray): String? = lastBody(bytes)?.let { if (it.startsWith("\u0089PNG")) "PNG" else "JPEG" }

    private fun lastPicture(bytes: ByteArray): BufferedImage? =
        lastBody(bytes)?.let { ImageIO.read(ByteArrayInputStream(it.toByteArray(Charsets.ISO_8859_1))) }

    /**
     * 경계 → (머리 · 온전한 JPEG/PNG 몸 · 경계)의 반복인가. 머리는 앞 파트 끝에 미리 붙어 오고 길이가 없다 — 몸은 다음 경계까지다.
     * 끝의 덜 온 파트는 괜찮다.
     */
    private fun mjpegError(bytes: ByteArray): String? {
        val s = String(bytes, Charsets.ISO_8859_1)
        val b = "--${FrameStreamer.BOUNDARY}\r\n"
        if (!s.startsWith(b)) return "첫 경계가 아니다"
        val parts = s.substring(b.length).split("\r\n$b")
        for ((n, part) in parts.withIndex()) {
            if (!part.startsWith(FrameStreamer.PART_HEAD)) return if (n == parts.lastIndex && FrameStreamer.PART_HEAD.startsWith(part)) null else "파트 $n 의 머리가 깨졌다"
            val body = part.substring(FrameStreamer.PART_HEAD.length)
            if (n == parts.lastIndex) return null
            val jpeg = body.startsWith("ÿØ") && body.endsWith("ÿÙ")
            val png = body.startsWith("\u0089PNG") && body.endsWith("IEND®B`\u0082")
            if (!jpeg && !png) return "파트 $n 의 몸이 온전한 그림이 아니다(${body.length}B)"
        }
        return null
    }
}
