"""린트 규칙이 심은 위반을 잡고 지켜진 모양은 놓아주는지 — tools/lint.sh 가 판정 전에 먼저 돌린다."""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "tools", "lint"))
import kotlin_source  # noqa: E402
import lint  # noqa: E402
import slop  # noqa: E402

DOMAIN = "plugin/src/main/kotlin/prevue/daemon/domain/A.kt"
ADAPTER = "plugin/src/main/kotlin/prevue/daemon/adapter/render/A.kt"


def rules(text, path=ADAPTER):
    return [r for _, r, _ in slop.check(text, path)]


class Mask(unittest.TestCase):
    def test_문자열과_주석을_가리고_자리는_그대로다(self):
        text = 'val a = "x // y ${f("z")} w" // 꼬리\n/* 둘\n째 */ val b = """r "q" s"""\n'
        code, comments = kotlin_source.mask(text)
        self.assertEqual(len(code), len(text))
        self.assertNotIn("//", code)
        self.assertIn('f("', code)
        self.assertNotIn("q", code)
        self.assertEqual(comments, {1, 2, 3})


class Slop(unittest.TestCase):
    def test_domain_의_스레드(self):
        self.assertEqual(rules("fun f() { Thread.sleep(50) }", DOMAIN), ["slop/domain-blocking"])
        self.assertEqual(rules("fun f() = runBlocking { }", DOMAIN), ["slop/domain-blocking"])
        self.assertEqual(rules("val x: CompletableFuture<Int>? = null", DOMAIN), ["slop/domain-blocking"])
        self.assertEqual(rules("fun f() { Thread.sleep(50) }", ADAPTER), [])
        self.assertEqual(rules('fun f() { delay(50) } // Thread.sleep 은 쓰지 않는다', DOMAIN), [])

    def test_버린_renameTo(self):
        self.assertEqual(rules("fun f() {\n    tmp.renameTo(out)\n}"), ["slop/ignored-rename"])
        self.assertEqual(rules("fun f() {\n    if (!tmp.renameTo(out)) error(\"x\")\n}"), [])
        self.assertEqual(rules("fun f() {\n    val ok = tmp.renameTo(out)\n}"), [])
        self.assertEqual(rules("fun f() = tmp.renameTo(out)"), [])

    def test_꼬리_없는_runCatching(self):
        self.assertEqual(rules("fun f() {\n    runCatching { close() }\n}"), ["slop/bare-runCatching"])
        self.assertEqual(rules("fun f() {\n    runCatching { close() }.getOrNull()\n}"), ["slop/bare-runCatching"])
        self.assertEqual(rules("fun f() {\n    runCatching { close() }\n        .onFailure { log(it) }\n}"), [])
        self.assertEqual(rules("fun f() {\n    val r = runCatching { close() }\n}"), [])
        self.assertEqual(rules("fun f() = g(\n    runCatching { x }.getOrNull(),\n)"), [])

    def test_줄_중간의_runCatching_도_문장이면_잡는다(self):
        self.assertEqual(rules("fun f() {\n    listeners.forEach { runCatching { it(ev) } }\n}"), ["slop/bare-runCatching"])
        self.assertEqual(rules("fun f() {\n    for (x in xs) runCatching { x.close() }\n}"), ["slop/bare-runCatching"])
        self.assertEqual(rules("fun f() {\n    if (a) { runCatching { x.close() }; return }\n}"), ["slop/bare-runCatching"])
        self.assertEqual(rules("fun f() = if (a) b else runCatching { c() }.getOrNull()"), [])
        self.assertEqual(rules("fun f() = xs.map { runCatching { it.c() } }"), [])

    def test_synchronized_this(self):
        self.assertEqual(rules("fun f() { synchronized(this) { } }"), ["slop/synchronized-this"])
        self.assertEqual(rules("fun f() { synchronized(lock) { } }"), [])

    def test_로캘_없는_format(self):
        self.assertEqual(rules('val s = "%.2f".format(x)'), ["slop/format-locale"])
        self.assertEqual(rules('val s = String.format("%d", x)'), ["slop/format-locale"])
        self.assertEqual(rules('val s = "%,d".format(x)'), ["slop/format-locale"])
        self.assertEqual(rules('val s = "%.2f".format(Locale.ROOT, x)'), [])
        self.assertEqual(rules('val s = String.format(Locale.ROOT, "%.2f", x)'), [])
        self.assertEqual(rules('val s = "%04x".format(c)'), [])

    def test_빈_catch(self):
        self.assertEqual(rules("fun f() { try { g() } catch (_: E) {} }"), ["slop/empty-catch"])
        self.assertEqual(rules("fun f() {\n    try { g() } catch (_: E) {\n    }\n}"), ["slop/empty-catch"])
        self.assertEqual(rules("fun f() { try { g() } catch (_: E) {}   // 이미 알렸다\n}"), [])
        self.assertEqual(rules("fun f() { try { g() } catch (e: E) { log(e) } }"), [])

    def test_문자열_when_의_말없는_else(self):
        bad = 'fun f(type: String) {\n    when (type) {\n        "press" -> press()\n        else -> { press(); release() }\n    }\n}'
        self.assertEqual(rules(bad), ["slop/when-else-default"])
        for ok in ('else -> error("모른다: $type")', 'else -> null', 'else -> ex.json(404, "no intent $type")', 'else -> throw E()'):
            self.assertEqual(rules(bad.replace("else -> { press(); release() }", ok)), [], ok)
        self.assertEqual(rules("fun f(n: Int) = when (n) {\n    1 -> a()\n    else -> b()\n}"), [])

    def test_파일_길이(self):
        self.assertEqual(rules("val x = 1\n" * 401), ["slop/file-length"])
        self.assertEqual(rules("val x = 1\n" * 400), [])


