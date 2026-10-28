"""뷰어 날값 린트(D-96) — 뷰어의 색 · 글자 · 모서리 · 그림자 · 시간 · 이징 · 간격은 viewer/tokens.css 의 역할 이름으로만 쓴다.

화면을 고치는 쪽이 대부분 에이전트라, 고칠 때마다 새 값을 정하지 못하게 기계적인 모양만 본다. 규칙마다 tests/lint/test_viewer.py 에 심은 위반이 있다.
- 두는 것: 배치 치수(폭 · 높이 · 위치 · 테두리 두께 · 스크롤 여백), 0 · auto · inherit · transparent · currentColor · linear,
  테두리처럼 두르는 고리 그림자(0 0 0 <두께> <색 토큰>), 계산한 색(템플릿의 rgb(${…}))
- 지역 변수(tokens.css 밖의 --x)는 쓰이는 자리의 규칙으로 본다 — 날값을 변수에 옮겨 담아 피하지 못하게
- 계산식의 단위 없는 배수도 날값이다(토큰에 곱해 새 값을 만든다). 둘 것은 부호 바꾸기(* -1)와 --motion-stagger 의 칸 수뿐이다
- 그림 블록(/* 그림 시작 … */ ~ /* 그림 끝 */)은 그림 안무라 색 · 원시값만 본다(D-97)
- JS 는 색과 모션 시간(animate() 옵션 · CSS 시간 문자열 · cubic-bezier)만 본다. 타이머 · 스프링 상수는 동작이라 두고, 변수에 담은 숫자는 못 본다
"""

import os
import re

VIEWER = "plugin/viewer"
TOKENS = "plugin/viewer/tokens.css"

# 데이터라 날값이 아닌 것 — (경로, 그 줄에 있는 조각, 이유). 가리키는 곳이 사라지면 실패한다.
DATA = ()

NEW_VALUE = "새 값이 필요하면 tokens.css 와 견본(prototypes/design-system)을 같은 PR 에서 고친다"
ADVICE = {
    "viewer/raw-color": ("날색", "역할 이름(--surface · --on-surface · --outline · --pick …)을 쓴다"),
    "viewer/raw-type": ("글자 날값", "font: var(--type-*) 한 줄로 쓴다. 굵기만 바꿀 때는 --weight-*"),
    "viewer/raw-corner": ("모서리 날값", "--corner-small · medium · large · full"),
    "viewer/raw-shadow": ("그림자 날값", "--elevation-1~4. 테두리처럼 두르는 고리는 0 0 0 <두께> <색 토큰>"),
    "viewer/raw-motion": ("시간 · 이징 날값", "--duration-* · --easing-*, 계단 지연은 --motion-stagger 의 배수. JS 는 motionMs · motionToken 으로 읽는다"),
    "viewer/raw-space": ("간격 날값", "--space-*"),
    "viewer/primitive": ("원시값", "역할 이름을 쓴다. 색 원시값은 라이트 · 다크 한쪽 값이다"),
    "viewer/art-token": ("크롬의 그림 토큰", "크롬은 역할 이름만 쓴다. 그림이면 /* 그림 시작 … */ ~ /* 그림 끝 */ 안에 둔다"),
}

NAMED = frozenset("""
aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue
chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey
darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray
darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen
fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki
lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen
lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime
limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue
mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive
olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum
powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver
skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white
whitesmoke yellow yellowgreen
""".split())
GLOBAL = frozenset(("inherit", "initial", "unset", "revert", "revert-layer"))
ABSOLUTE = frozenset(("px", "em", "rem", "ex", "ch", "lh", "rlh", "pt", "pc", "cm", "mm", "in", "q"))

_COMMENT = re.compile(r"/\*.*?\*/", re.S)
_STRING = re.compile(r'"(?:[^"\\\n]|\\.)*"|\'(?:[^\'\\\n]|\\.)*\'')
_URL = re.compile(r"url\([^)]*\)", re.I)
_NUM = re.compile(r"(?<![\w.#$-])(-?(?:\d+\.?\d*|\.\d+))([a-zA-Z%]*)")
_HEX = re.compile(r"(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])")
_COLOR_FN = re.compile(r"(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix|color)\(", re.I)
_WORD = re.compile(r"(?<![\w-])[A-Za-z]+(?![\w-])")
_EASE = re.compile(r"(?<![\w-])(?:ease|ease-in|ease-out|ease-in-out|step-start|step-end)(?![\w-])"
                   r"|(?<![\w-])(?:cubic-bezier|steps|linear)\(", re.I)
