package prevue.infrastructure.controller.browser

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.getAndUpdate
import kotlinx.coroutines.flow.update

internal class GestureLine {
    sealed class Step(val run: suspend () -> Unit) {
        class Drag(run: suspend () -> Unit) : Step(run)
        class Kept(run: suspend () -> Unit) : Step(run)
    }

    private class Line(val waiting: List<Step>, val draining: Boolean)

    private val line = MutableStateFlow(Line(emptyList(), draining = false))

    fun add(step: Step): Boolean = !line.getAndUpdate { Line(it.waiting.mergingDrag(step), draining = true) }.draining

    suspend fun drain(each: suspend (Step) -> Unit) {
        var finished = false
        try {
            while (true) each(takeOrFinish() ?: break)
            finished = true
        } finally {
            if (!finished) line.update { Line(it.waiting, draining = false) }
        }
    }

    private fun takeOrFinish(): Step? =
        line.getAndUpdate { Line(it.waiting.drop(1), draining = it.waiting.isNotEmpty()) }.waiting.firstOrNull()

    private fun List<Step>.mergingDrag(step: Step): List<Step> =
        if (step is Step.Drag && lastOrNull() is Step.Drag) dropLast(1) + step else this + step
}
