package prevue.daemon.domain.runtime

import java.io.File
import prevue.daemon.domain.port.CompileResult
import prevue.daemon.domain.port.FailureKind
import prevue.daemon.entity.PreviewSpec
import prevue.daemon.domain.port.RenderOutput
import prevue.daemon.domain.model.Work
import prevue.daemon.entity.lines
import prevue.daemon.entity.phrase
import prevue.daemon.domain.policy.CompileOrder
import prevue.daemon.domain.policy.FreshnessPolicy
import prevue.daemon.domain.policy.LinkagePolicy
import prevue.daemon.domain.port.Compiler
import prevue.daemon.domain.port.SourceFileRepository

/**
 * 모듈마다 컴파일하기 · 함께 실을 파일 고르기 · 옛 호출자 고치기. 유스케이스가 아니다 — 저장 · 열기 · 카드 그리기가 **줄 안에서** 함께 쓴다([LiveShot]과 같다).
 */
class StaleCallers(
    private val ws: Workspace,
    private val engine: EngineActor,
    private val compiler: Compiler,
    private val literals: LiteralPatches,
    private val sources: SourceFileRepository,
) {
    /**
     * 모듈마다 그 모듈의 인자로, 의존 먼저([CompileOrder]). 결과는 한 번의 컴파일처럼 합쳐 낸다 — 하나라도 실패하면 실패다.
     * 컴파일은 모두 여기를 지나므로 리터럴 빠른 경로의 기준(D-67)도 여기서 맞춘다. [before]는 컴파일 **전**에 읽은 내용이다.
     */
    suspend fun compileAll(files: List<File>, before: Map<String, String?> = literals.read(files)): CompileResult {
        val (passed, failed) = CompileOrder.run(CompileOrder.groups(ws.graph, files), CompileResult::ok) { m, fs -> compiler.compile(m, fs) }
        val all = passed + failed
        val hint = failed.firstNotNullOfOrNull(CompileOrder::hint)
        val c = if (all.size == 1) all[0].copy(hint = hint) else CompileResult(failed.isEmpty(), failed.firstOrNull()?.exitCode ?: "OK",
            failed.joinToString("\n") { it.messages }, all.sumOf { it.ms }, all.flatMap { it.files }.distinct(), hint = hint,
            literals = all.flatMap { it.literals })
        if (c.ok) literals.compiled(c, before) else literals.failed(files, passed)
        return c
    }

    /** 실제로 컴파일한 파일들, 컴파일이 읽기 **전**의 그 mtime, 결과. */
    class Batch(val files: List<File>, val seen: Map<String, Long>, val result: CompileResult)

    /**
     * [files]를 아직 컴파일 안 된 새 파일([Workspace.newFiles])과 함께 컴파일한다. 생성은 저장이 아니라(D-56) 새 파일은 누가 싣기 전까지
     * 오버레이에 없다 — 저장한 파일이 그것을 부르면 저장한 파일만 컴파일해서는 `unresolved reference`였다(소스는 멀쩡한데 "고쳐 다시 저장하라"고 답했다).
     * 오류가 함께 실은 새 파일 안에만 났으면 그것을 빼고 한 번 더 한다 — 만들다 만 새 파일 하나가 다른 저장 · 열기를 막지 않게.
     * 오류가 자기 안에 난 새 파일과 Gradle이 이미 구운 새 파일은 목록에서 뺀다. 그 뒤의 수정은 저장으로 온다.
     * [before]는 [files]를 컴파일 **전**에 읽은 내용이다(D-67).
     */
    suspend fun compileWithNew(ed: WorkspaceEditor, files: List<File>, before: Map<String, String?> = literals.read(files)): Batch {
        val asked = files.map { it.canonicalPath }.toSet()
        val (fresh, built) = ws.now.newFiles.filter { it !in asked }.map(::File).filter { it.isFile }
            .partition { FreshnessPolicy.newerThanBuild(it.lastModified(), compiler.builtAt(ws.graph.ownerOf(it))) }
        ed.forgetNew(built)
        // 읽는 사이에 또 저장되면 옛 값이 남아 기다림이 다음 저장을 기다린다.
        val seen = (files + fresh).associate { it.canonicalPath to it.lastModified() }
        val first = files + fresh
        // 리터럴 빠른 경로(D-67)의 기준점은 컴파일 **전**에 읽은 내용이다 — 저장한 파일은 부른 쪽이 이미 읽었다.
        val texts = before + literals.read(fresh)
        val c = compileAll(first, texts)
        if (c.ok) return done(ed, first, seen, c)
        val blamed = FreshnessPolicy.blamed(first.map { it.canonicalPath }, c.messages)
        val broken = fresh.filter { it.canonicalPath in blamed }
        ed.forgetNew(broken)
        val duplicated = FreshnessPolicy.duplicateIn(blamed - broken.map { it.canonicalPath }.toSet(), c.messages)
        if (broken.isEmpty() || (broken.size != blamed.size && !duplicated)) return Batch(first, seen, c)
        val rest = first - broken.toSet()
        val again = compileAll(rest, texts)
        // 다시 해도 실패하면 처음 것을 낸다 — 새 파일 자신의 오류가 진짜 원인을 말한다
        return if (again.ok) done(ed, rest, seen, again) else Batch(first, seen, c)
    }

    suspend fun compileOpening(ed: WorkspaceEditor, files: List<File>): Batch {
        val before = literals.read(files)
        val seen = files.associate { it.canonicalPath to it.lastModified() }
        val alone = compileAll(files, before)
        return if (alone.ok) done(ed, files, seen, alone) else compileWithNew(ed, files, before)
    }

    suspend fun behindBuild(): List<File> =
        sources.sourceFiles().map { it.canonicalFile }.groupBy { ws.graph.ownerOf(it) }.flatMap { (module, files) ->
            val built = compiler.builtAt(module) ?: return@flatMap emptyList()
            files.filter { f -> f.lastModified().let { it > built && ws.now.compiledMtime[f.path]?.first != it } }
        }

    private suspend fun done(ed: WorkspaceEditor, batch: List<File>, seen: Map<String, Long>, c: CompileResult): Batch {
        ed.forgetNew(batch)
        val keys = batch.map { it.canonicalPath }.toSet()
        return Batch(batch, seen.filterKeys { it in keys }, c)
    }

    /** [f]를 열기 전에 컴파일해야 하나 — 새 파일이거나 [FreshnessPolicy.compileOnOpen]. */
    suspend fun dueOnOpen(f: File, previewClasses: () -> Collection<String>): Boolean {
        val c = f.canonicalFile
        val module = ws.graph.ownerOf(c)
        return c.path in ws.now.newFiles ||
            FreshnessPolicy.compileOnOpen(c.lastModified(), ws.now.compiledMtime[c.path], compiler.builtAt(module)) {
                previewClasses().all { compiler.hasClass(module, it) }
            }
    }

    /**
     * 1단계 잔여. 렌더가 없는 멤버로 실패했고 그 클래스가 우리가 오버레이에 넣은 것이면([LinkagePolicy]) 감시하는 모듈 전부에서 호출자를 찾아
     * 각자 자기 모듈의 인자로, 의존 먼저 함께 컴파일하고 다시 그린다(Q7). 고치지 못하면 최소한 `LINKAGE`로 이름 붙여 무엇을 하라고 말한다 —
     * 그대로 두면 사람에게는 '렌더 예외'와 `View measure failed` 벽으로만 보인다. 한 겹만 따라간다 — 호출자의 호출자까지 번지면 그때는 Gradle이 맞다.
     *
     * 저장 직후의 포커스만이 아니라 보드의 카드도 여기를 지난다 — 바뀐 함수를 포커스가 안 부르고 다른 카드만 부르면 거기서 처음 드러난다.
     * [changed]는 함께 다시 컴파일할 파일이다. 카드에서는 비어 있다 — 바뀐 파일은 이미 오버레이에 있다.
     */
    suspend fun repair(ed: WorkspaceEditor, out: RenderOutput, p: PreviewSpec, changed: List<File>): RenderOutput {
        val (owner, member) = LinkagePolicy.missingMember(out) ?: return out
        if (!compiler.inOverlay(owner)) return out         // 앱 자신의 링크 에러다 — 우리가 만든 것이 아니다
        val scan = System.nanoTime()
        val callers = compiler.callersOf(member, changed, ws.graph.roots)
        val scanMs = (System.nanoTime() - scan) / 1_000_000
        if (callers.isEmpty()) return out.copy(
            failure = FailureKind.LINKAGE,
            message = lines(phrase("linkage.noCallers", "member" to member), out.message),
        )
        val before = ws.now.work
        ed.update { it.copy(work = Work.Compiling(callers, "linkage")) }
        println("[prevue] 옛 호출자 ${callers.size}개를 ${scanMs}ms에 찾았다: ${callers.joinToString { it.name }}")
        val c = compileAll(changed + callers)
        ed.update { it.copy(work = before) }
        if (c.ok) engine.codeChanged()
        val names = callers.joinToString(", ") { it.name }
        val rerunGradle = phrase("linkage.rerunGradle")
        if (!c.ok) return out.copy(
            failure = FailureKind.LINKAGE,
            message = lines(phrase("linkage.compileFailed", "member" to member, "names" to names, "hint" to (c.hint ?: rerunGradle)), c.messages),
        )
        val again = engine.show(p, ws.now.interactive)
        if (again.ok) return again
        return again.copy(
            failure = FailureKind.LINKAGE,
            message = lines(phrase("linkage.persisted", "member" to member, "names" to names), again.message),
        )
    }
}