_MATH = re.compile(r"(?<![\w-])(?:calc|min|max|clamp)\(", re.I)
_RING = re.compile(r"\s*(?:inset\s+)?0\s+0\s+0\s+(?:\d+\.?\d*|\.\d+)[a-z]*\s*(?:inset\s*)?")
_DECL = re.compile(r"\s*(--[\w-]+|-?[A-Za-z][\w-]*)\s*:(.*)", re.S)
_GROUP = ("@media", "@supports", "@container", "@layer", "@scope")
_SPACE = re.compile(r"(?:padding|margin)(?:-[a-z-]+)?|(?:row-|column-|grid-)?gap")
_CORNER = re.compile(r"border(?:-(?:top|bottom|start|end)-(?:left|right|start|end))?-radius")
_MOTION = re.compile(r"(?:transition|animation)(?:-(?:duration|delay|timing-function))?")
_TYPE = frozenset(("font", "font-size", "font-weight", "line-height", "letter-spacing", "font-family"))
_SHADOW = frozenset(("box-shadow", "text-shadow", "filter", "backdrop-filter"))
_PRIMITIVE = re.compile(r"--(?:gray|blue|red|yellow|green|size)-")
_ART = re.compile(r"--(?:art|device|avatar)-|--on-avatar$")


def _line(text, pos):
    return text.count("\n", 0, pos) + 1


def _blank(m):
    return re.sub(r"[^\n]", " ", m.group(0))


def _keep_quotes(m):
    s = m.group(0)
    return s[0] + re.sub(r"[^\n]", " ", s[1:-1]) + s[-1]


def _closed(s, k, open_c="(", close_c=")"):
    """s[k-1] 이 여는 괄호일 때 짝 닫는 괄호 다음 자리. 이 글 안에서 닫히지 않으면 -1."""
    depth = 1
    while k < len(s):
        if s[k] == open_c:
            depth += 1
        elif s[k] == close_c:
            depth -= 1
            if depth == 0:
                return k + 1
        k += 1
    return -1


def _split_top(s):
    """괄호 바깥의 쉼표로 가른다 → [(자리, 조각)]."""
    out, depth, start = [], 0, 0
    for i, ch in enumerate(s):
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth -= 1
        elif ch == "," and depth == 0:
            out.append((start, s[start:i]))
            start = i + 1
    out.append((start, s[start:]))
    return out


def split_vars(value):
    """var() 를 걷은 나머지와 참조한 이름들. 대체값(var(--x, 12px) 의 12px)은 나머지에 남아 검사를 받는다."""
    rest, names, i = [], [], 0
    while True:
        j = value.find("var(", i)
        if j < 0:
            rest.append(value[i:])
            return "".join(rest), names
        rest.append(value[i:j])
        k = _closed(value, j + 4)
        k = len(value) if k < 0 else k
        inner = value[j + 4:k - 1]
        comma = next((p for p, piece in _split_top(inner)[1:2]), len(inner) + 1) - 1
        names.append(inner[:comma].strip())
        fallback, more = split_vars(inner[comma + 1:])
        rest.append(" %s " % fallback)
        names.extend(more)
        i = k


def _numbers(rest):
    return [(m.group(0), float(m.group(1)), m.group(2).lower()) for m in _NUM.finditer(rest)]


def raw_colors(rest):
    rest = _URL.sub(" ", rest)
    found = [m.group(0) for m in _HEX.finditer(rest)]
    found += [m.group(0) + "…)" for m in _COLOR_FN.finditer(rest)]
    return found + [w for w in _WORD.findall(rest) if w.lower() in NAMED]


def raw_times(rest):
    found = [t for t, v, unit in _numbers(rest) if unit in ("ms", "s") and v]
    return found + [m.group(0) for m in _EASE.finditer(rest)]


def raw_lengths(rest):
    return [t for t, v, unit in _numbers(rest) if unit in ABSOLUTE and v]


