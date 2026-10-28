package prevue.daemon.entity

import java.io.File

/**
 * 모듈 하나 — 저장한 파일과 밖에서 다시 빌드된 산출물이 어느 모듈의 것인지 가르는 단위. 경로는 정규화돼 있다.
 * [resRoots]는 이 변형이 싣는 소스 세트의 `res` 루트들이다(D-68 — values는 저장하면 값만 바꿔 넣는다).
 */
data class ModuleNode(
    val path: String, val sourceRoots: List<File>, val outputs: List<File>, val kotlinModule: String? = null,
    val resRoots: List<File> = emptyList(),
)

/**
 * 한 데몬이 감시·컴파일하는 모듈들 — 렌더 모듈([home])과 그 프로젝트 의존(Q5). **의존 먼저** 순서다(Q7).
 * 의존 관계는 덤프에 없어 클래스패스 순서(소비자 먼저)를 뒤집어 근사한다 — 틀리면 컴파일이 한 번 더 돈다(`CompileOrder`).
 */
class ModuleGraph(val home: String, val nodes: List<ModuleNode>) {
    init { require(nodes.any { it.path == home }) { "$home 이 모듈 목록에 없다" } }

    val roots: List<File> get() = nodes.flatMap { it.sourceRoots }

    /** D-68. 감시하는 모듈들의 `values*` 디렉터리 — 리소스 값 핫리로드가 보는 곳이다. 다른 `res`(drawable · layout)는 낡음으로 남는다. */
    val valueDirs: List<File> get() = nodes.flatMap { it.resRoots }.flatMap { root ->
        root.listFiles { f -> f.isDirectory && f.name.startsWith("values") }.orEmpty().sortedBy { it.name }
    }

    /** 파일을 가진 모듈. 소스 루트 밖(`--watch`로 더한 복사본)은 [home]이 갖는다 — 늘 그 모듈의 인자로 컴파일해 왔다. */
    fun ownerOf(f: File): String =
        nodes.firstOrNull { n -> n.sourceRoots.any { f.path.startsWith(it.path + "/") } }?.path ?: home

    /** 이 그래프의 소스 루트 안의 파일인가 — 밖이면 다른 앱(다른 데몬)의 파일이다(D-50). */
    fun contains(f: File): Boolean = nodes.any { n -> n.sourceRoots.any { f.path.startsWith(it.path + "/") } }

    /** 산출물이 다시 빌드된 모듈들(Q6). 그 모듈의 오버레이만 낡았다. */
    fun builtBy(outputs: List<File>): List<String> =
        nodes.filter { n -> outputs.any { it in n.outputs } }.map { it.path }

    fun node(module: String): ModuleNode? = nodes.firstOrNull { it.path == module }

    fun order(module: String): Int = nodes.indexOfFirst { it.path == module }.let { if (it < 0) nodes.size else it }

    companion object {
        /** 모듈 하나짜리 — 테스트와 의존을 모를 때. */
        fun single(path: String, sourceRoots: List<File>, outputs: List<File>) = ModuleGraph(path, listOf(ModuleNode(path, sourceRoots, outputs)))
    }
}
