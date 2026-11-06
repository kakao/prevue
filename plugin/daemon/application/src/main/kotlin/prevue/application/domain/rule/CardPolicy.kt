package prevue.application.domain.rule

import prevue.application.domain.model.SkipReason

object CardPolicy {
    sealed interface Decision {
        data object Fresh : Decision
        data object Writing : Decision
        data class Skip(val reason: SkipReason) : Decision
        data object Draw : Decision
        data object Aside : Decision
    }

    fun decide(fresh: Boolean, writing: Boolean, isFocus: Boolean, force: Boolean, interactive: Boolean, savePending: Boolean): Decision = when {
        !force && fresh -> Decision.Fresh
        !force && writing -> Decision.Writing
        savePending -> Decision.Skip(SkipReason.RELOAD)
        interactive && !isFocus -> Decision.Aside
        else -> Decision.Draw
    }
}
