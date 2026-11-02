package prevue.daemon.domain

import prevue.daemon.domain.model.TypeResult
import prevue.daemon.domain.runtime.EngineActor
import prevue.daemon.domain.runtime.LiveShot
import prevue.daemon.domain.runtime.Workspace

/** D-69. 포커스된 텍스트 필드에 글자를 넣고, 정착한 그림을 돌려준다. 포커스된 필드가 없으면 넣지 않고 이유를 돌려준다. */
class TypeUseCase(
    private val ws: Workspace,
    private val engine: EngineActor,
    private val live: LiveShot,
) {
    suspend operator fun invoke(text: String, by: String): TypeResult = ws.exclusive { ed ->
        val t = System.nanoTime()
        live.session(ed, t, by)?.let { return@exclusive TypeResult.Settled(it) }
        val (seq, why) = engine.type(text)
        why?.let { return@exclusive TypeResult.NoField(it) }
        TypeResult.Settled(live.settled(ed, engine.settled(seq), t, by))
    }
}
