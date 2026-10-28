"""뷰어 날값 린트가 심은 위반을 잡고 지켜진 모양은 놓아주는지 — tools/lint.sh 가 판정 전에 먼저 돌린다."""

import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "tools", "lint"))
import viewer  # noqa: E402


def css(text):
    return [rule for _, rule, _ in viewer.css_findings(text)]


def decl(body, selector=".a"):
    return css("%s { %s }" % (selector, body))


def js(text):
    return [rule for _, rule, _ in viewer.js_findings(text)]


class Color(unittest.TestCase):
    def test_날색(self):
        for bad in ("color: #fff", "background: #1f232880", "border: 1px solid red", "color: rgb(0 0 0 / .5)",
                    "background: linear-gradient(white, var(--surface))", "fill: hsl(0 0% 0%)",
                    "background: color-mix(in srgb, var(--pick) 50%, transparent)", "box-shadow: var(--x, 0 0 0 1px #000)"):
            self.assertIn("viewer/raw-color", decl(bad), bad)

    def test_토큰_투명_현재색은_둔다(self):
        for ok in ("color: var(--on-surface)", "background: transparent", "fill: currentColor", "border-color: inherit",
                   "mask: url(#fade)", "background: linear-gradient(var(--error-container) 0 0), var(--surface)",
                   "white-space: nowrap", "animation-name: wait"):
            self.assertEqual(decl(ok), [], ok)

    def test_그림_블록_안에서도_색은_본다(self):
        art = "/* 그림 시작 — 시험 */\n.a { color: #fff; background: var(--art-bg); }\n/* 그림 끝 */"
        self.assertEqual(css(art), ["viewer/raw-color"])


class Type(unittest.TestCase):
    def test_글자_날값(self):
        for bad in ("font: 600 14px/1.5 sans-serif", "font-size: 13px", "font-weight: 700", "font-weight: bold",
                    "line-height: 18px", "line-height: 1.45", "letter-spacing: .01em", "font-family: Menlo, monospace"):
            self.assertEqual(decl(bad), ["viewer/raw-type"], bad)

    def test_역할_한_줄과_굵기_토큰은_둔다(self):
        for ok in ("font: var(--type-body-medium)", "font: inherit", "font-weight: var(--weight-semibold)",
                   "font-family: var(--font-mono)", "line-height: 0", "letter-spacing: normal", "font-variant-numeric: tabular-nums"):
            self.assertEqual(decl(ok), [], ok)


class Corner(unittest.TestCase):
    def test_모서리_날값(self):
        for bad in ("border-radius: 6.3px", "border-top-left-radius: 2px", "border-radius: 50%", "border-radius: 0 0 4px 4px",
                    "border-radius: calc(var(--corner-small) * 3)"):
            self.assertEqual(decl(bad), ["viewer/raw-corner"], bad)

    def test_모서리_토큰은_둔다(self):
        for ok in ("border-radius: var(--corner-medium)", "border-radius: 0", "border-radius: inherit",
                   "border-radius: 0 0 var(--corner-large) var(--corner-large)", "border-radius: var(--board-radius, var(--corner-medium))"):
            self.assertEqual(decl(ok), [], ok)


class Shadow(unittest.TestCase):
    def test_그림자_날값(self):
        for bad in ("box-shadow: 0 2px 4px var(--outline)", "box-shadow: var(--elevation-1), 0 8px 24px -4px var(--scrim)",
                    "text-shadow: 0 1px 0 var(--surface)", "filter: drop-shadow(0 1px 2px var(--scrim))"):
            self.assertEqual(decl(bad), ["viewer/raw-shadow"], bad)

    def test_단계와_고리는_둔다(self):
        for ok in ("box-shadow: var(--elevation-2)", "box-shadow: 0 0 0 2px var(--live), var(--elevation-2)",
                   "box-shadow: inset 0 0 0 .5px var(--outline-variant)", "box-shadow: none", "filter: var(--elevation-2-filter)",
                   "filter: grayscale(.6)", "box-shadow: var(--board-shadow, none)"):
            self.assertEqual(decl(ok), [], ok)


