package prevue.daemon.adapter.browser

import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import prevue.daemon.adapter.http.artifactUrl
import prevue.daemon.domain.model.StaleReason
import prevue.daemon.entity.Keyed
import prevue.daemon.entity.LINES
import prevue.daemon.entity.Phrase
import prevue.daemon.entity.Verbatim
import prevue.daemon.entity.phrase
import prevue.daemon.entity.phraseOrNull
import prevue.daemon.domain.port.CompileResult
import prevue.daemon.domain.model.BoardFill
import prevue.daemon.domain.model.BoardView
import prevue.daemon.domain.model.CardView
import prevue.daemon.domain.model.LastResult
import prevue.daemon.domain.model.ReloadResult
import prevue.daemon.domain.model.SaveTiming
import prevue.daemon.domain.model.ScreenSize
import prevue.daemon.domain.model.Settled
import prevue.daemon.domain.model.Shot
import prevue.daemon.domain.model.ShowResult
import prevue.daemon.domain.model.Status
import prevue.daemon.domain.model.TabView
import prevue.daemon.domain.model.Vacancy
import prevue.daemon.domain.model.Work

object BrowserStates {
    fun build(now: Status, side: ViewerSide, version: Long, zone: ZoneId = ZoneId.systemDefault()): BrowserState {
        val board = now.board
        val activeTab = now.tabs.firstOrNull { it.active }
        val screen = screenOf(now, activeTab)
        val focusId = focusIdOf(now)
        val focusScreen = focusId?.let { focusScreen(it, now, side) }
        val empty = screen == BrowserState.Screen.EMPTY || screen == BrowserState.Screen.VACANT
        val fill = fillOf(screen, board)
        return BrowserState(
            version = version,
            header = header(now, side, board?.file?.name ?: activeTab?.file?.name, focusId),
            screen = screen,
            board = board?.let { b -> BoardScreen(b.file.absolutePath, b.gen, b.focus, groups(b.cards, b.focus)) },
            focus = focusScreen,
            stale = if (screen == BrowserState.Screen.EMPTY) emptyList() else staleRows(now.stale.filterValues { !it.pending }),
            busy = now.work != null || fill.filling || now.stale.values.any { it.pending },
            boardNote = boardNote(now, fill.note, board, empty),
            who = if (empty) null else who(now, focusId, board, zone),
            timing = timingLine(now, empty, fill),
            error = if (screen == BrowserState.Screen.FOCUS) focusFailure(now.last, focusId) else null,
            selection = now.selection,
            choice = side.choice,
            tabs = tabs(now.tabs, now.module.repo),
            settle = (now.last as? Settled)?.frameStats?.takeIf { focusScreen?.interactive == true }?.let(::settleLine),
            vacant = vacantOf(activeTab, screen),
            buildPending = now.stale.values.any { it.pending },
        )
    }

    private class Fill(val drawn: Int, val total: Int, val filling: Boolean) {
        val note: Phrase? get() = if (filling) phrase("status.fill", "drawn" to drawn, "total" to total) else null
        val nothingYet: Boolean get() = filling && drawn == 0
    }

    private fun fillOf(screen: BrowserState.Screen, board: BoardView?): Fill {
        val drawn = board?.cards?.count { it.rendered && !it.stale } ?: 0
        val total = board?.cards?.size ?: 0
        return Fill(drawn, total, screen == BrowserState.Screen.BOARD && board != null && drawn < total)
    }

    private fun timingLine(now: Status, empty: Boolean, fill: Fill): List<TimingPart> {
        val previousWork = now.work != null || fill.nothingYet
        if (empty || previousWork) return emptyList()
        return timing(now.lastShown, now.boardFill)
    }

    private fun vacantOf(activeTab: TabView?, screen: BrowserState.Screen): Phrase? =
        activeTab?.vacant?.takeIf { screen == BrowserState.Screen.VACANT }?.let { vacantText(activeTab.file?.name ?: activeTab.key, it) }

    private fun screenOf(now: Status, activeTab: TabView?): BrowserState.Screen = when {
        now.board != null && now.interactive -> BrowserState.Screen.FOCUS
        now.board != null -> BrowserState.Screen.BOARD
        now.preview != null -> BrowserState.Screen.FOCUS
        activeTab?.vacant != null -> BrowserState.Screen.VACANT
        else -> BrowserState.Screen.EMPTY
    }

    private fun focusIdOf(now: Status): String? {
        val board = now.board
        return when {
            board != null && now.interactive -> board.cards.getOrNull(board.focus)?.previewId
            board == null -> now.preview?.previewId
            else -> null
        }
    }

