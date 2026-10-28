package prevue.daemon.adapter.render

internal class PreviewProbe(private val loader: ClassLoader?) {
    enum class Presence { FOUND, NO_CLASS, NO_METHOD }

    fun presence(fqn: String, checkMethod: Boolean = true): Presence {
        val l = loader ?: return Presence.FOUND
        val cls = runCatching { Class.forName(fqn.substringBeforeLast('.'), false, l) }.getOrNull() ?: return Presence.NO_CLASS
        if (!checkMethod) return Presence.FOUND
        val method = fqn.substringAfterLast('.')
        val methods = runCatching { generateSequence(cls) { it.superclass }.flatMap { it.declaredMethods.asSequence() }.toList() }
            .getOrNull() ?: return Presence.FOUND
        return if (methods.any { it.name == method || it.name.startsWith("$method-") }) Presence.FOUND else Presence.NO_METHOD
    }

}
