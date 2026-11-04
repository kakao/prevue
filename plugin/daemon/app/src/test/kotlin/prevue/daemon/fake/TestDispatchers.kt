package prevue.daemon.fake

import kotlinx.coroutines.CoroutineDispatcher
import prevue.daemon.PrevueDaemon
import prevue.domain.port.PrevueDispatchers

internal val realDispatchers = PrevueDaemon.realDispatchers

internal fun dispatchersOn(dispatcher: CoroutineDispatcher, io: CoroutineDispatcher = dispatcher) = PrevueDispatchers(io, dispatcher)