    private fun header(now: Status, side: ViewerSide, fileName: String?, focusId: String?): Header {
        val title = fileName ?: focusId?.let { "$it-0" } ?: "Prevue"
        val repo = now.module.repo
        val leaf = repo.trimEnd('/').substringAfterLast('/')
        return Header(
            title = title,
            tabTitle = "$leaf · $title",
            repoPrefix = repo.removeSuffix(leaf), repoLeaf = leaf,
            module = now.module.module.trimStart(':'), variant = now.module.variant,
            repo = repo,
            branch = side.branch,
            sourceSet = now.module.sourceSet, kmp = now.kmp,
        )
    }

    private fun focusScreen(id: String, now: Status, side: ViewerSide): FocusScreen {
        val board = now.board
        val current = now.preview
        val streaming = if (board != null) now.interactive else side.singleInteractive == id
        val stamp = maxOf(drawnAt(now), side.stillStamp)
        val card = board?.cards?.getOrNull(board.focus)
        val (name, fn) = when {
            card != null -> titleLines(card.name, card.params, card.paramIndex, card.paramCount)
            board == null && current != null -> titleLines(current.functionName, current.params, current.paramIndex, current.paramCount)
            else -> null to id
        }
        return FocusScreen(
            previewId = id, interactive = streaming, fromBoard = board != null,
            imageUrl = "/$id-0.png?t=$stamp", treeUrl = "/$id-0.viewinfo.json?t=$stamp",
            streamUrl = streamUrl(board != null, streaming, now.focusAttachedAt, side.streamStamp),
            pxPerDp = CardSpecs.pxPerDp((if (now.size != null) current?.params else card?.params) ?: current?.params.orEmpty()),
            name = name, fn = fn, size = now.size,
            postures = now.postures.mapNotNull { (size, shot) -> postureImage(size, shot) },
        )
    }

    private fun postureImage(size: ScreenSize, shot: Shot): PostureImage? {
        val out = shot.out
        return artifactUrl(out.image, shot.artifactRevision)?.let { PostureImage(size, it, CardSpecs.dpSize(out.preview.params, out.width, out.height)) }
    }

    private fun streamUrl(onBoard: Boolean, streaming: Boolean, attachedAt: Long?, singleStamp: Long): String? = when {
        !streaming -> null
        !onBoard -> "/stream?t=$singleStamp"
        attachedAt == null -> null
        else -> "/stream?t=$attachedAt"
    }

    private fun staleRows(stale: Map<String, StaleReason>): List<StaleRow> = stale.values.map { d ->
        val names = d.files.map { it.substringAfterLast('/') }.distinct().joinToString(", ")
        StaleRow(phrase("stale.head", "what" to d.what), listOfNotNull(Verbatim(names), d.message, d.remedy).filter { it !is Verbatim || it.text.isNotBlank() })
    }

    private fun boardNote(now: Status, fillNote: Phrase?, board: BoardView?, empty: Boolean): Phrase? {
        val work = now.work
        return when {
            work is Work.Compiling -> progress(work)
            fillNote != null -> fillNote
            work != null -> progress(work)
            empty -> null
            now.stale.values.any { it.pending } && now.lastShown !is ReloadResult.CompileFailed -> phrase("status.buildPending")
            else -> failureNote(now.lastShown) ?: board?.let { phrase("status.board", "n" to it.cards.size, "file" to it.file.name) }
        }
    }

    private fun progress(work: Work): Phrase = when (work) {
        is Work.Compiling -> phrase("status.compiling", "files" to work.files.joinToString(", ") { it.name })
        is Work.Rendering -> phrase("status.rendering")
    }

    private fun failureNote(shown: LastResult?): Phrase? = when (shown) {
        is ShowResult -> shown.shot.out.takeIf { !it.ok }?.let { failNote(it.failure?.name, it.message) }
        is ReloadResult.CompileFailed -> failNote("COMPILE", Verbatim(shown.compile.messages))
        else -> null
    }

    private fun drawnAt(now: Status): Long = listOfNotNull(
        (now.last as? ShowResult)?.shot?.artifactRevision, (now.last as? Settled)?.shot?.artifactRevision,
        (now.lastShown as? ShowResult)?.shot?.artifactRevision,
    ).maxOrNull() ?: 0L

    private fun who(now: Status, focusId: String?, board: BoardView?, zone: ZoneId): Phrase? = now.shownBy.takeIf { it.isNotBlank() }?.let { by ->
        val what = focusId?.let { Verbatim("$it-0") } ?: board?.let { phrase("board.count", "n" to it.cards.size) } ?: Verbatim("")
        phrase("status.who", "by" to by, "time" to clock(now.shownAt, zone), "what" to what)
    }