class Motion(unittest.TestCase):
    def test_시간_이징_날값(self):
        for bad in ("transition: opacity 200ms", "animation: spin .9s linear infinite", "transition-duration: .3s",
                    "animation-delay: 40ms", "transition-timing-function: ease-in-out", "animation: wait var(--duration-short4) ease infinite",
                    "transition: transform var(--duration-short4) cubic-bezier(.2, 0, 0, 1)",
                    "animation-delay: calc(80ms + var(--i, 0) * 20ms)", "transition: opacity var(--fade, 520ms)",
                    "animation: sweep calc(var(--duration-long4) * 2) var(--easing-standard) infinite",
                    "transition: opacity calc(var(--duration-short1) * 7) var(--easing-standard)"):
            self.assertEqual(decl(bad), ["viewer/raw-motion"], bad)

    def test_토큰_0초_linear_배수는_둔다(self):
        for ok in ("transition: opacity var(--duration-short4) var(--easing-standard), visibility 0s linear var(--duration-short4)",
                   "transition-delay: 0s", "animation: spin var(--duration-extra-long3) linear infinite", "animation: none",
                   "animation-delay: calc(var(--motion-stagger) * (4 + var(--i, 0)))",
                   "animation: wait var(--duration-extra-long2) var(--easing-standard) infinite alternate"):
            self.assertEqual(decl(ok), [], ok)


class Space(unittest.TestCase):
    def test_간격_날값(self):
        for bad in ("padding: 12px", "margin: 0 -4px", "gap: 2px 16px", "margin-right: .4em", "padding: calc(var(--x) + 16px)",
                    "row-gap: 6px", "padding-inline: 1rem", "padding: calc(var(--space-8) * 2)", "gap: calc(var(--space-4) / 2)"):
            self.assertEqual(decl(bad), ["viewer/raw-space"], bad)

    def test_단계_0_auto_비율은_둔다(self):
        for ok in ("padding: var(--space-8)", "margin: 0 auto", "gap: 0", "margin: calc(var(--space-4) * -1)",
                   "padding-left: 50%", "gap: var(--space-4) var(--space-12)", "padding: calc(var(--space-8) + var(--space-4))"):
            self.assertEqual(decl(ok), [], ok)

    def test_배치_치수는_막지_않는다(self):
        for ok in ("width: 320px", "top: calc(100% + 8px)", "height: 28px", "inset: -60px 0 auto", "border: 1.5px solid var(--outline)",
                   "outline-offset: 3px", "min-width: 150px", "transform: translateY(-50%) scale(1.025)",
                   "scroll-margin: calc(var(--bar-h) + 56px) 0 16px"):
            self.assertEqual(decl(ok), [], ok)


class Tokens(unittest.TestCase):
    def test_원시값을_바로_쓰면_실패다(self):
        self.assertEqual(decl("color: var(--gray-light-9)"), ["viewer/primitive"])
        self.assertEqual(decl("background: var(--blue-dark-muted)"), ["viewer/primitive"])
        self.assertEqual(decl("font-size: var(--size-14)"), ["viewer/primitive"])

    def test_굵기_서체_간격_단계는_둔다(self):
        self.assertEqual(decl("font-weight: var(--weight-medium); font-family: var(--font-sans); gap: var(--space-8)"), [])

    def test_그림_토큰은_그림_블록_밖에서_실패다(self):
        self.assertEqual(decl("color: var(--art-ink)"), ["viewer/art-token"])
        self.assertEqual(decl("background: var(--device-body)"), ["viewer/art-token"])
        self.assertEqual(decl("color: var(--on-avatar)"), ["viewer/art-token"])


class ArtBlock(unittest.TestCase):
    def test_그림_블록은_색만_본다(self):
        art = ("/* 그림 시작 — 시험 */\n.p { border-radius: 21px; transition: opacity 900ms; font-size: calc(var(--w) * .069);"
               " margin: -7px; color: var(--art-ink); box-shadow: 0 12px 28px -18px var(--art-shape-shadow); }\n/* 그림 끝 */\n"
               ".q { border-radius: 21px; }")
        self.assertEqual(css(art), ["viewer/raw-corner"])

    def test_짝이_안_맞으면_실패다(self):
        self.assertEqual(css("/* 그림 시작 */ .p { color: var(--art-ink); }"), ["viewer/art-marker", "viewer/art-token"])
        self.assertEqual(css(".p { color: var(--surface); } /* 그림 끝 */"), ["viewer/art-marker"])
        self.assertIn("viewer/art-marker", css("/* 그림 시작 */ /* 그림 시작 */ .p { color: var(--art-ink); } /* 그림 끝 */"))

    def test_그림_토큰이_없는_블록은_실패다(self):
        self.assertEqual(css("/* 그림 시작 — 크롬을 숨겼다 */\n.bar { padding: 13px; }\n/* 그림 끝 */"), ["viewer/art-marker"])

    def test_그림이라는_말로_시작하는_보통_주석은_표시가_아니다(self):
        self.assertEqual(css("/* 그림이 올 자리 */\n.ph { padding: 16px; }"), ["viewer/raw-space"])


