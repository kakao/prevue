"""슬롭 규칙 — 리뷰에서 실제로 잡힌 기계적인 모양들. 규칙마다 tests/lint 에 심은 위반 · 지켜진 예가 있다.

규칙 하나는 (가린 코드, 원문, 경로) → [(줄, 규칙 id, 처방)] 이다.
"""

import re

from kotlin_source import mask

FILE_MAX_LINES = 400

_BLOCKING = re.compile(r"\bThread\s*\.\s*sleep\s*\(|\bThread\s*\(|\b\w*Future\b|\brunBlocking\b")
_RENAME = re.compile(r"\.renameTo\s*\(")
_HANDLED_TAILS = {"onFailure", "getOrElse", "getOrThrow", "getOrDefault", "fold", "exceptionOrNull", "isFailure", "isSuccess", "recover", "recoverCatching"}
_SYNC_THIS = re.compile(r"\bsynchronized\s*\(\s*this\s*\)")
_FORMAT_LITERAL = re.compile(r'"((?:[^"\\]|\\.)*)"\s*\.\s*format\s*\(')
_STRING_FORMAT = re.compile(r"\bString\s*\.\s*format\s*\(")
_LOCALE_CONVERSION = re.compile(r"%[-#+ 0,(]*\d*(?:\.\d+)?[eEfgG]|%[-#+ 0(]*,[-#+ 0(]*\d*[dfeEgG]")
_CATCH = re.compile(r"\bcatch\s*\([^)]*\)\s*\{")
_WHEN = re.compile(r"\bwhen\s*(\([^)]*\))?\s*\{")
_RAISES = re.compile(r"\bthrow\b|\berror\s*\(|\bcheck\s*\(|\brequire\s*\(|\bfail\s*\(|\bTODO\s*\(")


def _lines(code):
    return code.split("\n")


def _pos_to_line(code, pos):
    return code.count("\n", 0, pos) + 1


def _matching(code, k, open_c="{", close_c="}"):
    depth = 1
    while k < len(code) and depth:
        if code[k] == open_c:
            depth += 1
        elif code[k] == close_c:
            depth -= 1
        k += 1
    return k


def domain_blocking(code, text, path):
    if "/prevue/application/" not in path:
        return []
    return [(i, "slop/domain-blocking", "application 에서 스레드 · 퓨처 · runBlocking — 기다림은 suspend(delay)로 하거나 포트 뒤 infrastructure 로 옮긴다")
            for i, ln in enumerate(_lines(code), 1) if _BLOCKING.search(ln)]


def ignored_rename(code, text, path):
    found = []
    for i, ln in enumerate(_lines(code), 1):
        m = _RENAME.search(ln)
        if not m:
            continue
        head = ln[:m.start()].strip()
        end = _matching(ln, m.end(), "(", ")")
        tail = ln[end:].strip()
        if re.fullmatch(r"[\w.\[\]()?!]*", head) and not head.startswith("!") and tail in ("", "}", ";"):
            found.append((i, "slop/ignored-rename", "renameTo 의 결과(Boolean)를 버렸다 — 실패를 확인해 알리거나 Files.move 로 예외를 받는다"))
    return found


_UNIT_LAMBDAS = {"forEach", "forEachIndexed", "onEach", "also", "apply", "launch", "thread", "repeat", "use"}


def _discarded_position(code, start, end):
    """runCatching 식이 문장으로 놓여 값이 버려지는 자리인가. 식의 값이 될 수 있는 자리(인자 · 대입 · 람다의 마지막 값)는 아니다."""
    before = code[:start].rstrip()
    if not before:
        return True
    if not code[code.rfind("\n", 0, start) + 1:start].strip():
        return before[-1] not in ",(=[+-*/|&?:>!<"
    if before.endswith(";") or re.search(r"\}\s*else$", before):
        return True
    if before.endswith(")"):
        k, depth = len(before) - 1, 0
        while k >= 0:
            depth += {")": 1, "(": -1}.get(before[k], 0)
            if depth == 0:
                break
            k -= 1
        return bool(re.search(r"\b(for|if|while)\s*$", before[:k]))
    if before.endswith("{"):
        after = code[end:].lstrip(" \t")
        if after.startswith("\n") or after.startswith(";"):
            return True
        owner = re.search(r"(\w+)\s*(?:\([^()]*\))?\s*\{$", before)
        return bool(owner and owner.group(1) in _UNIT_LAMBDAS)
    return False


def bare_run_catching(code, text, path):
    found = []
    for m in re.finditer(r"(?:\bkotlin\s*\.\s*)?\brunCatching\b", code):
        if code[:m.start()].rstrip().endswith("."):
            continue
        brace = code.find("{", m.end())
        if brace < 0 or code[m.end():brace].strip():
            continue
        end = _matching(code, brace + 1)
        chain = []
        k = end
        while True:
            t = re.match(r"\s*\??\.\s*(\w+)", code[k:])
            if not t:
                break
            chain.append(t.group(1))
            k += t.end()
            rest = code[k:]
            lead = re.match(r"\s*", rest).end()
            if k + lead < len(code) and code[k + lead] in "({":
                open_c = code[k + lead]
                k = _matching(code, k + lead + 1, open_c, ")" if open_c == "(" else "}")
        if not _HANDLED_TAILS.intersection(chain) and _discarded_position(code, m.start(), k):
            found.append((_pos_to_line(code, m.start()), "slop/bare-runCatching", "runCatching 의 실패를 버렸다 — onFailure · getOrElse 로 이유를 알리거나 예외를 그대로 둔다"))
    return found


