package prevue.daemon.adapter.cli

import com.sun.net.httpserver.HttpExchange
import java.io.File
import prevue.daemon.domain.model.CardResult
import prevue.daemon.domain.model.FocusResult
import prevue.daemon.domain.model.TouchResult
import prevue.daemon.domain.model.TypeResult
import prevue.daemon.domain.ScrollUseCase
import prevue.daemon.domain.model.ScrollResult
import prevue.json.map
import prevue.daemon.adapter.http.mapper.status
import prevue.daemon.adapter.http.mapper.toJson
import prevue.daemon.adapter.http.mapper.toPointed
import prevue.daemon.adapter.http.mapper.toScreenSize
import prevue.json.string
import prevue.json.strings
import prevue.daemon.adapter.http.HttpEndpoint
import prevue.daemon.adapter.http.body
import prevue.daemon.adapter.http.json

class CliEndpoint(
    private val handler: CliHandler,
    private val port: Int,
    private val root: String?,
    private val observed: () -> Map<String, Any?>,
) : HttpEndpoint {
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
            path == "/render" -> render(ex)
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
            path == "/status" -> status(ex)
            path == "/identity" -> ex.json(200, mapOf("root" to root))
            path == "/board" -> board(ex)
            path == "/selection" -> selection(ex)
            else -> return false
        }
        return true
    }

    private suspend fun status(ex: HttpExchange) {
        val seat = mapOf("port" to port, "viewer" to "http://127.0.0.1:$port/", "root" to root)
        ex.json(200, handler.status().toJson() + observed() + seat)
    }

    private suspend fun show(ex: HttpExchange) {
        val b = ex.body()
        val target = b.string("target") ?: b.string("file") ?: b.string("fqn") ?: error("target(파일 경로 또는 FQN)이 필요하다")
        val (r, board) = handler.show(target, (b["index"] as? Number)?.toInt(), b.map("params"), b.string("by") ?: "http")
        val previews = board?.previews?.map { it.toJson() } ?: emptyList()
        ex.json(okOr422(r.ok), r.toJson() + mapOf("board" to board?.toJson(), "previews" to previews))
    }

    private suspend fun close(ex: HttpExchange) {
        val b = ex.body()
        val target = b.string("target") ?: b.string("file") ?: error("target(파일 경로 또는 FQN)이 필요하다")
        ex.json(200, handler.close(target, b.string("by") ?: "http").toJson())
    }

    private suspend fun card(ex: HttpExchange) {
        val b = ex.body()
        val r = handler.card((b["index"] as Number).toInt(), b["force"] == true, b.string("by") ?: "viewer")
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
        val r = handler.focus((b["index"] as Number).toInt(), b["interactive"] == true, b.string("by") ?: "viewer", b.toScreenSize())
        ex.json(okOr422(r !is FocusResult.On || r.result.ok), r.toJson())
    }

    private fun board(ex: HttpExchange) =
        ex.json(200, handler.board()?.toJson() ?: mapOf("ok" to false, "error" to "보드가 없다 — 파일 경로로 show 한다"))

    private suspend fun select(ex: HttpExchange) {
        val b = ex.body()
        val file = b.string("file")?.takeIf { it.isNotBlank() } ?: error("file(풀패스)이 필요하다")
        val line = (b["line"] as? Number)?.toInt()?.takeIf { it > 0 } ?: error("line이 필요하다")
        val sel = handler.select(file, line, b.toPointed(), b.string("by") ?: "viewer")
        ex.json(200, sel.toJson())
    }

    private fun selection(ex: HttpExchange) {
        val sel = handler.selection()
        ex.json(if (sel == null) 404 else 200, sel?.toJson() ?: mapOf("ok" to false, "error" to "선택이 없다 — 뷰어에서 화면의 요소를 클릭한다"))
    }

    private fun previews(ex: HttpExchange) {
        val f = File(ex.body().string("file") ?: error("file이 필요하다"))
        ex.json(200, mapOf("file" to f.absolutePath, "previews" to handler.previews(f).map { it.toJson() }))
    }

    private suspend fun render(ex: HttpExchange) {
        val b = ex.body()
        val r = handler.render((b["at"] as? Number)?.toLong(), b["fresh"] == true, b.string("by") ?: "http")
        ex.json(okOr422(r.ok), r.toJson())
    }

    private suspend fun reload(ex: HttpExchange) {
        val b = ex.body()
        val r = handler.reload(b.strings("files").map { File(it) }, b.string("by") ?: "http")
        ex.json(okOr422(r.ok), r.toJson())
    }

    private suspend fun await(ex: HttpExchange) {
        val b = ex.body()
        val r = handler.await(b.strings("files").map { File(it) }, (b["timeoutMs"] as? Number)?.toLong() ?: 30_000)
        ex.json(okOr422(r.ok), r.toJson() + mapOf("tab" to handler.activeTab()))
    }

    private suspend fun touch(ex: HttpExchange) {
        val b = ex.body()
        val type = b.string("type") ?: "tap"
        val by = b.string("by") ?: "viewer"
        val settle = b["settle"] != false
        val r = b.string("at")?.let { handler.touchAt(it, type, by, settle) }
            ?: handler.touch(type, (b["x"] as Number).toInt(), (b["y"] as Number).toInt(), by, settle)
        ex.json(touchCode(r), r.toJson())
    }

    private fun touchCode(r: TouchResult) = when (r) {
        is TouchResult.Missed -> r.miss.status()
        is TouchResult.Settled -> okOr422(r.result.ok)
        else -> 200
    }

    private suspend fun scroll(ex: HttpExchange) {
        val b = ex.body()
        val until = b.string("until")
        val screens = (b["screens"] as? Number)?.toDouble() ?: if (until != null) ScrollUseCase.MAX_SCREENS else 1.0
        val r = handler.scroll(screens, b["horizontal"] == true, b.string("at"), b.string("by") ?: "cli", until)
        val code = when (r) {
            is ScrollResult.Missed -> r.miss.status()
            is ScrollResult.Settled -> if (r.result.ok && r.sought && r.found == null) 404 else okOr422(r.result.ok)
        }
        ex.json(code, r.toJson())
    }

    private suspend fun type(ex: HttpExchange) {
        val b = ex.body()
        val r = handler.type(b.string("text") ?: "", b.string("by") ?: "cli")
        ex.json(okOr422(r is TypeResult.Settled && r.result.ok), r.toJson())
    }

    private fun okOr422(ok: Boolean) = if (ok) 200 else 422
}
