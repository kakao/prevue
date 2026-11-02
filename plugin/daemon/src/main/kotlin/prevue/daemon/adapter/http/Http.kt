package prevue.daemon.adapter.http

import com.sun.net.httpserver.HttpExchange
import java.nio.charset.StandardCharsets.UTF_8
import prevue.json.Json

/** [Server]에 싣는 HTTP 입구 하나. 제 길이 아니면 false를 돌려 다음 입구에 넘긴다. */
fun interface HttpEndpoint {
    suspend fun route(ex: HttpExchange, path: String, method: String): Boolean
}

@Suppress("UNCHECKED_CAST")
internal fun HttpExchange.body(): Map<String, Any?> {
    val text = requestBody.readBytes().toString(UTF_8)
    return if (text.isBlank()) emptyMap() else Json.parse(text) as Map<String, Any?>
}

internal fun HttpExchange.json(code: Int, v: Any?) {
    val bytes = Json.str(v).toByteArray(UTF_8)
    responseHeaders.add("Content-Type", "application/json; charset=utf-8")
    responseHeaders.add("Cache-Control", "no-store")
    sendResponseHeaders(code, bytes.size.toLong())
    responseBody.use { it.write(bytes) }
}
