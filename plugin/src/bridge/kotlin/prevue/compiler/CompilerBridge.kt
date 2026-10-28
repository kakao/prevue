// 상주 컴파일러 브리지. 격리된 클래스로더에 kotlin-compiler-embeddable과 함께 올라가고,
// 데몬은 JDK 타입만으로 이 정적 메서드를 리플렉션으로 부른다 — 컴파일러의 클래스가 렌더러 쪽으로 새지 않게 하기 위해서다.
package prevue.compiler

import org.jetbrains.kotlin.cli.jvm.K2JVMCompiler
import java.io.ByteArrayOutputStream
import java.io.PrintStream

object CompilerBridge {
    private val compiler = K2JVMCompiler()

    /** 첫 줄은 ExitCode 이름, 이후는 컴파일러 메시지(오류·경고)다. */
    @JvmStatic
    fun compile(args: Array<String>): String {
        val buf = ByteArrayOutputStream()
        val exit = PrintStream(buf, true, "UTF-8").use { out -> compiler.exec(out, *args) }
        return exit.name + "\n" + buf.toString("UTF-8")
    }
}
