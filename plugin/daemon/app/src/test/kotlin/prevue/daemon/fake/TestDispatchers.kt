package prevue.daemon.fake

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import prevue.domain.port.PrevueDispatchers

internal val realDispatchers = PrevueDispatchers(Dispatchers.IO, Dispatchers.Default)

internal fun dispatchersOn(dispatcher: CoroutineDispatcher, io: CoroutineDispatcher = dispatcher) = PrevueDispatchers(io, dispatcher)
