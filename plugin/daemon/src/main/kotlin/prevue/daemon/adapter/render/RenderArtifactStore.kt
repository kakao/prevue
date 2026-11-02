package prevue.daemon.adapter.render

import java.awt.image.BufferedImage
import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption.ATOMIC_MOVE
import java.nio.file.StandardCopyOption.REPLACE_EXISTING
import javax.imageio.ImageIO
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineName
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.SendChannel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import prevue.json.Json

/**
 * NFR-10. [dir]이 [maxBytes]를 넘으면 오래 쓴 프리뷰부터 지운다. 한 프리뷰의 png·json은 한 짝이다 — 짝으로 지워야 반쪽만 남지 않는다.
 * [keep]은 넘었을 때만 묻는다 — 쓰기 스레드가 부르고, 대개는 넘지 않는다.
 */
internal fun pruneOut(dir: File, maxBytes: Long, keep: () -> Set<String>) {
    var total = dir.listFiles().orEmpty().sumOf { it.length() }
    if (total <= maxBytes) return
    val kept = keep()
    dir.listFiles().orEmpty().filter { it.isFile }
        .groupBy { it.name.removeSuffix(".png").removeSuffix(".viewinfo.json").removeSuffix("-0") }
        .filterKeys { it !in kept }
        .entries.sortedBy { (_, fs) -> fs.maxOf { it.lastModified() } }   // 오래 쓴 것부터
        .forEach { (_, fs) ->
            if (total <= maxBytes) return
            fs.forEach { total -= it.length(); it.delete() }
        }
}

/** NFR-10. 화면급 트리 JSON이 한 장에 8.6MB라 상한이 없으면 세션 하나가 수십 MB를 남긴다. */
internal const val DEFAULT_OUT_MAX_MB = 64L
internal fun outMaxMb(env: String?): Long = env?.toLongOrNull() ?: DEFAULT_OUT_MAX_MB

/** 렌더 태스크에서 분리된 이미지·트리를 기록하고 프리뷰별 쓰기 순서와 산출물 상한을 지킨다. */
class RenderArtifactStore(val directory: File) : AutoCloseable {
    private val limit = MutableStateFlow(outMaxMb(System.getenv("PREVUE_OUT_MAX_MB")) * 1024 * 1024)
    var maxBytes: Long
        get() = limit.value
        set(value) { limit.value = value }
    private val keepIds = MutableStateFlow<() -> Set<String>> { emptySet() }
    val bytes: Long get() = directory.listFiles().orEmpty().sumOf { it.length() }

    // 같은 프리뷰는 같은 줄에 보낸다 — 이전 그림의 느린 인코딩이 최신 파일을 덮지 않게 한다.
    private val lanes = List(3) { Channel<Write>(Channel.UNLIMITED) }
    private val drains = CoroutineScope(SupervisorJob() + Dispatchers.IO).let { scope ->
        lanes.mapIndexed { i, lane -> scope.launch(CoroutineName("prevue-writer-$i")) { for (w in lane) w.run() } }
    }

    private fun laneOf(previewId: String) = lanes[Math.floorMod(previewId.hashCode(), lanes.size)]

    fun imageFile(previewId: String) = File(directory, "$previewId-0.png")
    fun treeFile(previewId: String) = File(directory, "$previewId-0.viewinfo.json")
    fun protect(keep: () -> Set<String>) { keepIds.value = keep }

    fun write(previewId: String, image: BufferedImage?, tree: Map<String, Any?>, failed: Boolean): Deferred<Map<String, Long>> {
        val queued = System.nanoTime()
        val png = imageFile(previewId)
        return laneOf(previewId).enqueue {
            buildMap {
                put("writeQueueMs", ms(queued))
                var t = System.nanoTime()
                if (image != null && !failed) writePng(image, png) else if (failed) png.delete()
                put("pngMs", ms(t)); t = System.nanoTime()
                writeAtomic(treeFile(previewId), Json.str(tree).toByteArray())
                put("jsonMs", ms(t)); t = System.nanoTime()
                pruneOut(directory, maxBytes, keepIds.value)
                put("pruneMs", ms(t))
            }
        }
    }

    fun copyImage(fromId: String, toId: String): Deferred<Map<String, Long>> {
        val queued = System.nanoTime()
        return laneOf(fromId).enqueue {
            buildMap {
                put("writeQueueMs", ms(queued))
                val t = System.nanoTime()
                val tmp = File(directory, ".${imageFile(toId).name}.copy.tmp")
                Files.copy(imageFile(fromId).toPath(), tmp.toPath(), REPLACE_EXISTING)
                Files.move(tmp.toPath(), imageFile(toId).toPath(), ATOMIC_MOVE, REPLACE_EXISTING)
                put("copyMs", ms(t))
                pruneOut(directory, maxBytes, keepIds.value)
            }
        }
    }

    suspend fun awaitWrites() {
        lanes.map { it.enqueue { emptyMap() } }.awaitAll()
    }

    private class Write(val done: CompletableDeferred<Map<String, Long>>, val work: () -> Map<String, Long>) {
        fun run() {
            runCatching(work).fold(done::complete, done::completeExceptionally)
        }
    }

    private fun SendChannel<Write>.enqueue(work: () -> Map<String, Long>): Deferred<Map<String, Long>> {
        val w = Write(CompletableDeferred(), work)
        trySend(w).getOrThrow()
        return w.done
    }

    // 옛 주소를 가진 읽기에도 반쯤 기록한 PNG·JSON을 보여 주지 않는다.
    private fun writePng(image: BufferedImage, file: File) {
        val tmp = File(file.parentFile, ".${file.name}.tmp")
        ImageIO.write(image, "PNG", tmp)
        Files.move(tmp.toPath(), file.toPath(), ATOMIC_MOVE, REPLACE_EXISTING)
    }

    private fun writeAtomic(file: File, bytes: ByteArray) {
        val tmp = File(file.parentFile, ".${file.name}.tmp")
        tmp.writeBytes(bytes)
        Files.move(tmp.toPath(), file.toPath(), ATOMIC_MOVE, REPLACE_EXISTING)
    }

    override fun close() {
        lanes.forEach { it.close() }
        // 데몬 전체의 30초 제한은 PrevueDaemon이 지킨다. 여기서는 쓰기 완료를 정확히 기다린다.
        runBlocking { drains.joinAll() }
    }

    private fun ms(since: Long) = (System.nanoTime() - since) / 1_000_000
}
