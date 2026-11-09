package prevue.daemon.fake

import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicInteger
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Delay
import kotlinx.coroutines.InternalCoroutinesApi
import kotlinx.coroutines.Runnable

// IO 와 Default 는 워커 이름이 같아 스레드로 가리지 못한다 — 어느 디스패처에 어떤 뷰를 청하고 그 뷰에서 도는지로 본다(D-89).
// 실제 디스패처를 감싸면 여러 스레드가 함께 올리므로 셈은 원자적으로 둔다.
// 감싼 디스패처가 Delay 면(가상 시계) 그 Delay 를 그대로 넘긴다 — 아니면 스파이 아래 delay 가 실제 시간으로 간다.
// Delay 가 아니면(Dispatchers.IO · Default) 스파이도 Delay 가 아니어서 코루틴이 기본 Delay 를 쓴다 — 따로 대체를 두지 않는다.
internal open class LaneSpy private constructor(private val inner: CoroutineDispatcher) : CoroutineDispatcher() {
    class View(val parallelism: Int, val name: String?, val spy: LaneSpy)

    private val recorded = CopyOnWriteArrayList<View>()

    // 뷰에서 다시 청한 뷰도 뿌리에서 보이게, 청한 차례대로 자기 아래를 펼친다.
    val views: List<View> get() = recorded.flatMap { listOf(it) + it.spy.views }
    private val count = AtomicInteger()
    val dispatched: Int get() = count.get()

    fun lanes(): List<Pair<Int, String?>> = views.map { it.parallelism to it.name }

    fun view(name: String): LaneSpy = views.single { it.name == name }.spy

    override fun dispatch(context: CoroutineContext, block: Runnable) {
        count.incrementAndGet()
        inner.dispatch(context, Runnable {
            val before = running.get()
            running.set(this)
            try { block.run() } finally { running.set(before) }
        })
    }

    override fun limitedParallelism(parallelism: Int, name: String?): CoroutineDispatcher =
        invoke(inner.limitedParallelism(parallelism, name)).also { recorded += View(parallelism, name, it) }

    @OptIn(InternalCoroutinesApi::class)
    private class Delaying(inner: CoroutineDispatcher, delay: Delay) : LaneSpy(inner), Delay by delay

    companion object {
        private val running = ThreadLocal<LaneSpy?>()

        @OptIn(InternalCoroutinesApi::class)
        operator fun invoke(inner: CoroutineDispatcher): LaneSpy =
            (inner as? Delay)?.let { Delaying(inner, it) } ?: LaneSpy(inner)

        // 지금 이 코드를 돌리는 스파이 — 셈만으로는 다른 코루틴이 같은 뷰를 쓴 것과 가려지지 않는다.
        fun current(): LaneSpy? = running.get()
    }
}
