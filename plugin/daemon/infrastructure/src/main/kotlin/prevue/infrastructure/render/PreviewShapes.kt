package prevue.infrastructure.render

import prevue.application.domain.model.PreviewSpec

internal class PreviewShapes {
    private val layouts = HashMap<Triple<String, List<Map<String, String>>, Map<String, String>>, List<String>>()
    private val counts = HashMap<List<Map<String, String>>, List<String?>>()
    private var counted = HashMap<List<Map<String, String>>, List<String?>>()

    fun layouts(p: PreviewSpec, resolve: () -> List<String>): List<String> = layouts.getOrPut(Triple(p.fqn, p.methodParams, p.params), resolve)

    fun instances(p: PreviewSpec, resolve: () -> List<String?>): List<String?> = counts.getOrPut(p.methodParams) {
        resolve().also { now -> if (counted[p.methodParams]?.let { it.size != now.size } == true) layouts.keys.removeIf { it.second == p.methodParams } }
    }

    fun recount() { counted = HashMap(counted + counts); counts.clear() }

    fun forgetAll() { layouts.clear(); counts.clear(); counted.clear() }
}
