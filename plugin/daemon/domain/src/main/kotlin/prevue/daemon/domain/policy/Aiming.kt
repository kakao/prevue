package prevue.daemon.domain.policy

import prevue.daemon.entity.LiveTree
import prevue.daemon.domain.model.Aim
import prevue.daemon.domain.model.Miss
import prevue.daemon.domain.policy.NodeTarget.Pick

internal object Aiming {
    sealed interface Target {
        data class Hit(val aim: Aim) : Target
        data class Missed(val miss: Miss) : Target
    }

    fun aim(at: String, spec: NodeTarget.Spec, tree: LiveTree): Target {
        val all = NodeTarget.candidates(tree.nodes, spec)
        val num = NodeTarget.number(all, tree.lists)
        if (num.inList) return aimInList(at, spec, tree, num)
        val seen = all.filter { NodeTarget.visible(it, tree) }
        val miss = when (val pick = NodeTarget.pick(seen, spec.nth)) {
            is Pick.Hit -> return hit(spec, tree, pick)
            is Pick.Choose -> Miss.Choose(at, pick.numbered)
            is Pick.NoSuch -> Miss.NoSuch(at, pick.nth, pick.numbered)
            is Pick.Away, Pick.Missing -> if (all.isEmpty()) Miss.Missing(at) else Miss.OffScreen(at, NodeTarget.inReadingOrder(all))
        }
        return Target.Missed(miss)
    }

    private fun aimInList(at: String, spec: NodeTarget.Spec, tree: LiveTree, num: NodeTarget.Numbering): Target {
        val seen = num.all.filter { NodeTarget.visible(it.node, tree) }
        val miss = when (val pick = NodeTarget.pickIn(NodeTarget.Numbering(seen, num.list, num.mixed), spec.nth)) {
            is Pick.Hit -> return hit(spec, tree, pick)
            is Pick.Choose -> Miss.Choose(at, pick.numbered, pick.mixedLists, pick.total)
            is Pick.NoSuch -> Miss.NoSuch(at, pick.nth, num.all, pick.total)
            is Pick.Away -> Miss.OffScreen(at, seen)
            Pick.Missing -> Miss.OffScreen(at, num.all)
        }
        return Target.Missed(miss)
    }

    private fun hit(spec: NodeTarget.Spec, tree: LiveTree, pick: Pick.Hit): Target {
        val (x, y) = NodeTarget.point(pick.node, tree)
        return Target.Hit(Aim(spec.toString(), pick.index, pick.of, pick.node, x, y))
    }
}