class LocalVariable(unittest.TestCase):
    def test_지역_변수는_쓰이는_자리의_규칙으로_본다(self):
        self.assertEqual(css(":root { --pad: 13px; }\n.a { padding: var(--pad); }"), ["viewer/raw-space"])
        self.assertEqual(css(":root { --r: 5px; }\n.a { border-radius: var(--r); }"), ["viewer/raw-corner"])
        self.assertEqual(css(":root { --c: #fff; }\n.a { color: var(--c); }"), ["viewer/raw-color"])
        self.assertEqual(css(".a { --fade: 300ms; transition: opacity var(--fade); }"), ["viewer/raw-motion"])

    def test_배치에만_쓰는_지역_변수는_둔다(self):
        self.assertEqual(css(":root { --bar-h: 44px; --tabs-h: 0px; }\n.a { height: calc(var(--bar-h) + var(--tabs-h)); }"), [])
        self.assertEqual(css(".a { --deco: var(--duration-short4); transition: filter var(--deco) var(--easing-standard); }"), [])
        self.assertEqual(css(":root { --w: calc(var(--bar-h) * 2); }\n.a { width: var(--w); }"), [])
        self.assertEqual(css(":root { --pad: calc(var(--space-4) * 3); }\n.a { padding: var(--pad); }"), ["viewer/raw-space"])

    def test_파일을_넘어_쓰임을_모은다(self):
        uses = viewer.usage(viewer.parse_css(".b { gap: var(--gap); }")[0])
        self.assertEqual([r for _, r, _ in viewer.css_findings(":root { --gap: 24px; }", uses)], ["viewer/raw-space"])


class Parse(unittest.TestCase):
    def test_주석_문자열_미디어_키프레임(self):
        text = ('/* .x { padding: 12px } */\n.a[data-x="a;b{c}"] { content: "16px; #fff"; }\n'
                "@media (max-width: 600px) { .b { padding: 0; } }\n@keyframes wait { 50% { opacity: .55; } }")
        self.assertEqual(css(text), [])

    def test_줄과_증거(self):
        found = viewer.css_findings(".a {\n  color: var(--on-surface);\n  padding: 0  12px !important;\n}")
        self.assertEqual(found, [(3, "viewer/raw-space", "12px")])

    def test_미디어_안의_선언도_본다(self):
        found = viewer.css_findings("@media (max-width: 600px) {\n.a { gap: 8px; }\n}")
        self.assertEqual(found, [(2, "viewer/raw-space", "8px")])


