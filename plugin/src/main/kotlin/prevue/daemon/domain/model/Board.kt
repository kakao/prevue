package prevue.daemon.domain.model

import java.io.File
import kotlinx.coroutines.CompletableDeferred
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.domain.port.FailureKind

/**
 * 파일 하나에 정의된 `@Preview` 전부(FR-17). 데몬이 살려 두는 `RenderTask`는 하나뿐이므로
 * **카드는 정적 이미지이고 인터랙티브는 focus 한 장에만 걸린다**(FR-18) — AS Interactive Preview와 같은 제약이다.
 *
 * 불변 값이다(D-51). 바꾸는 메서드는 새 보드를 돌려주고, `Workspace`가 CAS로 갈아 끼운다 — 줄 밖의 쓰기 완료와
 * 줄 안의 유스케이스가 같은 보드를 함께 바꿔도 한쪽이 다른 쪽을 덮지 않고, 읽는 쪽은 언제나 한 순간의 모습을 본다.
 */
data class Board(
    val file: File,
    val cards: List<Card>,
    /** live 태스크(인터랙티브)의 자리. 저장하면 파일의 카드 전부를 다시 그리고, 이 카드가 그 첫 장이다. */
    val focus: Int,
    /** 컴파일 세대. 성공한 컴파일마다 오른다 — gen이 낮은 카드는 옛 코드로 그린 그림이다. */
    val gen: Int = 0,
    /**
     * 보드를 연 회차. 값이라 같은 보드인지를 참조로 못 가른다 — 채우기와 쓰기 완료는 이것으로 "그새 다시 열렸나"를 본다.
     * 같은 파일을 다시 열어도 다르다.
     */
    val epoch: BoardEpoch = BoardEpoch(),
) {
    val focusCard: Card get() = cards[focus]

    /** 컴파일이 성공했다 — 지금 그림은 전부 옛 세대가 된다. */
    fun advance(): Board = copy(gen = gen + 1)

    fun focusOn(index: Int): Board = copy(focus = index)

    fun reread(specs: List<PreviewSpec>): Board {
        val kept = cards.associateBy { it.spec.previewId }
        val at = specs.indexOfFirst { it.previewId == focusCard.spec.previewId }
        return copy(
            cards = specs.map { s -> kept[s.previewId]?.copy(spec = s, pending = null, pendingGen = -1) ?: Card(s) },
            focus = if (at >= 0) at else focus.coerceAtMost(specs.size - 1),
            epoch = BoardEpoch(),
        )
    }

    /** [index]의 카드가 [boardGen] 세대의 쓰기를 시작했다. */
    fun begin(index: Int, boardGen: Int, f: CompletableDeferred<CardResult>): Board = withCard(index) { it.begin(boardGen, f) }

    /** [index]의 카드에 [boardGen] 세대로 그린 결과를 적는다. */
    fun record(index: Int, boardGen: Int, r: CardResult): Board = withCard(index) { it.record(boardGen, r) }

    /**
     * 숨었다 돌아온 보드. 숨은 사이에 끝난 쓰기는 회차가 안 맞아 기록되지 못했다(`Workspace.updateBoard`) — 끝난 것은 여기서 적는다.
     * 안 적으면 카드가 영영 "쓰는 중"이라 채우기와 기다림이 그 결과를 받고도 카드에 남기지 못한다.
     */
    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    fun settled(): Board = copy(cards = cards.map { c ->
        val p = c.pending?.takeIf { it.isCompleted } ?: return@map c
        runCatching { c.record(c.pendingGen, p.getCompleted()) }.getOrDefault(c.copy(pending = null))
    })

    /** [indices]의 그림을 잊는다 — 숨은 사이에 산출물 상한이 지웠다. 다음 채우기가 다시 그린다. */
    fun forget(indices: Collection<Int>): Board =
        if (indices.isEmpty()) this else copy(cards = cards.mapIndexed { i, c -> if (i in indices) Card(c.spec) else c })

    fun view(): BoardView = BoardView(file, focus, gen, cards.mapIndexed { i, c -> c.view(i, gen) }, cards.map { it.spec })

    private fun withCard(index: Int, f: (Card) -> Card): Board = copy(cards = cards.toMutableList().also { it[index] = f(it[index]) })

    companion object {
        fun open(file: File, specs: List<PreviewSpec>, focus: Int): Board =
            Board(file, specs.map { Card(it) }, focus.coerceIn(0, maxOf(0, specs.size - 1)))
    }
}

class BoardEpoch

/** 보드의 카드 한 장. 마지막 렌더 결과를 그대로 들고 있어 뷰어가 보는 것과 CLI가 받는 것이 같다. */
data class Card(
    val spec: PreviewSpec,
    val gen: Int = -1,
    /** 그린 것(`Drawn`)이나 쓰기 실패(`WriteFailed`)만 남는다. */
    val result: CardResult? = null,
    /**
     * 렌더는 끝났고 PNG·트리가 디스크로 가는 중인 결과. 그 사이에 같은 카드를 청하면 다시 그리지 않고 이것을 기다린다 —
     * 데몬의 채우기와 뷰어의 요청이 같은 카드에 겹치는 자리다(쓰기 ~60ms). 값에 두는 것은 실용상 예외다(D-51) —
     * 밖의 표로 빼면 같은 파일을 다시 열 때 세대가 0부터 다시 시작해 키가 겹친다.
     */
    val pending: CompletableDeferred<CardResult>? = null,
    val pendingGen: Int = -1,
) {
    /** 이 카드의 그림이 지금 세대의 코드로 그려졌는가. */
    fun fresh(boardGen: Int): Boolean = gen == boardGen && result != null

    /** 같은 세대의 쓰기가 진행 중인가. 같으면 그 결과를 기다리면 된다. */
    fun writing(boardGen: Int): CompletableDeferred<CardResult>? = pending?.takeIf { pendingGen == boardGen }

    fun begin(boardGen: Int, f: CompletableDeferred<CardResult>): Card = copy(pendingGen = boardGen, pending = f)

    /** 결과와 세대를 한 번에 바꾼다 — 새 gen을 본 쪽이 옛 result를 새 그림으로 믿는 틈이 없다. */
    fun record(boardGen: Int, r: CardResult): Card =
        copy(result = r, gen = boardGen, pending = if (pendingGen == boardGen) null else pending)

    fun view(index: Int, boardGen: Int): CardView {
        val r = result
        val shot = (r as? CardResult.Drawn)?.shot
        val out = shot?.out
        val failed = r as? CardResult.WriteFailed
        return CardView(
            index = index, previewId = spec.previewId, fqn = spec.fqn, name = spec.functionName,
            params = spec.params, gen = gen, stale = gen != boardGen, rendered = r != null,
            paramIndex = spec.paramIndex, paramCount = spec.paramCount,
            ok = out?.ok ?: failed?.let { false }, failure = out?.failure ?: failed?.let { FailureKind.EXCEPTION },
            message = out?.message ?: failed?.message,
            width = out?.width, height = out?.height, artifactRevision = shot?.artifactRevision,
            image = out?.image, tree = out?.tree, taskMs = out?.taskMs, renderMs = out?.renderMs, phases = out?.phases,
        )
    }
}
