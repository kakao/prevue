"""린트 규칙이 심은 위반을 잡고 지켜진 모양은 놓아주는지 — tools/lint.sh 가 판정 전에 먼저 돌린다."""

import os
import sys
import unittest

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "tools", "lint"))
import kotlin_source  # noqa: E402
import lint  # noqa: E402
import slop  # noqa: E402

DOMAIN = "plugin/daemon/application/src/main/kotlin/prevue/application/service/A.kt"
ADAPTER = "plugin/daemon/infrastructure/src/main/kotlin/prevue/infrastructure/render/A.kt"


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
        out = "R097\tplugin/daemon/src/main/kotlin/a/Old.kt\tplugin/daemon/src/main/kotlin/b/New.kt\nM\tplugin/daemon/src/main/kotlin/c/C.kt\nA\tplugin/daemon/src/main/kotlin/d/D.kt\n"
        self.assertEqual(lint.renames(out), {"plugin/daemon/src/main/kotlin/b/New.kt": "plugin/daemon/src/main/kotlin/a/Old.kt"})

    def test_rename_으로_안_잡힌_이동은_파일_이름으로_짝짓는다(self):
        out = ("D\tplugin/daemon/app/src/main/kotlin/usecase/Shot.kt\nA\tplugin/daemon/daemon/src/main/kotlin/domain/runtime/Shot.kt\n"
               "D\tplugin/daemon/app/src/main/kotlin/usecase/Gone.kt\nA\tplugin/daemon/daemon/src/main/kotlin/c/Fresh.kt\n"
               "D\tplugin/daemon/app/src/main/kotlin/a/Twin.kt\nD\tplugin/daemon/app/src/main/kotlin/b/Twin.kt\nA\tplugin/daemon/daemon/src/main/kotlin/c/Twin.kt\n")
        self.assertEqual(lint.renames(out), {"plugin/daemon/daemon/src/main/kotlin/domain/runtime/Shot.kt": "plugin/daemon/app/src/main/kotlin/usecase/Shot.kt"})

    def test_plugin_으로_옮기며_고친_파일은_옛_자리와_짝짓는다(self):
        out = "D\tsrc/main/kotlin/a/Moved.kt\nA\tplugin/daemon/daemon/src/main/kotlin/a/Moved.kt\nD\tfixtures/x/Moved2.kt\nA\tplugin/daemon/daemon/src/main/kotlin/b/Moved2.kt\n"
        self.assertEqual(lint.renames(out), {"plugin/daemon/daemon/src/main/kotlin/a/Moved.kt": "src/main/kotlin/a/Moved.kt"})

    def test_daemon_으로_옮기며_고친_파일은_옛_자리와_짝짓는다(self):
        out = "D\tplugin/src/main/kotlin/a/Moved.kt\nA\tplugin/daemon/daemon/src/main/kotlin/a/Moved.kt\n"
        self.assertEqual(lint.renames(out), {"plugin/daemon/daemon/src/main/kotlin/a/Moved.kt": "plugin/src/main/kotlin/a/Moved.kt"})

    def test_조립으로_옮긴_본체와_브리지는_옛_자리와_짝짓는다(self):
        out = ("D\tplugin/daemon/src/main/kotlin/prevue/daemon/Main.kt\nA\tplugin/daemon/daemon/src/main/kotlin/prevue/daemon/Main.kt\n"
               "D\tplugin/daemon/src/bridge/kotlin/prevue/compiler/B.kt\nA\tplugin/daemon/daemon/src/bridge/kotlin/prevue/compiler/B.kt\n")
        self.assertEqual(lint.renames(out), {
            "plugin/daemon/daemon/src/main/kotlin/prevue/daemon/Main.kt": "plugin/daemon/src/main/kotlin/prevue/daemon/Main.kt",
            "plugin/daemon/daemon/src/bridge/kotlin/prevue/compiler/B.kt": "plugin/daemon/src/bridge/kotlin/prevue/compiler/B.kt"})
        self.assertTrue(lint.in_scope("plugin/daemon/daemon/src/main/kotlin/prevue/daemon/Main.kt"))
        self.assertFalse(lint.in_scope("plugin/daemon/daemon/src/test/kotlin/prevue/daemon/A.kt"))
        self.assertFalse(lint.in_scope("plugin/daemon/app/src/main/kotlin/prevue/daemon/Main.kt"))

    def test_층_모듈의_본체도_범위다(self):
        for m, pkg in (("application", "application/service"), ("infrastructure", "infrastructure/controller/http")):
            self.assertTrue(lint.in_scope("plugin/daemon/%s/src/main/kotlin/prevue/%s/A.kt" % (m, pkg)), m)
        self.assertFalse(lint.in_scope("plugin/daemon/application/src/test/kotlin/A.kt"))
        self.assertFalse(lint.in_scope("plugin/daemon/domain/src/main/kotlin/prevue/domain/A.kt"))

    def test_층_목록은_gradle_properties_한_줄에서_읽는다(self):
        self.assertEqual(lint.read_layers("# 주석\nprevue.layers=application, adapter/infra\nother=1\n"), ("application", "adapter/infra"))
        # settings 는 java.util.Properties 로 읽는다 — 같은 줄을 같은 값으로 읽어야 넷이 갈리지 않는다
        self.assertEqual(lint.read_layers("  prevue.layers = a,b,\n"), ("a", "b"))
        self.assertEqual(lint.read_layers("prevue.layers:a\nprevue.layers=b\n"), ("b",))
        self.assertEqual(lint.read_layers("prevue.layers a\n"), ("a",))
        for text in ("other=1\n", "# prevue.layers=a\n", "prevue.layers=,\n", "prevue.layersx=a\n"):
            with self.assertRaises(ValueError, msg=text):
                lint.read_layers(text)
        for m in lint.MODULES:
            self.assertTrue(os.path.isdir(os.path.join(ROOT, "plugin/daemon", m, "src/main/kotlin")), m)

    def test_detekt_보고서는_프로젝트_경로로_가른다(self):
        reports = lint.detekt_reports(("a/infra", "b/infra"))
        self.assertIn("plugin/daemon/build/lint/a/infra/reports/detekt/main.xml", reports)
        self.assertIn("plugin/daemon/build/lint/b/infra/reports/detekt/main.xml", reports)
        self.assertEqual(len(reports), len(set(reports)))

    def test_헥사고날로_옮긴_파일은_옛_자리와_짝짓는다(self):
        for old, new in (("entity/src/main/kotlin/prevue/entity/Bitmap.kt", "application/src/main/kotlin/prevue/application/domain/model/Bitmap.kt"),
                         ("adapter/entry/src/main/kotlin/prevue/adapter/http/Server.kt", "infrastructure/src/main/kotlin/prevue/infrastructure/controller/http/Server.kt"),
                         ("app/src/bridge/kotlin/prevue/compiler/B.kt", "daemon/src/bridge/kotlin/prevue/compiler/B.kt")):
            old, new = "plugin/daemon/" + old, "plugin/daemon/" + new
            self.assertEqual(lint.renames("R098\t%s\t%s\n" % (old, new)), {new: old})
            self.assertEqual(lint.renames("D\t%s\nA\t%s\n" % (old, new)), {new: old})
            self.assertTrue(old.startswith(lint.OLD_ROOTS))

    def test_adapter_를_둘로_가르며_옮긴_파일은_옛_자리와_짝짓는다(self):
        old = "plugin/daemon/adapter/src/main/kotlin/prevue/adapter/render/A.kt"
        new = "plugin/daemon/infrastructure/src/main/kotlin/prevue/infrastructure/render/A.kt"
        self.assertEqual(lint.renames("R100\t%s\t%s\n" % (old, new)), {new: old})
        self.assertTrue(old.startswith(lint.OLD_ROOTS))

    def test_층_모듈로_옮긴_파일은_옛_자리와_짝짓는다(self):
        out = "R100\tplugin/daemon/src/main/kotlin/prevue/daemon/domain/A.kt\tplugin/daemon/application/src/main/kotlin/prevue/daemon/domain/A.kt\n"
        self.assertEqual(lint.renames(out), {"plugin/daemon/application/src/main/kotlin/prevue/daemon/domain/A.kt": "plugin/daemon/src/main/kotlin/prevue/daemon/domain/A.kt"})

    def test_외부_표지는_한_줄만_통과한다(self):
        self.assertEqual(self.comments("// 외부: layoutlib 17 은 X 를 안 준다\nval a = 1\n", {1, 2}), [])
        self.assertEqual(self.comments("// 외부: 첫 줄\n// 이어지는 줄\nval a = 1\n", {1, 2, 3}), [1, 2])
        self.assertEqual(self.comments('val u = "http://x" // 외부: 코드 뒤 꼬리도 한 줄이면 된다\n', {1}), [])
        self.assertEqual(self.comments('val u = "http://x" // 외부 사실이 아니다\n', {1}), [1])


if __name__ == "__main__":
    unittest.main()
