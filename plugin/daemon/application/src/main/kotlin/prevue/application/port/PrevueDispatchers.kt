package prevue.application.port

import kotlinx.coroutines.CoroutineDispatcher

class PrevueDispatchers(val io: CoroutineDispatcher, val default: CoroutineDispatcher)
