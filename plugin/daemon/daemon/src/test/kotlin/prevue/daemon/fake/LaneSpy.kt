package prevue.daemon.fake

import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicInteger
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Runnable

// IO 와 Default 는 워커 이름이 같아 스레드로 가리지 못한다 — 어느 디스패처에 어떤 뷰를 청하고 그 뷰에서 도는지로 본다(D-89).
// 실제 디스패처를 감싸면 여러 스레드가 함께 올리므로 셈은 원자적으로 둔다.
internal class LaneSpy(private val inner: CoroutineDispatcher) : CoroutineDispatcher() {
    class View(val parallelism: Int, val name: String?, val spy: LaneSpy)

    val views: MutableList<View> = CopyOnWriteArrayList()
    private val count = AtomicInteger()
    val dispatched: Int get() = count.get()

    fun lanes(): List<Pair<Int, String?>> = views.map { it.parallelism to it.name }

    fun view(name: String): LaneSpy = views.single { it.name == name }.spy

    override fun dispatch(context: CoroutineContext, block: Runnable) { count.incrementAndGet(); inner.dispatch(context, block) }

    override fun limitedParallelism(parallelism: Int, name: String?): CoroutineDispatcher =
        LaneSpy(inner.limitedParallelism(parallelism, name)).also { views += View(parallelism, name, it) }
}
