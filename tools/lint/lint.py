"""tools/lint.sh 의 본체 — 슬롭 규칙 · detekt(지표 · 죽은 코드) · 새 주석 · 뷰어 날값(viewer.py)을 모아 판정한다.

판정:
- 위반이 하나라도 있으면 실패다.
- diff 가 더한 주석 줄은 실패다. 예외는 `// 외부:` 로 시작하는 한 줄.

종료 코드: 0 통과 · 1 위반 · 2 검사를 못 했다.
"""

import argparse
import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kotlin_source  # noqa: E402
import slop  # noqa: E402
import viewer  # noqa: E402

PLUGIN = "plugin"
ROOTS = ("plugin/src/main/kotlin/", "plugin/src/bridge/kotlin/")
# 린트의 빌드 디렉터리 · 실행 기록 — 평소 빌드의 build/classes · .gradle 을 건드리지 않게 init script 에 넘긴다
LINT_BUILD = "build/lint"
DETEKT_REPORTS = tuple("%s/%s/reports/detekt/%s.xml" % (PLUGIN, LINT_BUILD, s) for s in ("main", "bridge"))
EXTERNAL = re.compile(r"^//\s*외부:")
INIT_SCRIPT = os.path.abspath(os.path.join(os.path.dirname(__file__), "detekt.init.gradle.kts"))

DETEKT_GROUPS = {
    "LongMethod": "metric/long-method", "LongParameterList": "metric/long-parameter-list",
    "CyclomaticComplexMethod": "metric/cyclomatic-complexity", "CognitiveComplexMethod": "metric/cognitive-complexity",
    "NestedBlockDepth": "metric/nested-depth", "MaxLineLength": "metric/line-length",
    "UnusedPrivateFunction": "dead/unused-private-function", "UnusedPrivateProperty": "dead/unused-private-property",
    "UnusedPrivateClass": "dead/unused-private-class", "UnusedParameter": "dead/unused-parameter",
    "UnreachableCode": "dead/unreachable-code",
}
DETEKT_ADVICE = {
    "metric/long-method": "함수를 하는 일마다 나눈다",
    "metric/long-parameter-list": "같이 다니는 인자를 한 타입으로 묶는다",
    "metric/cyclomatic-complexity": "분기를 함수 · 표로 나눈다",
    "metric/cognitive-complexity": "중첩을 이른 return · 함수로 편다",
    "metric/nested-depth": "중첩을 이른 return · 함수로 편다",
    "metric/line-length": "줄을 나누거나 식을 이름 붙은 값으로 뺀다",
}


class Unrunnable(Exception):
    """검사를 못 했다 — 통과로 보이면 안 된다(종료 2)."""


class Finding:
    def __init__(self, path, line, rule, advice):
        self.path, self.line, self.rule, self.advice = path, line, rule, advice


def git(*args, check=True):
    r = subprocess.run(["git"] + list(args), capture_output=True, text=True)
    if check and r.returncode != 0:
        raise Unrunnable("git %s — %s" % (" ".join(args), r.stderr.strip()))
    return r.stdout


def in_scope(path):
    return path.endswith(".kt") and path.startswith(ROOTS)


def sources():
    out = []
    for root in ROOTS:
        for d, _, files in os.walk(root):
            out.extend(os.path.join(d, f) for f in files if f.endswith(".kt"))
    return sorted(out)


class Source:
    def __init__(self, path):
        self.path = path
        with open(path, encoding="utf-8") as f:
            self.text = f.read()
        _, self.comment_lines = kotlin_source.mask(self.text)


def slop_findings(src):
    return [Finding(src.path, line, rule, advice)
            for line, rule, advice in slop.check(src.text, src.path)]


def detekt_findings(gradle_args):
    for r in DETEKT_REPORTS:
        if os.path.exists(r):
            os.remove(r)
    # 태스크 실행 기록도 따로 둔다 — 기록은 태스크 경로마다 하나라, 같이 쓰면 평소 빌드가 린트의 클래스패스를 보고 다시 컴파일한다
    cmd = ["./gradlew", "-q", "--init-script", INIT_SCRIPT, "-Pprevue.lintBuildDir=" + LINT_BUILD,
           "--project-cache-dir", LINT_BUILD + "/.gradle"] + gradle_args + ["detektMain", "detektBridge"]
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=PLUGIN)
    if r.returncode != 0 or not all(os.path.exists(p) for p in DETEKT_REPORTS):
        tail = "\n".join((r.stdout + r.stderr).strip().splitlines()[-15:])
        hint = "\n이 머신에 detekt 가 아직 없으면 한 번 sh tools/lint.sh --online 으로 받는다" if "--offline" in gradle_args else ""
        raise Unrunnable("detekt 를 못 돌렸다 (%s)\n%s%s" % (" ".join(cmd), tail, hint))
    found = []
    for report in DETEKT_REPORTS:
        for file_el in ET.parse(report).getroot().iter("file"):
            path = os.path.relpath(file_el.get("name"))
            for e in file_el.iter("error"):
                name = e.get("source", "").split(".")[-1]
                rule = DETEKT_GROUPS.get(name, "detekt/" + name)
                line = int(e.get("line", "1"))
                advice = e.get("message", "").strip()
                if rule in DETEKT_ADVICE:
                    advice = "%s — %s" % (advice, DETEKT_ADVICE[rule])
                found.append(Finding(path, line, rule, advice))
    return found


def viewer_findings():
    """뷰어 날값(D-96)."""
    return [Finding(*f) for f in viewer.check(".")]