    fun vacantText(name: String, why: Vacancy): Phrase =
        if (why == Vacancy.DELETED) phrase("vacant.deleted", "file" to name) else phrase("vacant.noPreview", "file" to name)

    private fun titleLines(fn: String, params: Map<String, String>, paramIndex: Int, paramCount: Int): Pair<String?, String> =
        params["name"] to (if (paramCount > 1) "$fn · $paramIndex" else fn)

    private fun tabs(views: List<TabView>, repo: String): List<TabChip> {
        fun base(t: TabView) = t.fqn?.substringAfterLast('.') ?: t.file?.nameWithoutExtension ?: t.key
        val twins = views.groupingBy(::base).eachCount()
        return views.map { t ->
            TabChip(
                key = t.key, name = base(t),
                dim = if (t.fqn != null) t.file?.let { " · ${it.nameWithoutExtension}" }.orEmpty() else "",
                module = t.module.takeIf { (twins[base(t)] ?: 0) > 1 && it.isNotBlank() }?.removePrefix(":"),
                title = listOfNotNull(t.file?.absolutePath?.removePrefix(repo.trimEnd('/') + "/"), t.fqn).joinToString("\n").ifEmpty { t.key },
                active = t.active, stale = t.stale, sourceSet = t.sourceSet,
            )
        }
    }

    fun failNote(kind: String?, message: Phrase?) = phrase("failure.note", "kind" to failText(kind), "message" to (message?.firstLine() ?: Verbatim("")))

    private fun groups(cards: List<CardView>, focus: Int): List<CardGroup> {
        val out = ArrayList<CardGroup>()
        var start = 0
        while (start < cards.size) {
            var end = start
            while (end < cards.size && cards[end].name == cards[start].name) end++
            val run = cards.subList(start, end).map { card(it, focus) }
            out += CardGroup(cards[start].name, run, run.count { it.ok == false })
            start = end
        }
        return out
    }

    private fun card(c: CardView, focus: Int): CardState {
        val named = c.params["name"]?.takeIf { it.isNotBlank() }
        val nth = c.paramIndex.takeIf { c.paramCount > 1 }
        val label = when {
            nth == null -> named.orEmpty()
            named == null -> "#$nth"
            else -> "$named · $nth"
        }
        val drawn = c.ok == true && c.image != null
        val w = c.width?.takeIf { it > 0 }
        val h = c.height?.takeIf { it > 0 }
        val dp = CardSpecs.dpSize(c.params, w, h)
        return CardState(
            index = c.index, previewId = c.previewId, label = label, title = "${c.fqn}\n${c.previewId}",
            args = c.params.filterKeys { it != "name" }.entries.joinToString(" · ") { "${it.key}=${it.value}" },
            specs = CardSpecs.of(c.params, w, h),
            ok = c.ok, rendered = c.rendered, stale = c.stale && c.rendered, isFocus = c.index == focus,
            imageUrl = artifactUrl(c.image, c.artifactRevision), treeUrl = artifactUrl(c.tree, c.artifactRevision),
            meta = if (drawn) meta(c) else null,
            failure = if (c.rendered && !drawn) failureText(c.failure?.name, c.message, 400) else null,
            widthDp = dp.width, heightDp = dp.height, dpGuess = dp.guess,
        )
    }

    private fun meta(c: CardView): Phrase {
        val size = phrase("card.meta", "w" to c.width, "h" to c.height, "ms" to (c.taskMs ?: 0) + (c.renderMs ?: 0))
        return if (c.stale) phrase("card.meta.stale", "meta" to size) else size
    }

    private class TimingParts {
        private val parts = ArrayList<TimingPart>()

        fun result(): List<TimingPart> = parts

        fun add(label: Phrase, ms: Long?, limit: Long? = null, head: Boolean = false) {
            if (ms != null) parts += TimingPart(label, ms, limit != null && ms > limit, took(ms), head)
        }

        fun detect(t: SaveTiming?) {
            if (t == null) return
            add(phrase("timing.detect"), t.detectMs)
            if (t.waitMs > 0) add(phrase("timing.wait"), t.waitMs)
        }
    }

    private fun timing(shown: LastResult?, fill: BoardFill?): List<TimingPart> {
        val parts = TimingParts()
        val lines = when (shown) {
            is ShowResult -> shown.lines
            is ReloadResult.CompileFailed -> shown.lines
            else -> null
        }
        val saveLimit = if ((lines ?: 0) > BIG_FILE_LINES) BIG_SAVE_MS else FIRST_MS
        when (shown) {
            is ShowResult -> parts.show(shown, fill?.takeIf { it.since == shown.startedAtMs }, saveLimit)
            is ReloadResult.CompileFailed -> parts.compileFailed(shown, saveLimit)
            is Settled, null -> {}
        }
        return parts.result()
    }

