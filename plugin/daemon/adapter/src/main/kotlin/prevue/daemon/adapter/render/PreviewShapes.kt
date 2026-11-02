package prevue.daemon.adapter.render

import prevue.daemon.entity.PreviewSpec

class PreviewShapes {
    private val layouts = HashMap<Triple<String, List<Map<String, String>>, Map<String, String>>, List<String>>()
    private val counts = HashMap<List<Map<String, String>>, Int>()
    private var counted = HashMap<List<Map<String, String>>, Int>()

    fun layouts(p: PreviewSpec, resolve: () -> List<String>): List<String> = layouts.getOrPut(Triple(p.fqn, p.methodParams, p.params), resolve)

    fun count(p: PreviewSpec, resolve: () -> Int): Int = counts.getOrPut(p.methodParams) {
        resolve().also { n -> if (counted[p.methodParams]?.let { it != n } == true) layouts.keys.removeIf { it.second == p.methodParams } }
    }

    fun recount() { counted = HashMap(counted + counts); counts.clear() }

    fun forgetAll() { layouts.clear(); counts.clear(); counted.clear() }
}
