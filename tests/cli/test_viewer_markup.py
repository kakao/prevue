import re
from html.parser import HTMLParser
from pathlib import Path
import unittest


class ViewerMarkup(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.parents = {}

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if "id" in attributes:
            self.parents[attributes["id"]] = self.stack[-1][1] if self.stack else None
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            self.stack.append((tag, attributes.get("id", tag)))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break


class GlobalPanels(unittest.TestCase):
    def test_global_panels_are_independent_of_contextual_controls(self):
        markup = ViewerMarkup()
        markup.feed((Path(__file__).resolve().parents[2] / "plugin/viewer/index.html").read_text())
        for panel in ("chooser", "qoCurtain", "qoSheet", "help"):
            with self.subTest(panel=panel):
                self.assertEqual(markup.parents[panel], "body")



class ModuleScripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.modules = 0
        self.inline = []
        self.open_inline = False

    def handle_starttag(self, tag, attrs):
        if tag != "script":
            return
        attributes = {k: (v or "") for k, v in attrs}
        if attributes.get("type", "").strip().lower() == "module":
            self.modules += 1
        self.open_inline = "src" not in attributes

    def handle_data(self, data):
        if self.open_inline:
            self.inline.append(data)

    def handle_endtag(self, tag):
        if tag == "script":
            self.open_inline = False


class ModuleEntries(unittest.TestCase):
    # strings.js 는 최상위 await 로 사전을 받는다. WebKit 은 진입 모듈이 둘이면 두 번째 그래프가 그 await 를 기다리지 않아
    # 사전 · 보드 모듈이 초기화 전에 불려(TDZ) 뷰어가 준비 화면에 멈췄다 — 진입점은 페이지마다 하나고, 인라인 스크립트도 모듈을 부르지 않는다.
    def test_each_page_has_one_module_entry(self):
        viewer = Path(__file__).resolve().parents[2] / "plugin/viewer"
        for page in ("index.html", "prepare.html"):
            with self.subTest(page=page):
                scripts = ModuleScripts()
                scripts.feed((viewer / page).read_text())
                self.assertEqual(scripts.modules, 1)
                self.assertFalse(any("import(" in code for code in scripts.inline))


class PreparationDepth(unittest.TestCase):
    # 준비 장면의 3D 맥락은 기기 틀을 기울이는 .assembly · .layer 까지만이다. 그 아래(.drift · .pane · 조각)가 preserve-3d 면
    # WebKit 이 틀 안의 같은 평면 층을 깊이로 다시 정렬해 단계가 바뀔 때 조각이 깜빡였다(#235 · 이 검사).
    def test_preserve_3d_stops_at_layer(self):
        css = (Path(__file__).resolve().parents[2] / "plugin/viewer/preparation.css").read_text()
        rules = re.findall(r"([^{}]+)\{[^{}]*preserve-3d[^{}]*\}", re.sub(r"/\*.*?\*/", "", css, flags=re.S))
        self.assertEqual(sorted(r.strip() for r in rules), ["#preparation .assembly", "#preparation .layer"])


class PreparationNames(unittest.TestCase):
    # 2단계부터는 뷰어 페이지(index.html)가 준비 장면을 이어받아 그 페이지의 스타일과 한 페이지에 선다. 준비 장면의 클래스 · id 가
    # 뷰어 스타일의 선택자에 나오면 그 규칙을 함께 받는다 — .progress 가 헤더 진행 줄(opacity 0)을 받아 네 칸 막대가 사라졌다.
    def test_preparation_names_do_not_appear_in_viewer_styles(self):
        viewer = Path(__file__).resolve().parents[2] / "plugin/viewer"
        markup = (viewer / "js/preparation-markup.js").read_text()
        names = [r"\." + re.escape(c) for attr in re.findall(r'class="([^"]+)"', markup) for c in attr.split()]
        names += ["#" + re.escape(i) for i in re.findall(r'id="([^"]+)"', markup)]
        sheets = [h for h in re.findall(r'<link rel="stylesheet" href="([^"]+)"', (viewer / "index.html").read_text()) if h != "preparation.css"]
        self.assertIn("style.css", sheets)
        for sheet in sheets:
            css = re.sub(r"/\*.*?\*/", "", (viewer / sheet).read_text(), flags=re.S)
            selectors = re.findall(r"([^{};]+)\{", css)
            with self.subTest(sheet=sheet):
                self.assertEqual([s.strip() for s in selectors for n in names if re.search(n + r"(?![\w-])", s)], [])