    private fun TimingParts.show(shown: ShowResult, fill: BoardFill?, saveLimit: Long) {
        val compile = shown.shot.compile
        detect(shown.timing)
        add(phrase(if (compile?.exitCode == CompileResult.LITERALS) "timing.literals" else "timing.compile"), compile?.ms)
        add(phrase("timing.task"), shown.shot.out.taskMs)
        add(phrase(if (shown.shot.out.freshLoader) "timing.loaderRender" else "timing.render"), shown.shot.out.renderMs)
        val cold = shown.coldMs
        when {
            cold != null -> add(phrase("timing.cold"), cold, COLD_MS, head = true)
            compile != null -> add(phrase("timing.first"), shown.saveToScreenMs ?: shown.shot.totalMs, saveLimit, head = true)
            else -> add(phrase("timing.first"), shown.shot.totalMs, FIRST_MS, head = true)
        }
        fill?.let { add(phrase("timing.board", "n" to it.cards), it.ms, if (cold != null) null else BOARD_MS) }
    }

    private fun TimingParts.compileFailed(shown: ReloadResult.CompileFailed, saveLimit: Long) {
        detect(shown.timing)
        add(phrase("timing.compile"), shown.compile.ms)
        add(phrase("timing.total"), shown.totalMs + (shown.timing?.let { it.detectMs + it.waitMs } ?: 0), saveLimit, head = true)
    }

    private fun took(ms: Long): String {
        if (ms < 1_000) return "${ms}ms"
        val cs = (ms + 9) / 10
        return String.format(Locale.ROOT, "%d.%02d", cs / 100, cs % 100).trimEnd('0').trimEnd('.') + "s"
    }

    private fun settleLine(f: Map<String, Any?>): Phrase? =
        f["frames"]?.let { phrase("status.settle", "frames" to it, "tick" to f["tickMs"]) }

    private const val FIRST_MS = 1_000L
    private const val BIG_SAVE_MS = 2_000L
    private const val BIG_FILE_LINES = 640
    private const val BOARD_MS = 3_000L
    private const val COLD_MS = 5_000L

    private fun focusFailure(last: LastResult?, focusId: String?): Phrase? = when (last) {
        is ShowResult -> last.shot.out.takeIf { !it.ok && it.preview.previewId == focusId }?.let { failureText(it.failure?.name, it.message, 1600) }
        is ReloadResult.CompileFailed -> failureText("COMPILE", Verbatim(last.compile.messages), 1600)
        else -> null
    }

    private fun failureText(kind: String?, message: Phrase?, limit: Int) =
        phrase("failure.detail", "kind" to failText(kind), "message" to (message?.clip(limit) ?: Verbatim("")))

    private fun Phrase.firstLine(): Phrase = when (this) {
        is Verbatim -> Verbatim(text.lineSequence().first())
        is Keyed -> if (key == LINES) (args.getValue("head") as Phrase).firstLine() else map { it.lineSequence().first() }
    }

    private fun Phrase.clip(limit: Int): Phrase {
        var left = limit
        fun take(s: String) = s.take(left.coerceAtLeast(0)).also { left -= it.length }
        fun cut(p: Phrase): Phrase = when (p) {
            is Verbatim -> Verbatim(take(p.text))
            is Keyed -> p.copy(args = p.args.mapValues { (_, v) -> if (v is Phrase) cut(v) else plainOr(v, ::take) })
        }
        return cut(this)
    }

    private fun Keyed.map(f: (String) -> String): Keyed = copy(args = args.mapValues { (_, v) ->
        when (v) {
            is Verbatim -> Verbatim(f(v.text))
            is Keyed -> v.map(f)
            else -> plainOr(v, f)
        }
    })

    private fun plainOr(v: Any?, f: (String) -> String): Any? = if (v == null || v is Number || v is Boolean) v else f(v.toString())

    private fun clock(at: String?, zone: ZoneId): String = runCatching {
        DateTimeFormatter.ofPattern("HH:mm:ss").withZone(zone).format(Instant.parse(at))
    }.getOrDefault(at.orEmpty())

    private fun failText(kind: String?): Phrase = kind?.let { phraseOrNull("failure.$it") ?: Verbatim(it) } ?: phrase("failure")
}

data class ViewerSide(
    val singleInteractive: String? = null,
    val streamStamp: Long = 0,
    val stillStamp: Long = 0,
    val choice: PathChoice? = null,
    val branch: String? = null,
)