class Js(unittest.TestCase):
    def test_색_리터럴(self):
        self.assertEqual(js("el.style.background = '#fff';"), ["viewer/raw-color"])
        self.assertEqual(js("Object.assign(el.style, { borderColor: 'red' });"), ["viewer/raw-color"])
        self.assertEqual(js("const c = 'rgb(1, 2, 3)';"), ["viewer/raw-color"])
        self.assertEqual(js("const m = `<rect fill=\"#000\"/>`;"), ["viewer/raw-color"])
        self.assertEqual(js("el.style.cssText = 'color: white; padding: 0';"), ["viewer/raw-color"])
        self.assertEqual(js("el.style.setProperty('--arrival-color', 'tomato');"), ["viewer/raw-color"])

    def test_계산한_색_토큰_이름은_둔다(self):
        for ok in ("return `rgb(${r},${g},${b})`;", "const m = `color-mix(in srgb, var(--device-shade) ${a}%, transparent)`;",
                   "Object.assign(s, { borderColor: 'transparent', color: 'var(--on-surface)' });",
                   "const palettes = ['blue', 'warm', 'original'];", "host.dataset.palette = 'blue';",
                   "const g = `<svg fill=\"currentColor\"><path fill=\"url(#fade)\"/></svg>`;", "find('#fade');"):
            self.assertEqual(js(ok), [], ok)

    def test_모션_시간(self):
        self.assertEqual(js("el.animate(k, { duration: 300, easing: motionToken('--easing-standard') });"), ["viewer/raw-motion"])
        self.assertEqual(js("el.animate(k, { duration: i === 0 ? 320 : 220 });"), ["viewer/raw-motion"])
        self.assertEqual(js("el.animate(k, 300);"), ["viewer/raw-motion"])
        self.assertEqual(js("el.animate(k, 1e3);"), ["viewer/raw-motion"])
        self.assertEqual(js("el.animate(k, { duration: 1e3 });"), ["viewer/raw-motion"])
        self.assertEqual(js("el.animate(k, { duration: ms, easing: 'ease-out' });"), ["viewer/raw-motion"])
        self.assertEqual(js("el.style.transition = 'opacity 200ms';"), ["viewer/raw-motion"])
        self.assertEqual(js('el.style.transition = "box-shadow 550ms var(--easing-standard)";'), ["viewer/raw-motion"])
        self.assertEqual(js("host.style.setProperty('--fade', '300ms');"), ["viewer/raw-motion"])
        self.assertEqual(js("const e = 'cubic-bezier(.2, 0, 0, 1)';"), ["viewer/raw-motion"])

    def test_토큰_계산_타이머는_둔다(self):
        for ok in ("el.animate(k, { duration: motionMs('--duration-short4'), easing: motionToken('--easing-standard') });",
                   "el.animate(k, { duration: duration * .8, fill: 'forwards' });", "el.animate(k, { duration, easing: 'linear' });",
                   "setTimeout(drop, 800);", "el.style.setProperty('--x', `${Math.round(v)}ms`);",
                   "const d = `M1.25 6h9.5M6 1.25c1.4 1.4 2 3 2 4.75s-.6 3.35-2 4.75`;",
                   "el.style.transition = `box-shadow var(--duration-long3) var(--easing-standard)`;",
                   "// el.style.transition = 'opacity 200ms'\nconst a = 1;", "const t = '2.5초 뒤';"):
            self.assertEqual(js(ok), [], ok)

    def test_정규식_리터럴과_템플릿_안의_문자열(self):
        self.assertEqual(js("const m = /^([\\d.]+)(ms|s)$/.exec(v); const q = '#fff';"), [])
        self.assertEqual(js("const x = `a ${cond ? 'b' : `c ${'#fff'}`} d`; el.style.color = '#000';"), ["viewer/raw-color"])
        self.assertEqual(js("const r = a / 2; const s = b / 3; el.style.color = 'red';"), ["viewer/raw-color"])


class Html(unittest.TestCase):
    def test_인라인_스타일과_색_속성(self):
        rules = [r for _, r, _ in viewer.html_findings('<body style="margin:0"><div style="padding: 12px"></div>'
                                                          '<svg><rect fill="#fff"/><stop style="stop-color: var(--device-gloss)"/></svg></body>')]
        self.assertEqual(rules, ["viewer/raw-space", "viewer/raw-color"])

    def test_인라인_스크립트는_js_규칙으로_본다(self):
        found = viewer.html_findings('<p>\n<script>\nif (a) document.body.classList.add("x");\nel.style.color = "#fff";\n</script>')
        self.assertEqual([(line, r) for line, r, _ in found], [(4, "viewer/raw-color")])


class Data(unittest.TestCase):
    def tree(self, files):
        root = tempfile.mkdtemp()
        for path, text in files.items():
            os.makedirs(os.path.dirname(os.path.join(root, path)), exist_ok=True)
            with open(os.path.join(root, path), "w", encoding="utf-8") as f:
                f.write(text)
        return root

    def setUp(self):
        self.data, viewer.DATA = viewer.DATA, ()

    def tearDown(self):
        viewer.DATA = self.data

    def test_데이터_예외는_그_자리만_놓아주고_가리키는_곳이_없으면_실패다(self):
        viewer.DATA = (("plugin/viewer/js/m.js", 'stop-color="white"', "마스크 휘도"),)
        root = self.tree({"plugin/viewer/js/m.js": 'const m = `<stop stop-color="white"/><stop stop-color="red"/>`;\n'})
        self.assertEqual([r for _, _, r, _ in viewer.check(root)], ["viewer/raw-color"])
        root = self.tree({"plugin/viewer/js/m.js": "const a = 1;\n"})
        self.assertEqual([r for _, _, r, _ in viewer.check(root)], ["viewer/data-stale"])


if __name__ == "__main__":
    unittest.main()
