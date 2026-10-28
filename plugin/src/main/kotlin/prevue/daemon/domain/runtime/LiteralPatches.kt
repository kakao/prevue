package prevue.daemon.domain.runtime

import java.io.File
import prevue.daemon.domain.port.CompileResult
import prevue.daemon.domain.port.LiteralSite
import prevue.daemon.domain.policy.LiteralPolicy

class LiteralPatches(private val ws: Workspace, private val engine: EngineActor) {
    private class Known(val text: String, val owner: String?, val sites: List<LiteralSite>, val epoch: Int)
    private val known = HashMap<String, Known>()
    private var epoch = 0
    private val enabled = HashMap<String, Set<String>>()

    sealed interface Outcome {
        data object Same : Outcome
        data class Patched(val compile: CompileResult) : Outcome
        data class Compile(val why: String, val routine: Boolean = true) : Outcome
    }

    fun read(files: List<File>): Map<String, String?> = files.associate { f ->
        f.absolutePath to runCatching { f.readText() }.getOrNull()?.takeIf { '\r' !in it && !it.startsWith('﻿') }
    }

    suspend fun tryApply(texts: Map<String, String?>, patch: Boolean, same: Boolean): Outcome {
        val t = System.nanoTime()
        val plans = LinkedHashMap<String, LiteralPolicy.Plan.Patch>()
        plan(texts, plans)?.let { return it }
        if (plans.isEmpty()) return if (same) Outcome.Same else Outcome.Compile("지금 그림에 실패가 있다 — 같은 내용의 저장은 다시 시도다")
        if (!patch) return Outcome.Compile("인터랙티브 중이다 — 저장마다 처음부터 그린다(D-11)")
        patchAll(plans)?.let { return it }
        for ((path, plan) in plans) known[path] = Known(texts.getValue(path)!!, known.getValue(path).owner, plan.sites, epoch)
        val n = plans.values.sumOf { it.values.size }
        return Outcome.Patched(CompileResult(true, CompileResult.LITERALS, "리터럴 ${n}개를 컴파일 없이 바꿨다", (System.nanoTime() - t) / 1_000_000, texts.keys.toList()))
    }

    private fun plan(texts: Map<String, String?>, plans: MutableMap<String, LiteralPolicy.Plan.Patch>): Outcome.Compile? {
        for ((path, text) in texts) {
            val k = known[path] ?: return Outcome.Compile("이 내용으로 그린 적이 없다")
            text ?: return Outcome.Compile("읽지 못했거나 CR · BOM이 있다")
            if (k.epoch != epoch) return Outcome.Compile("그 뒤 다른 컴파일이 있었다 — 이 파일에 들어온 다른 파일의 값이 낡았을 수 있다")
            when (val plan = LiteralPolicy.plan(k.text, text, k.sites, taken(k, path, texts.keys))) {
                LiteralPolicy.Plan.Same -> {}
                is LiteralPolicy.Plan.Compile -> return Outcome.Compile(plan.why, plan.routine)
                is LiteralPolicy.Plan.Patch -> plans[path] = plan
            }
        }
        return null
    }

    private fun taken(k: Known, path: String, batch: Set<String>): Set<String> =
        enabled.filterKeys { it != k.owner }.values.flatten().toHashSet()
            .apply { batch.filter { it != path }.forEach { p -> known[p]?.sites?.forEach { add(it.key) } } }

    private suspend fun patchAll(plans: Map<String, LiteralPolicy.Plan.Patch>): Outcome.Compile? {
        for ((path, plan) in plans) {
            val k = known.getValue(path)
            val owner = k.owner ?: return Outcome.Compile("LiveLiterals 클래스가 없다", routine = false)
            if (!engine.patchLiterals(owner, plan.values)) return Outcome.Compile("렌더러에 값을 넣지 못했다", routine = false)
            enabled[owner] = k.sites.mapTo(HashSet()) { it.key }
        }
        return null
    }

    suspend fun compiled(c: CompileResult, before: Map<String, String?>) {
        epoch++
        val tables = c.literals.associateBy { it.file }
        val drop = ArrayList<String>()
        val now = read(c.files.map(::File))
        for (path in c.files) {
            known.remove(path)?.owner?.let(drop::add)
            val table = tables[path]
            table?.owner?.let(drop::add)
            val text = before[path] ?: continue
            if (now[path] != text) continue
            known[path] = Known(text, table?.owner, table?.sites.orEmpty(), epoch)
        }
        drop(drop)
    }

    suspend fun failed(files: List<File>, passed: List<CompileResult>) {
        epoch++
        val republished = passed.flatMap { it.files }.toSet()
        drop(files.mapNotNull { f -> known.remove(f.absolutePath)?.takeIf { f.absolutePath in republished }?.owner })
    }

    suspend fun externalBuild(cleared: Collection<String>) {
        epoch++
        val gone = known.keys.filter { ws.graph.ownerOf(File(it)) in cleared }
        drop(gone.mapNotNull { known.remove(it)?.owner })
    }

    private suspend fun drop(owners: List<String>) {
        if (owners.isEmpty()) return
        owners.forEach(enabled::remove)
        engine.dropLiterals(owners.distinct())
    }
}
