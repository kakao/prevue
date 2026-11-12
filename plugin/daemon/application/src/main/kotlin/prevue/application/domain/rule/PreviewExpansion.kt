package prevue.application.domain.rule

import prevue.application.domain.model.PreviewSpec

object PreviewExpansion {
    fun expand(found: List<PreviewSpec>, instancesOf: (PreviewSpec) -> List<String?>): List<PreviewSpec> {
        if (found.none { it.methodParams.isNotEmpty() }) return found
        val out = ArrayList<PreviewSpec>()
        for (p in found) {
            val labels = instancesOf(p)
            val n = labels.size
            if (n <= 1) { out += p.copy(index = out.size); continue }
            for (k in 0 until n) {
                out += p.copy(previewId = "${p.previewId}_p$k", paramIndex = k, paramCount = n, paramLabel = labels[k], index = out.size)
            }
        }
        return out
    }
}
