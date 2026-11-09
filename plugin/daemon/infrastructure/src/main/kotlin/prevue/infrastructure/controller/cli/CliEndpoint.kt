package prevue.infrastructure.controller.cli

import com.sun.net.httpserver.HttpExchange
import dev.zacsweers.metro.AppScope
import dev.zacsweers.metro.ContributesIntoSet
import dev.zacsweers.metro.Inject
import java.io.File
import prevue.application.domain.model.BoardView
import prevue.application.domain.model.CardResult
import prevue.application.domain.model.FocusResult
import prevue.application.domain.model.ShowResult
import prevue.application.domain.model.TouchResult
import prevue.application.domain.model.TypeResult
import prevue.application.domain.model.ScrollResult
import prevue.application.service.Boards
import prevue.application.service.HotReload
import prevue.application.service.Live
import prevue.application.service.Status
import prevue.application.service.Tabs
import prevue.infrastructure.json.map
import prevue.infrastructure.controller.http.mapper.composablePreviewsJson
import prevue.infrastructure.controller.http.mapper.status
import prevue.infrastructure.controller.http.mapper.toJson
import prevue.infrastructure.controller.http.mapper.toPointed
import prevue.infrastructure.controller.http.mapper.toScreenSize
import prevue.infrastructure.json.string
import prevue.infrastructure.json.strings
import prevue.infrastructure.controller.http.HttpEndpoint
import prevue.infrastructure.controller.http.HttpSeat
import prevue.infrastructure.controller.http.LiveStats
import prevue.infrastructure.controller.http.body
import prevue.infrastructure.controller.http.json