def multipliers(value, rest):
    """계산식 안의 단위 없는 수. 0 과 부호 바꾸기(-1)는 두고, 계단 지연(--motion-stagger)의 칸 수도 둔다."""
    if "--motion-stagger" in value:
        return []
    found, end = [], 0
    for m in _MATH.finditer(rest):
        if m.start() < end:
            continue
        end = _closed(rest, m.end())
        end = len(rest) if end < 0 else end
        found += [t for t, v, unit in _numbers(rest[m.end():end]) if not unit and v not in (0, -1)]
    return found


def category(prop):
    if _SPACE.fullmatch(prop):
        return "space"
    if _CORNER.fullmatch(prop):
        return "corner"
    if _MOTION.fullmatch(prop):
        return "motion"
    if prop in _TYPE:
        return "type"
    if prop in _SHADOW:
        return "shadow"
    return None


def raw_in(cat, prop, value, rest):
    """이 범주의 날값 조각들 — 없으면 []."""
    if cat == "space":
        return raw_lengths(rest) + multipliers(value, rest)
    if cat == "motion":
        return raw_times(rest) + multipliers(value, rest)
    if cat == "corner":
        return [t for t, v, _ in _numbers(rest) if v]
    if cat == "type":
        left = " ".join(rest.split())
        if not left or left in GLOBAL or left == "0" or (prop == "letter-spacing" and left == "normal"):
            return []
        return [left]
    if cat == "shadow":
        if prop in ("filter", "backdrop-filter"):
            return [m.group(0) for m in re.finditer(r"drop-shadow\([^)]*\)", rest) if any(v for _, v, _ in _numbers(m.group(0)))]
        found = []
        for _, layer in _split_top(value):
            layer_rest, _ = split_vars(layer)
            if not any(v for _, v, _ in _numbers(layer_rest)):
                continue
            if prop != "text-shadow" and _RING.fullmatch(layer_rest):
                continue
            found.append(" ".join(layer.split()))
        return found
    return []


class Decl:
    def __init__(self, pos, line, prop, value, masked, art):
        self.pos, self.line, self.prop = pos, line, prop
        self.value, self.masked, self.art = value, masked, art


def _important(v):
    return re.sub(r"!\s*important\s*$", "", v.strip(), flags=re.I).strip()


def parse_css(text):
    """선언들 · 그림 블록 범위 · 그림 표시의 잘못. 자리 · 줄은 원문 그대로다."""
    marks, art, opened = [], [], None
    for m in _COMMENT.finditer(text):
        body = m.group(0)[2:-2].strip()
        if body.startswith("그림 시작"):
            if opened is not None:
                marks.append((_line(text, m.start()), "그림 시작이 겹친다 — 앞 블록을 /* 그림 끝 */ 으로 닫는다"))
            else:
                opened = m.end()
        elif body == "그림 끝":
            if opened is None:
                marks.append((_line(text, m.start()), "짝 없는 /* 그림 끝 */"))
            else:
                art.append((opened, m.start()))
                opened = None
    if opened is not None:
        marks.append((_line(text, opened), "닫지 않은 /* 그림 시작 */"))
    plain = _COMMENT.sub(_blank, text)
    masked = _STRING.sub(_keep_quotes, plain)
    decls, stack, start = [], [], 0
    for i, ch in enumerate(masked):
        if ch not in "{};":
            continue
        if ch == "{":
            stack.append(" ".join(plain[start:i].split()))
        else:
            m = _DECL.match(masked, start, i)
            if m and stack and not stack[-1].startswith(_GROUP):
                prop = m.group(1) if m.group(1).startswith("--") else m.group(1).lower()
                pos = m.start(1)
                decls.append(Decl(pos, _line(text, pos), prop, _important(plain[m.start(2):i]),
                                  _important(m.group(2)), any(a <= pos < b for a, b in art)))
            if ch == "}" and stack:
                stack.pop()
        start = i + 1
    return decls, art, marks


def usage(decls):
    """지역 변수 → 그것을 쓰는 속성의 범주들."""
    out = {}
    for d in decls:
        cat = None if d.prop.startswith("--") else category(d.prop)
        if cat:
            for name in split_vars(d.masked)[1]:
                out.setdefault(name, set()).add(cat)
    return out


