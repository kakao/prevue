package prevue.daemon.adapter.dump

import java.io.File
import prevue.daemon.entity.ModuleGraph
import prevue.daemon.entity.ModuleNode

/**
 * 렌더 모듈([home])과 그 프로젝트 의존을 감시·컴파일 단위로(Q5). 의존 모듈의 인자는 [base](앱 덤프, 없으면 [home])에서 끌어낸다(Q4).
 * 의존 먼저 — 클래스패스 순서(소비자 먼저)를 뒤집는다.
 */
object WatchGraph {
    fun of(home: ClasspathSpec, base: ClasspathSpec): ModuleGraph {
        val deps = home.projectModules.reversed().mapNotNull { m ->
            runCatching { base.dependency(m) }.recoverCatching { home.dependency(m) }.getOrNull()
        }
        return ModuleGraph(home.project, deps.map { node(it, home.rClassJars) }.filter { it.sourceRoots.isNotEmpty() } + node(home, home.rClassJars))
    }

    /**
     * 렌더러가 앱 클래스패스면(D-38) 앱이 담은 모듈 전부와 앱 자신 — 어느 모듈을 `show`해도 데몬을 다시 띄우지 않는다(기준 3).
     * 덤프에는 모듈 사이 의존이 없어 `show`한 모듈의 의존만 골라 감시할 수 없다 — 앱 전부를 본다(사용자 2026-10-03, Q5 고침).
     */
    fun ofApp(home: ClasspathSpec, app: ClasspathSpec): ModuleGraph {
        val skip = (home.rClassJars + app.rClassJars).toSet()
        val mods = app.projectModules.reversed().mapNotNull { m ->
            if (m == home.project) home else runCatching { app.dependency(m) }.getOrNull()
        }
        val nodes = (mods + app).map { node(it, skip) }.filter { it.sourceRoots.isNotEmpty() || it.path == home.project }
        return ModuleGraph(home.project, if (nodes.any { it.path == home.project }) nodes else nodes + node(home, skip))
    }

    private fun node(s: ClasspathSpec, skip: Collection<String>) = ModuleNode(
        s.project, s.sourceRoots.map { it.canonicalFile },
        s.ownClassPath.filter { it !in skip }.map { File(it) },
        runCatching { s.kotlinModuleName }.getOrNull(),
        s.resourceRoots.map { it.canonicalFile },
    )
}