@ContributesIntoSet(AppScope::class)
public class CliEndpoint @Inject internal constructor(
    private val status: Status,
    private val tabs: Tabs,
    private val boards: Boards,
    private val live: Live,
    private val hotReload: HotReload,
    seat: HttpSeat,
    private val observed: LiveStats,
) : HttpEndpoint {
    private val port = seat.port
    private val root = seat.root

    override suspend fun route(ex: HttpExchange, path: String, method: String): Boolean =
        (method == "POST" && routePost(ex, path)) || routeAnyMethod(ex, path)

    private suspend fun routePost(ex: HttpExchange, path: String): Boolean {
        when {
            path == "/show" -> show(ex)
            path == "/close" -> close(ex)
            path == "/card" -> card(ex)
            path == "/focus" -> focus(ex)
            path == "/selection" -> select(ex)
            path == "/previews" -> previews(ex)
            path == "/render" -> renderNow(ex)
            path == "/reload" -> reload(ex)
            path == "/wait" -> await(ex)
            path == "/touch" -> touch(ex)
            path == "/scroll" -> scroll(ex)
            path == "/type" -> type(ex)
            else -> return false
        }
        return true
    }

    private suspend fun routeAnyMethod(ex: HttpExchange, path: String): Boolean {
        when {
            path == "/status" -> readStatus(ex)
            path == "/identity" -> ex.json(200, mapOf("root" to root))
            path == "/board" -> board(ex)
            path == "/selection" -> selection(ex)
            else -> return false
        }
        return true
    }

    private suspend fun readStatus(ex: HttpExchange) {
        val where = mapOf("port" to port, "viewer" to "http://127.0.0.1:$port/", "root" to root)
        tabs.catchUp("status")
        ex.json(200, status.read().toJson() + observed.observed() + where)
    }

    private suspend fun show(ex: HttpExchange) {
        val b = ex.body()
        val target = b.string("target") ?: b.string("file") ?: b.string("fqn") ?: error("target(파일 경로 또는 FQN)이 필요하다")
        val (r, board) = openWithBoard(target, (b["index"] as? Number)?.toInt(), b.map("params"), b.string("by") ?: "http")
        val previews = board?.previews?.map { it.toJson() } ?: emptyList()
        ex.json(okOr422(r.ok), r.toJson() + mapOf("board" to board?.toJson(), "previews" to previews))
    }

    private suspend fun openWithBoard(target: String, index: Int?, params: Map<String, String>, by: String): Pair<ShowResult, BoardView?> =
        tabs.openPreview(target, index, params, by) to status.board()?.takeUnless { status.interactive() }

    private suspend fun close(ex: HttpExchange) {
        val b = ex.body()
        val target = b.string("target") ?: b.string("file") ?: error("target(파일 경로 또는 FQN)이 필요하다")
        ex.json(200, tabs.closeTab(target, b.string("by") ?: "http").toJson())
    }

    private suspend fun card(ex: HttpExchange) {
        val b = ex.body()
        val r = boards.drawCard((b["index"] as Number).toInt(), b["force"] == true, b.string("by") ?: "viewer")
        ex.json(cardCode(r), r.toJson())
    }

    private fun cardCode(r: CardResult) = when (r) {
        is CardResult.Skipped -> 409
        is CardResult.Drawn -> okOr422(r.shot.ok || r.cached)
        is CardResult.WriteFailed -> okOr422(r.cached)
        is CardResult.Pending -> 200
    }

    private suspend fun focus(ex: HttpExchange) {
        val b = ex.body()
        val r = boards.focus((b["index"] as Number).toInt(), b["interactive"] == true, b.string("by") ?: "viewer", b.toScreenSize())
        ex.json(okOr422(r !is FocusResult.On || r.result.ok), r.toJson())
    }

    private fun board(ex: HttpExchange) =
        ex.json(200, status.board()?.toJson() ?: mapOf("ok" to false, "error" to "보드가 없다 — 파일 경로로 show 한다"))

    private suspend fun select(ex: HttpExchange) {
        val b = ex.body()
        val file = b.string("file")?.takeIf { it.isNotBlank() } ?: error("file(풀패스)이 필요하다")
        val line = (b["line"] as? Number)?.toInt()?.takeIf { it > 0 } ?: error("line이 필요하다")
        val sel = live.select(file, line, b.toPointed(), b.string("by") ?: "viewer")
        ex.json(200, sel.toJson())
    }

    private fun selection(ex: HttpExchange) {
        val sel = status.selection()
        ex.json(if (sel == null) 404 else 200, sel?.toJson() ?: mapOf("ok" to false, "error" to "선택이 없다 — 뷰어에서 화면의 요소를 클릭한다"))
    }

    private fun previews(ex: HttpExchange) {
        val b = ex.body()
        b.string("of")?.takeIf { it.isNotBlank() }?.let { of ->
            ex.json(200, composablePreviewsJson(of, status.findPreviews(of), File(status.module().repo).canonicalPath))
            return
        }
        val f = File(b.string("file") ?: error("file 또는 of가 필요하다"))
        ex.json(200, mapOf("file" to f.absolutePath, "previews" to status.listPreviews(f).map { it.toJson() }))
    }

    private suspend fun renderNow(ex: HttpExchange) {
        val b = ex.body()
        val r = draw((b["at"] as? Number)?.toLong(), b["fresh"] == true, b.string("by") ?: "http")
        ex.json(okOr422(r.ok), r.toJson())
    }

    private suspend fun draw(at: Long?, fresh: Boolean, by: String): ShowResult = when {
        at != null -> live.renderAt(at, by)
        fresh -> tabs.showPreview(by)
        else -> live.rerender(by)
    }

    private suspend fun reload(ex: HttpExchange) {
        val b = ex.body()
        val r = hotReload.applySave(b.strings("files").map { File(it) }, b.string("by") ?: "http")
        ex.json(okOr422(r.ok), r.toJson())
    }

    private suspend fun await(ex: HttpExchange) {
        val b = ex.body()
        val r = status.awaitRender(b.strings("files").map { File(it) }, (b["timeoutMs"] as? Number)?.toLong() ?: 30_000)
        ex.json(okOr422(r.ok), r.toJson() + mapOf("tab" to status.activeTab()?.file?.absolutePath))
    }

    private suspend fun touch(ex: HttpExchange) {
        val b = ex.body()
        val type = b.string("type") ?: "tap"
        val by = b.string("by") ?: "viewer"
        val settle = b["settle"] != false
        val r = b.string("at")?.let { live.touchAt(it, type, by, settle) }
            ?: live.touch(type, (b["x"] as Number).toInt(), (b["y"] as Number).toInt(), by, settle)
        ex.json(touchCode(r), r.toJson())
    }

    private fun touchCode(r: TouchResult) = when (r) {
        is TouchResult.Missed -> r.miss.status()
        is TouchResult.Settled -> okOr422(r.result.ok)
        else -> 200
    }

    private suspend fun scroll(ex: HttpExchange) {
        val b = ex.body()
        val r = live.scroll((b["screens"] as? Number)?.toDouble(), b["horizontal"] == true, b.string("at"), b.string("by") ?: "cli", b.string("until"))
        val code = when (r) {
            is ScrollResult.Missed -> r.miss.status()
            is ScrollResult.Settled -> if (r.result.ok && r.sought && r.found == null) 404 else okOr422(r.result.ok)
        }
        ex.json(code, r.toJson())
    }

    private suspend fun type(ex: HttpExchange) {
        val b = ex.body()
        val r = live.type(b.string("text") ?: "", b.string("by") ?: "cli")
        ex.json(okOr422(r is TypeResult.Settled && r.result.ok), r.toJson())
    }

    private fun okOr422(ok: Boolean) = if (ok) 200 else 422
}