def css_findings(text, uses=None, art_tokens=True):
    """[(줄, 규칙, 증거)]"""
    decls, art, marks = parse_css(text)
    uses = usage(decls) if uses is None else uses
    out = [(line, "viewer/art-marker", why) for line, why in marks]
    for a, b in art:
        if not any(a <= d.pos < b and any(_ART.match(n) for n in split_vars(d.masked)[1]) for d in decls):
            out.append((_line(text, a), "viewer/art-marker", "그림 블록에 그림 토큰(--art-* · --device-* · --avatar-*)이 없다 — 크롬이면 블록 밖으로 뺀다"))
    for d in decls:
        rest, names = split_vars(d.masked)
        hits = [("viewer/raw-color", raw_colors(rest)), ("viewer/primitive", [n for n in names if _PRIMITIVE.match(n)])]
        if not d.art:
            if art_tokens:
                hits.append(("viewer/art-token", [n for n in names if _ART.match(n)]))
            cats = uses.get(d.prop, set()) if d.prop.startswith("--") else {category(d.prop)} - {None}
            if d.prop.startswith("--") and "motion" not in cats:
                hits.append(("viewer/raw-motion", raw_times(rest)))
            hits += [("viewer/raw-" + cat, raw_in(cat, d.prop, d.masked, rest)) for cat in sorted(cats)]
        out += [(d.line, rule, " ".join(found)) for rule, found in hits if found]
    return out


_STYLE_ATTR = re.compile(r'\sstyle\s*=\s*"([^"]*)"', re.I)
_STYLE_TAG = re.compile(r"<style[^>]*>(.*?)</style>", re.S | re.I)
_SCRIPT_TAG = re.compile(r"<script[^>]*>(.*?)</script>", re.S | re.I)
_ATTR_COLOR = re.compile(r'(?<![\w-])(?:fill|stroke|stop-color|flood-color|lighting-color|color)\s*=\s*(["\'])(.*?)\1', re.I)


def html_findings(text, uses=None):
    """인라인 style · <style> · <script> · 색 속성. 마크업의 그림(svg)은 그림 토큰을 쓸 수 있다."""
    out = []
    for m in _SCRIPT_TAG.finditer(text):
        shift = _line(text, m.start(1)) - 1
        out += [(line + shift, r, e) for line, r, e in js_findings(m.group(1))]
    text = _SCRIPT_TAG.sub(_blank, text)
    for m in _STYLE_TAG.finditer(text):
        shift = _line(text, m.start(1)) - 1
        out += [(line + shift, r, e) for line, r, e in css_findings(m.group(1), uses)]
    for m in _STYLE_ATTR.finditer(text):
        out += [(_line(text, m.start()), r, e) for _, r, e in css_findings("[style] {%s}" % m.group(1), uses, art_tokens=False)]
    for m in _ATTR_COLOR.finditer(text):
        if raw_colors(m.group(2)):
            out.append((_line(text, m.start()), "viewer/raw-color", m.group(0)))
    return out


_REGEX_AFTER = set("(,=:[!&|?{};+-*%<>~^")
_REGEX_KEYWORDS = {"return", "typeof", "case", "do", "else", "in", "of", "new", "delete", "void", "throw", "yield", "await", "instanceof"}


def scan_js(text):
    """가린 코드(문자열 · 주석 · 정규식 속은 빈칸, 따옴표는 남는다)와 문자열들 — {start, chunks: [(자리, 정적 조각)], interp}."""
    code, strings, n = list(text), [], len(text)
    opened = []
    last, i = "", 0

    def blank(a, b):
        for k in range(a, b):
            if code[k] != "\n":
                code[k] = " "

    def body(i, rec):
        start = i
        while i < n:
            if text[i] == "\\":
                i += 2
                continue
            if text[i] == "`" or text.startswith("${", i):
                rec["chunks"].append((start, text[start:i]))
                blank(start, i)
                if text[i] == "`":
                    strings.append(rec)
                    return i + 1
                rec["interp"] = True
                opened.append([rec, 0])
                return i + 2
            i += 1
        rec["chunks"].append((start, text[start:n]))
        blank(start, n)
        strings.append(rec)
        return n

    while i < n:
        c = text[i]
        if opened and c == "}" and opened[-1][1] == 0:
            i = body(i + 1, opened.pop()[0])
            last = "a"
            continue
        if opened and c in "{}":
            opened[-1][1] += 1 if c == "{" else -1
        if text.startswith("//", i) or text.startswith("/*", i):
            j = text.find("\n" if text[i + 1] == "/" else "*/", i + 2)
            j = n if j < 0 else (j if text[i + 1] == "/" else j + 2)
            blank(i, j)
            i = j
            continue
        if c in "'\"":
            j = i + 1
            while j < n and text[j] not in (c, "\n"):
                j += 2 if text[j] == "\\" else 1
            strings.append({"start": i, "chunks": [(i + 1, text[i + 1:j])], "interp": False})
            blank(i + 1, j)
            i, last = j + 1, "a"
            continue
        if c == "`":
            i = body(i + 1, {"start": i, "chunks": [], "interp": False})
            last = "a"
            continue
        if c == "/" and (not last or last in _REGEX_AFTER or last in _REGEX_KEYWORDS):
            j, cls = i + 1, False
            while j < n and text[j] != "\n" and (cls or text[j] != "/"):
                if text[j] == "\\":
                    j += 2
                    continue
                cls = (cls or text[j] == "[") and text[j] != "]"
                j += 1
            blank(i + 1, j)
            i = j + 1
            while i < n and text[i].isalpha():
                i += 1
            last = "a"
            continue
        if c.isalnum() or c in "_$":
            j = i
            while j < n and (text[j].isalnum() or text[j] in "_$"):
                j += 1
            last, i = text[i:j], j
            continue
        if not c.isspace():
            last = c
        i += 1
    return "".join(code), strings