def changed_lines(base):
    """기준점(merge-base)에서 작업 트리까지 더하거나 바꾼 줄 {경로: {줄}}. 커밋 안 한 변경 · 새 파일도 넣는다."""
    out = {}
    # 경로를 좁히지 않는다 — 좁히면 밖에서 옮겨 온 파일이 이름 바뀜이 아니라 새 파일로 잡힌다
    diff = git("diff", "-M", "-U0", "--no-color", "--no-ext-diff", base)
    path = None
    for ln in diff.splitlines():
        if ln.startswith("+++ "):
            path = ln[6:] if ln.startswith("+++ b/") else None
        elif ln.startswith("@@") and path:
            m = re.search(r"\+(\d+)(?:,(\d+))?", ln)
            start, count = int(m.group(1)), int(m.group(2) if m.group(2) is not None else 1)
            out.setdefault(path, set()).update(range(start, start + count))
    for path in git("ls-files", "--others", "--exclude-standard", "--", *ROOTS).splitlines():
        if in_scope(path):
            with open(path, encoding="utf-8") as f:
                out[path] = set(range(1, f.read().count("\n") + 2))
    return {p: ls for p, ls in out.items() if in_scope(p)}


def comment_texts(text):
    """{줄: 그 줄의 주석 부분} — 코드 뒤에 붙은 꼬리면 꼬리만."""
    starts = {}
    kotlin_source.mask(text, starts)
    raw = text.split("\n")
    return {ln: raw[ln - 1][col:].strip() for ln, col in starts.items()}


def new_comments(srcs, changed, old_text=lambda path: ""):
    """더하거나 문구를 바꾼 주석. 같은 문구가 기준점에 있으면(옆 코드만 고친 줄 · 옮긴 줄) 새 주석이 아니다."""
    found = []
    for path, lines in sorted(changed.items()):
        src = srcs.get(path)
        if not src:
            continue
        old = Counter(comment_texts(old_text(path)).values())
        said_at = comment_texts(src.text)
        for line in sorted(lines & src.comment_lines):
            said = said_at[line]
            if old[said] > 0:
                old[said] -= 1
                continue
            if EXTERNAL.match(said) and not (line + 1 in src.comment_lines and line + 1 in lines):
                continue
            found.append(Finding(path, line, "comment/new",
                                 "새 주석 — 이유는 이름 · 테스트 · 결정 기록으로 옮긴다. 코드 밖 사실(라이브러리 · 플랫폼)이면 `// 외부:` 한 줄"))
    return found


def renames(name_status):
    """`git diff -M --name-status` 출력에서 {새 경로: 옛 경로}. 옮긴 파일의 주석은 옛 경로의 문구와 대조한다.
    릴리즈 PR 처럼 판이 크면 옮기며 고친 파일이 유사도가 모자라 D · A 로 갈린다 — 파일 이름이 하나씩만 맞으면 짝짓는다."""
    out, gone, added = {}, Counter(), Counter()
    pairs = []
    for ln in name_status.splitlines():
        parts = ln.split("\t")
        if len(parts) == 3 and parts[0].startswith("R"):
            out[parts[2]] = parts[1]
        elif len(parts) == 2 and parts[0] in ("D", "A") and in_scope(parts[1]):
            pairs.append((parts[0], parts[1]))
            (gone if parts[0] == "D" else added)[os.path.basename(parts[1])] += 1
    old_at = {os.path.basename(p): p for s, p in pairs if s == "D"}
    for s, p in pairs:
        name = os.path.basename(p)
        if s == "A" and gone[name] == 1 and added[name] == 1:
            out[p] = old_at[name]
    return out


def main(argv):
    ap = argparse.ArgumentParser(prog="tools/lint.sh", description="Kotlin 슬롭 · 뷰어 날값 린트")
    ap.add_argument("--base", default=os.environ.get("PREVUE_LINT_BASE", "origin/develop"),
                    help="이번 변경의 기준점(기본 origin/develop, 릴리즈 PR 은 origin/main)")
    ap.add_argument("--online", action="store_true", help="Gradle 을 --offline 없이 부른다(CI)")
    args = ap.parse_args(argv)

    root = git("rev-parse", "--show-toplevel").strip()
    os.chdir(root)
    if git("rev-parse", "--verify", "--quiet", args.base + "^{commit}", check=False).strip() == "":
        raise Unrunnable("기준점 %s 이 없다 — git fetch origin 을 하거나 --base 로 준다" % args.base)
    base = git("merge-base", args.base, "HEAD").strip()

    srcs = {p: Source(p) for p in sources()}
    findings = []
    for src in srcs.values():
        findings.extend(slop_findings(src))
    findings.extend(viewer_findings())
    ci = bool(os.environ.get("CI"))
    findings.extend(detekt_findings((["--no-daemon"] if ci else []) + ([] if args.online or ci else ["--offline"])))

    changed = changed_lines(base)
    moved = renames(git("diff", "-M", "--name-status", "--no-ext-diff", base))
    findings.extend(new_comments(srcs, changed, lambda path: git("show", "%s:%s" % (base, moved.get(path, path)), check=False)))

    for f in sorted(findings, key=lambda f: (f.path, f.line, f.rule)):
        print("%s:%d  %s  %s" % (f.path, f.line, f.rule, f.advice))
    groups = Counter(f.rule.split("/")[0] for f in findings)
    order = ["slop", "metric", "dead", "comment", "viewer"]
    parts = " · ".join("%s %d" % (g, groups[g]) for g in sorted(groups, key=lambda g: (order.index(g) if g in order else len(order), g)))
    print("──")
    print("위반 %d%s (기준 %s)" % (len(findings), " (%s)" % parts if parts else "", args.base))
    return 1 if findings else 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except Unrunnable as e:
        print("검사를 못 했다: %s" % e, file=sys.stderr)
        sys.exit(2)
