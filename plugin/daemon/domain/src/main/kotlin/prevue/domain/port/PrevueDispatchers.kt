package prevue.domain.port

import kotlinx.coroutines.CoroutineDispatcher

class PrevueDispatchers(val io: CoroutineDispatcher, val default: CoroutineDispatcher)