_TIME_JS = re.compile(r"(?<![\w.$#-])(\d*\.?\d+(?:[eE][+-]?\d+)?)(ms|s)(?![\w.-])")
_MOTION_WORDS = re.compile(r"transition|animation|cubic-bezier|var\(--(?:duration|easing)|(?<![\w-])(?:ease(?:-in|-out|-in-out)?|linear)(?![\w-])")
_STYLE_MOTION = re.compile(r"(?:\.style\.(?:transition|animation)\w*\s*=|(?<![\w$])(?:transition|animation)\w*\s*:)\s*$")
_SVG_DATA = re.compile(r'(?<![\w-])(?:d|viewBox|points|transform)\s*=\s*"[^"]*"')
_CSS_COLOR_DECL = re.compile(r"(?<![\w-])(?:color|background(?:-color)?|border(?:-[a-z]+)*|outline(?:-color)?|fill|stroke|stop-color"
                             r"|box-shadow|text-shadow|caret-color|accent-color)\s*:\s*([^;\"'{}<>]+)")
_JS_NUM = re.compile(r"(?<![\w.$])((?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)(?![\w.])")
_EASE_FN = re.compile(r"(?<![\w-])(?:cubic-bezier|steps|linear)\(")
# 'blue' 같은 이름 하나짜리 문자열은 팔레트 이름일 수도 있어, 스타일에 들어가는 자리일 때만 색으로 본다
_COLOR_CONTEXT = re.compile(r"(?:\.style\.[\w$]+\s*=|setProperty\(\s*[^,()]*,|(?<![\w$])(?:color|background\w*|border\w*|outline\w*"
                            r"|fill|stroke|stopColor|floodColor|caretColor|accentColor)\s*:)\s*$")


def _is_color(s):
    return bool(_HEX.fullmatch(s) or s.lower() in NAMED or (_COLOR_FN.match(s) and _closed(s, s.index("(") + 1) == len(s)))