def synchronized_this(code, text, path):
    return [(i, "slop/synchronized-this", "synchronized(this) — 람다 안에서는 this 가 바뀐다. 공유 상태는 액터나 StateFlow 스냅숏으로 둔다(D-89)")
            for i, ln in enumerate(_lines(code), 1) if _SYNC_THIS.search(ln)]


def format_without_locale(code, text, path):
    found = []
    for i, (ln, raw) in enumerate(zip(_lines(code), _lines(text)), 1):
        for m in _FORMAT_LITERAL.finditer(ln):
            literal = raw[m.start(1):m.end(1)]
            after = ln[m.end():].lstrip()
            if _LOCALE_CONVERSION.search(literal) and not after.startswith("Locale"):
                found.append((i, "slop/format-locale", "기본 로캘로 숫자를 쓴다(쉼표 로캘이면 1,5) — String.format(Locale.ROOT, …)"))
        for m in _STRING_FORMAT.finditer(ln):
            if not ln[m.end():].lstrip().startswith("Locale"):
                found.append((i, "slop/format-locale", "기본 로캘로 숫자를 쓴다(쉼표 로캘이면 1,5) — String.format(Locale.ROOT, …)"))
    return found


def empty_catch(code, text, path):
    found = []
    for m in _CATCH.finditer(code):
        end = _matching(code, m.end())
        line_end = code.find("\n", end)
        line_end = len(code) if line_end < 0 else line_end
        said = text[m.end():end - 1].strip() or "//" in text[end:line_end] and "//" not in code[end:line_end]
        if not code[m.end():end - 1].strip() and not said:
            found.append((_pos_to_line(code, m.start()), "slop/empty-catch", "빈 catch 가 실패를 삼킨다 — 받을 이유가 없으면 잡지 않고, 받으면 무엇을 하는지 코드로 쓴다"))
    return found


def when_else_default(code, text, path):
    found = []
    for m in _WHEN.finditer(code):
        end = _matching(code, m.end())
        body_code = code[m.end():end - 1]
        body_text = text[m.end():end - 1]
        if not re.search(r'(?m)^\s*"[^\n]*->', body_text):
            continue
        subject = _subject(m.group(1) or "")
        for start, cond, value in _top_level_branches(body_code):
            if cond.strip() != "else" or _RAISES.search(value) or _LITERAL.fullmatch(value.strip()):
                continue
            said = text[m.end() + start:m.end() + start + len(cond) + 2 + len(value)]
            if subject and re.search(r"\b%s\b" % re.escape(subject), said):
                continue
            found.append((_pos_to_line(code, m.end() + start), "slop/when-else-default",
                          "문자열 when 의 else 가 모르는 값을 말없이 아는 동작으로 처리한다 — error(…)로 내거나 그 값을 담아 실패로 답한다"))
    return found


_LITERAL = re.compile(r'null|true|false|-?\d[\w.]*|"\s*"|\{\s*\}|Unit')


def _subject(paren):
    """when (x) 의 x — 이름이 아니면(식) 빈 문자열."""
    inner = paren.strip()[1:-1].strip() if paren else ""
    m = re.fullmatch(r"(?:val\s+(\w+)\s*(?::[^=]+)?=.*|([\w.]+))", inner, re.S)
    if not m:
        return ""
    return m.group(1) or m.group(2).split(".")[-1]


def _top_level_branches(body):
    """when 본문을 최상위 `조건 -> 값` 들로 나눈다 [(조건 시작, 조건, 값)]."""
    out, depth, k, start = [], 0, 0, 0
    arrows = []
    while k < len(body):
        c = body[k]
        if c in "({[":
            depth += 1
        elif c in ")}]":
            depth -= 1
        elif depth == 0 and body.startswith("->", k):
            arrows.append(k)
        k += 1
    for idx, a in enumerate(arrows):
        cond_start = body.rfind("\n", 0, a) + 1 if idx == 0 else _branch_start(body, arrows[idx - 1], a)
        value_end = _branch_start(body, a, arrows[idx + 1]) if idx + 1 < len(arrows) else len(body)
        out.append((cond_start, body[cond_start:a], body[a + 2:value_end]))
    return out


def _branch_start(body, prev_arrow, arrow):
    """두 화살표 사이에서 다음 조건이 시작되는 줄의 처음 — 깊이 0 에서 마지막 줄바꿈 뒤."""
    depth, last_nl = 0, prev_arrow
    for k in range(prev_arrow + 2, arrow):
        c = body[k]
        if c in "({[":
            depth += 1
        elif c in ")}]":
            depth -= 1
        elif c == "\n" and depth == 0:
            last_nl = k + 1
    return last_nl


def file_length(code, text, path):
    n = text.count("\n") + (0 if text.endswith("\n") else 1)
    if n > FILE_MAX_LINES:
        return [(1, "slop/file-length", "파일이 %d줄이다(상한 %d) — 하는 일마다 파일을 나눈다" % (n, FILE_MAX_LINES))]
    return []


RULES = [domain_blocking, ignored_rename, bare_run_catching, synchronized_this, format_without_locale, empty_catch, when_else_default, file_length]


def check(text, path):
    """한 파일의 [(줄, 규칙 id, 처방)]."""
    code, _ = mask(text)
    found = []
    for rule in RULES:
        found.extend(rule(code, text, path))
    return sorted(found)