class Comments(unittest.TestCase):
    def comments(self, text, changed, old=""):
        src = lint.Source.__new__(lint.Source)
        src.path, src.text = ADAPTER, text
        _, src.comment_lines = kotlin_source.mask(text)
        return [f.line for f in lint.new_comments({ADAPTER: src}, {ADAPTER: changed}, lambda path: old)]

    def test_옆_코드만_고친_줄의_주석은_새_주석이_아니다(self):
        old = "val a = f(1)   // 기존 이유\n"
        self.assertEqual(self.comments("val a = f(2)   // 기존 이유\n", {1}, old), [])
        self.assertEqual(self.comments("val a = f(2)   // 고친 이유\n", {1}, old), [1])

    def test_문자_리터럴_뒤_줄바꿈이_주석_줄을_밀지_않는다(self):
        self.assertEqual(kotlin_source.mask("val c = 'x\nval d = 1 // 끝\n")[1], {2})

    def test_더한_주석은_실패다(self):
        text = "// 머리\nval a = 1 // 꼬리\n/** 문서 */\nval b = 2\n"
        self.assertEqual(self.comments(text, {1, 2, 3, 4}), [1, 2, 3])
        self.assertEqual(self.comments(text, {4}), [])

    def test_옮긴_파일은_옛_경로와_대조한다(self):
        out = "R097\tplugin/src/main/kotlin/a/Old.kt\tplugin/src/main/kotlin/b/New.kt\nM\tplugin/src/main/kotlin/c/C.kt\nA\tplugin/src/main/kotlin/d/D.kt\n"
        self.assertEqual(lint.renames(out), {"plugin/src/main/kotlin/b/New.kt": "plugin/src/main/kotlin/a/Old.kt"})

    def test_rename_으로_안_잡힌_이동은_파일_이름으로_짝짓는다(self):
        out = ("D\tplugin/src/main/kotlin/usecase/Shot.kt\nA\tplugin/src/main/kotlin/domain/runtime/Shot.kt\n"
               "D\tplugin/src/main/kotlin/usecase/Gone.kt\nA\tplugin/src/main/kotlin/c/Fresh.kt\n"
               "D\tplugin/src/main/kotlin/a/Twin.kt\nD\tplugin/src/main/kotlin/b/Twin.kt\nA\tplugin/src/main/kotlin/c/Twin.kt\n")
        self.assertEqual(lint.renames(out), {"plugin/src/main/kotlin/domain/runtime/Shot.kt": "plugin/src/main/kotlin/usecase/Shot.kt"})

    def test_외부_표지는_한_줄만_통과한다(self):
        self.assertEqual(self.comments("// 외부: layoutlib 17 은 X 를 안 준다\nval a = 1\n", {1, 2}), [])
        self.assertEqual(self.comments("// 외부: 첫 줄\n// 이어지는 줄\nval a = 1\n", {1, 2, 3}), [1, 2])
        self.assertEqual(self.comments('val u = "http://x" // 외부: 코드 뒤 꼬리도 한 줄이면 된다\n', {1}), [])
        self.assertEqual(self.comments('val u = "http://x" // 외부 사실이 아니다\n', {1}), [1])


if __name__ == "__main__":
    unittest.main()