def js_findings(text):
    """[(줄, 규칙, 증거)] — 색 리터럴과 모션 시간."""
    code, strings = scan_js(text)
    out = set()
    at = {s["start"]: s for s in strings}
    for s in strings:
        static = "".join(t for _, t in s["chunks"])
        line = _line(text, s["start"])
        before = code[max(0, s["start"] - 80):s["start"]]
        if not s["interp"] and _is_color(static.strip()) and (_COLOR_FN.match(static.strip()) or _COLOR_CONTEXT.search(before)):
            out.add((line, "viewer/raw-color", static.strip()))
        for pos, chunk in s["chunks"]:
            for m in _ATTR_COLOR.finditer(chunk):
                if raw_colors(m.group(2)):
                    out.add((_line(text, pos + m.start()), "viewer/raw-color", m.group(0)))
            for m in _CSS_COLOR_DECL.finditer(chunk):
                found = raw_colors(split_vars(m.group(1))[0])
                if found:
                    out.add((_line(text, pos + m.start()), "viewer/raw-color", " ".join(found)))
            for m in _COLOR_FN.finditer(chunk):
                end = _closed(chunk, m.end())
                if end > 0 and not _is_color(static.strip()):
                    out.add((_line(text, pos + m.start()), "viewer/raw-color", chunk[m.start():end]))
            for m in _EASE_FN.finditer(chunk):
                out.add((_line(text, pos + m.start()), "viewer/raw-motion", m.group(0) + "…)"))
        prose = _SVG_DATA.sub(" ", static)
        times = [m.group(0) for m in _TIME_JS.finditer(prose) if float(m.group(1))]
        whole_time = not s["interp"] and _TIME_JS.fullmatch(static.strip())
        if times and (whole_time or _MOTION_WORDS.search(prose) or _STYLE_MOTION.search(before)):
            out.add((line, "viewer/raw-motion", " ".join(times)))
    for m in re.finditer(r"\.animate\s*\(", code):
        end = _closed(code, m.end())
        if end < 0:
            continue
        args = _split_top(code[m.end():end - 1])
        if len(args) == 2 and _JS_NUM.fullmatch(args[1][1].strip()) and float(args[1][1]):
            out.add((_line(text, m.end() + args[1][0]), "viewer/raw-motion", "animate(…, %s)" % args[1][1].strip()))
        last_at, last = args[-1]
        if not last.strip().startswith("{"):
            continue
        brace = m.end() + last_at + last.index("{")
        close = _closed(code, brace + 1, "{", "}")
        for off, prop in _split_top(code[brace + 1:close - 1]):
            kv = re.match(r"\s*([\w$]+)\s*:(.*)", prop, re.S)
            if not kv:
                continue
            where = brace + 1 + off + kv.start(2)
            value = kv.group(2)
            if kv.group(1) in ("duration", "delay", "endDelay") and any(float(x) >= 10 for x in _JS_NUM.findall(value)):
                out.add((_line(text, where), "viewer/raw-motion", "%s:%s" % (kv.group(1), " ".join(value.split()))))
            if kv.group(1) == "easing":
                lead = where + len(value) - len(value.lstrip())
                s = at.get(lead)
                if s and "".join(t for _, t in s["chunks"]).strip() != "linear":
                    out.add((_line(text, where), "viewer/raw-motion", "easing: %s" % text[lead:lead + 40].split(",")[0].strip()))
    return sorted(out)


def files(root):
    out = []
    for d, _, names in os.walk(os.path.join(root, VIEWER)):
        for f in names:
            path = os.path.relpath(os.path.join(d, f), root)
            if path != TOKENS and f.endswith((".css", ".js", ".html")):
                out.append(path)
    return sorted(out)


def scan(root="."):
    """[(경로, 줄, 규칙, 증거)] — 예외를 빼기 전."""
    texts = {}
    for path in files(root):
        with open(os.path.join(root, path), encoding="utf-8") as f:
            texts[path] = f.read()
    uses = usage(d for path, t in texts.items() if path.endswith(".css") for d in parse_css(t)[0])
    found = []
    for path, t in texts.items():
        if path.endswith(".css"):
            found += [(path, line, r, e) for line, r, e in css_findings(t, uses)]
        elif path.endswith(".html"):
            found += [(path, line, r, e) for line, r, e in html_findings(t, uses)]
        else:
            found += [(path, line, r, e) for line, r, e in js_findings(t)]
    return found, texts


def advice(rule, evidence):
    if rule not in ADVICE:
        return evidence
    label, fix = ADVICE[rule]
    return "%s %s — %s%s" % (label, evidence, fix, ". " + NEW_VALUE if rule.startswith("viewer/raw-") else "")


def check(root="."):
    """[(경로, 줄, 규칙, 처방)] — 데이터 예외를 빼고, 가리키는 곳이 없는 예외 줄은 낡음으로 알린다."""
    found, texts = scan(root)
    used = set()
    out = []
    for path, line, rule, evidence in found:
        source = texts[path].split("\n")[line - 1]
        data = [d for d in DATA if d[0] == path and d[1] in source and d[1] in evidence]
        if data:
            used.update(data)
            continue
        out.append((path, line, rule, advice(rule, evidence)))
    out += [(os.path.relpath(os.path.abspath(__file__), root), 1, "viewer/data-stale", "DATA 의 %s %s 이 가리키는 곳이 없다 — 지운다" % d[:2])
            for d in DATA if d not in used]
    return out
