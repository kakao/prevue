package prevue.daemon.adapter.process

import java.io.File

/** 폴더를 파일 관리자에서 연다(헤더 폴더 팝오버). 대상은 데몬이 정한 경로뿐이다 — 뷰어가 경로를 보내지 않는다. */
object Reveal {
    fun open(dir: File) {
        val mac = System.getProperty("os.name").orEmpty().startsWith("Mac")
        val cmd = if (mac) listOf("open", "-R", dir.absolutePath) else listOf("xdg-open", dir.absolutePath)
        ProcessBuilder(cmd).redirectErrorStream(true).redirectOutput(ProcessBuilder.Redirect.DISCARD).start()
    }
}
