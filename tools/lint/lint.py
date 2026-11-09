"""tools/lint.sh 의 본체 — 슬롭 규칙 · detekt(지표 · 죽은 코드 · 층 규칙) · 새 주석 · 뷰어 날값(viewer.py)을 모아 판정한다.

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

PLUGIN = "plugin/daemon"


LAYERS_KEY = re.compile(r"prevue\.layers(?:\s*[=:]\s*|\s+)(.*)")


def read_layers(properties):
    """gradle.properties 본문에서 층 모듈의 폴더(plugin/daemon 기준). settings 가 java.util.Properties 로 읽으니 그 규칙대로 —
    키 앞 공백 · `=` `:` 공백 구분자 · 주석(# !) · 같은 키는 마지막 것. 줄 이음(\\)은 쓰지 않는다"""
    value = None
    for line in properties.splitlines():
        line = line.lstrip()
        m = None if line.startswith(("#", "!")) else LAYERS_KEY.fullmatch(line.rstrip())
        if m:
            value = m.group(1)
    layers = tuple(x for x in (v.strip() for v in (value or "").split(",")) if x)
    if not layers:
        raise ValueError("prevue.layers 가 없다")
    return layers


# 조립 · 브리지는 :daemon(D-140 · D-148) — 루트(plugin/daemon)에는 빌드 파일만 있다.
# lint.sh 는 사용자의 cwd 에서 부른다 — 저장소 루트로 옮기기(main) 전에 읽으므로 이 파일 기준으로 찾는다
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", PLUGIN, "gradle.properties"), encoding="utf-8") as _f:
    MODULES = read_layers(_f.read())
# build-logic(D-140)의 convention plugin 도 제품 소스다 — 같은 규칙으로 본다. detekt 만 싣지 않는다(detekt.init.gradle.kts)
ROOTS = ("plugin/daemon/daemon/src/main/kotlin/", "plugin/daemon/daemon/src/bridge/kotlin/", "plugin/daemon/build-logic/src/main/kotlin/") + tuple(
    "plugin/daemon/%s/src/main/kotlin/" % m for m in MODULES)
# 옮기기 전의 자리 — 헥사고날 두 원 앞(D-148), adapter 를 둘로 가르기 앞(D-141), :app 앞(D-140)과 plugin/daemon/ 앞(D-136), plugin/ 앞(D-123).
# 그 판과 견주는 diff 에서 옮긴 파일의 옛 경로가 여기 있다
OLD_ROOTS = tuple("plugin/daemon/%s/src/main/kotlin/" % m for m in ("entity", "domain", "json", "adapter/infra", "adapter/entry", "app")) + (
             "plugin/daemon/app/src/bridge/kotlin/",
             "plugin/daemon/adapter/src/main/kotlin/", "plugin/daemon/src/main/kotlin/", "plugin/daemon/src/bridge/kotlin/",
             "plugin/src/main/kotlin/", "plugin/src/bridge/kotlin/", "src/main/kotlin/", "src/bridge/kotlin/")
# 린트의 빌드 디렉터리 · 실행 기록 — 평소 빌드의 build/classes · .gradle 을 건드리지 않게 init script 에 넘긴다
LINT_BUILD = "build/lint"


def detekt_reports(modules):
    """모듈의 빌드 디렉터리는 init script 가 LINT_BUILD/<프로젝트 경로> 로 둔다(`:a:b` → a/b) — 끝 이름이 같은 모듈이 있어도 겹치지 않는다.
    폴더가 프로젝트 경로를 그대로 따른다(Gradle 기본). 소스가 없는 루트 · 빈 부모의 보고서는 기대하지 않는다"""
    return tuple("%s/%s/daemon/reports/detekt/%s.xml" % (PLUGIN, LINT_BUILD, s) for s in ("main", "bridge")) + tuple(
        "%s/%s/%s/reports/detekt/main.xml" % (PLUGIN, LINT_BUILD, m) for m in modules)


DETEKT_REPORTS = detekt_reports(MODULES)
# 층 규칙의 심은 위반은 :application 의 전용 태스크가 따로 보고한다(detekt.init.gradle.kts) — detektMain 의 baseline · excludes 를 타지 않는다
SEED_TASK = ":application:detektLayerSeeds"
SEED_REPORT = "%s/%s/application/reports/detekt/layerSeeds.xml" % (PLUGIN, LINT_BUILD)
EXTERNAL = re.compile(r"^//\s*외부:")
INIT_SCRIPT = os.path.abspath(os.path.join(os.path.dirname(__file__), "detekt.init.gradle.kts"))
DETEKT_CONFIG = "tools/lint/detekt.yml"
# 층 규칙의 심은 위반 — 판을 올리면 갈래가 말없이 죽을 수 있다. 줄 끝의 `// 잡는다 <규칙 이름/갈래> …` 가 기대다
LAYER_SEEDS = "tests/lint/layer"
SEED_MARK = re.compile(r"//\s*잡는다\s+(\S+(?:\s+\S+)*)\s*$")

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
    def __init__(self, path, line, rule, advice, source=None):
        self.path, self.line, self.rule, self.advice, self.source = path, line, rule, advice, source


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


def slop_findings(src, known_qualifiers=()):
    return [Finding(src.path, line, rule, advice)
            for line, rule, advice in slop.check(src.text, src.path, known_qualifiers)]


def detekt_findings(gradle_args):
    for r in DETEKT_REPORTS + (SEED_REPORT,):
        if os.path.exists(r):
            os.remove(r)
    # 태스크 실행 기록도 따로 둔다 — 기록은 태스크 경로마다 하나라, 같이 쓰면 평소 빌드가 린트의 클래스패스를 보고 다시 컴파일한다
    cmd = ["./gradlew", "-q", "--init-script", INIT_SCRIPT, "-Pprevue.lintBuildDir=" + LINT_BUILD,
           "-Pprevue.layerSeeds=" + os.path.abspath(LAYER_SEEDS),
           "--project-cache-dir", LINT_BUILD + "/.gradle"] + gradle_args + ["detektMain", "detektBridge", SEED_TASK]
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=PLUGIN)
    if r.returncode != 0 or not all(os.path.exists(p) for p in DETEKT_REPORTS + (SEED_REPORT,)):
        tail = "\n".join((r.stdout + r.stderr).strip().splitlines()[-15:])
        hint = "\n이 머신에 detekt 가 아직 없으면 한 번 sh tools/lint.sh --online 으로 받는다" if "--offline" in gradle_args else ""
        raise Unrunnable("detekt 를 못 돌렸다 (%s)\n%s%s" % (" ".join(cmd), tail, hint))
    found = [f for report in DETEKT_REPORTS for f in report_findings(report)]
    check_no_stray_seeds(found)
    seeded = [f for f in report_findings(SEED_REPORT) if f.source.startswith(LAYER_RULES)]
    check_seeds(seed_expectations(), seeded)
    return found


def check_no_stray_seeds(found):
    """본 태스크 보고서에 심은 위반이 섞이면 그 파일이 판정 대상에 들어간 것이다 — 심은 위반은 전용 태스크에서만 돈다(종료 2)."""
    stray = sorted({f.path for f in found if f.path.startswith(LAYER_SEEDS + "/")})
    if stray:
        raise Unrunnable("심은 위반(%s)이 본 detekt 태스크에 실렸다 — 전용 태스크(%s)에서만 돈다: %s" % (LAYER_SEEDS, SEED_TASK, ", ".join(stray)))


def report_findings(report):
    found = []
    for file_el in ET.parse(report).getroot().iter("file"):
        name = file_el.get("name")
        path = os.path.relpath(name if os.path.isabs(name) else os.path.join(PLUGIN, name))
        for e in file_el.iter("error"):
            name = e.get("source", "").split(".")[-1]
            rule = layer_rule(name) or DETEKT_GROUPS.get(name, "detekt/" + name)
            line = int(e.get("line", "1"))
            advice = e.get("message", "").strip()
            if rule in DETEKT_ADVICE:
                advice = "%s — %s" % (advice, DETEKT_ADVICE[rule])
            found.append(Finding(path, line, rule, advice, source=name))
    return found


def check_seeds(expected, seeded):
    """심은 위반을 층 규칙이 정확히 잡았나 — 아니면 통과가 아무것도 말하지 않는다(종료 2). 심은 파일의 다른 규칙 결과는 보지 않는다."""
    with open(DETEKT_CONFIG, encoding="utf-8") as f:
        bare = layer_branches(f.read()) - {rule for _, _, rule in expected}
    if bare:
        raise Unrunnable("심은 위반이 없는 층 규칙 갈래 — %s 에 `// 잡는다 <규칙 이름/갈래>` 줄을 함께 둔다: %s" % (LAYER_SEEDS, ", ".join(sorted(bare))))
    if expected and not seeded:
        raise Unrunnable("심은 위반(%s)이 detekt 에 하나도 실리지 않았다 — 전용 태스크(%s)의 소스를 init script 가 싣는지 본다" % (LAYER_SEEDS, SEED_TASK))
    missed, extra = seed_mismatch(expected, seeded)
    if missed or extra:
        raise Unrunnable("층 규칙이 심은 위반(%s)과 어긋난다 — 통과가 아무것도 말하지 않는다\n%s" % (
            LAYER_SEEDS, "\n".join(["못 잡았다  %s:%d  %s" % m for m in missed] + ["더 잡았다  %s:%d  %s" % e for e in extra])))


def seed_expectations(root=LAYER_SEEDS):
    """심은 위반 파일의 기대 [(경로, 줄, 규칙)] — 규칙은 detekt 의 이름 그대로다(ForbiddenImport/application 과 ForbiddenMethodCall/application 을 가른다).
    한 줄을 두 갈래가 함께 잡으면 표시에 둘 다 적는다"""
    out = []
    for d, _, files in os.walk(root):
        for name in sorted(f for f in files if f.endswith(".kt")):
            path = os.path.join(d, name)
            with open(path, encoding="utf-8") as f:
                for n, line in enumerate(f, 1):
                    m = SEED_MARK.search(line)
                    if m:
                        out.extend((path, n, rule) for rule in m.group(1).split())
    return out


def seed_mismatch(expected, seeded):
    """(못 잡은 것, 더 잡은 것) — 더 잡은 것도 어긋남이다. 허용 목록 · 경로 한정이 금지를 못 이기면 거기서 드러난다.
    개수로 견준다 — 한 줄을 같은 갈래가 두 번 잡아도 어긋남이다"""
    want, got = Counter(expected), Counter((f.path, f.line, f.source) for f in seeded)
    return sorted((want - got).elements()), sorted((got - want).elements())


def layer_branches(config):
    """detekt 설정의 층 규칙 갈래 이름(ForbiddenImport/controller …)."""
    return {m.group(1) for m in re.finditer(r"^\s+((?:%s)\S+):" % "|".join(LAYER_RULES), config, re.M)}


LAYER_RULES = ("ForbiddenImport/", "ForbiddenMethodCall/")


def layer_rule(name):
    """층 규칙(D-150)은 ForbiddenImport · ForbiddenMethodCall 을 경로마다 따로 건 갈래다(`ForbiddenImport/controller`) — 갈래 이름으로 묶는다."""
    return "layer/" + name.split("/", 1)[1] if name.startswith(LAYER_RULES) else None


def path_globs(config):
    """detekt 설정의 includes · excludes 에서 (줄, glob, 문제). 목록은 `[...]` 한 벌이고 여러 줄에 걸칠 수 있다."""
    out, open_list = [], False
    for n, line in enumerate(config.split("\n"), 1):
        head = re.match(r"\s*(includes|excludes):\s*(.*)", line)
        if head and not head.group(2).startswith("["):
            out.append((n, head.group(1), "`[...]` 목록으로 쓴다 — 이 검사가 다른 모양을 못 읽는다"))
            continue
        if head:
            open_list = True
        if open_list:
            out.extend((n, g, None) for g in re.findall(r"""['"]([^'"]*)['"]""", line))
            open_list = "]" not in line
    return out


def glob_regex(glob):
    parts = re.split(r"(\*\*/|\*\*|\*)", glob)
    return re.compile("".join({"**/": "(?:.*/)?", "**": ".*", "*": "[^/]*"}.get(p, re.escape(p)) for p in parts))


def empty_includes(config, paths):
    """파일을 하나도 못 고르는 includes · excludes — 폴더 이름이 바뀌면 그 층 규칙이 말없이 통과한다.
    detekt 는 절대 경로에 견준다 — 어디서 돌든 같은 뜻이 되게 `**/` 로 시작하고 `{ ? [` 없이 쓴 glob 만 읽는다."""
    found = []
    for n, g, problem in path_globs(config):
        if problem is None and (not g.startswith("**/") or re.search(r"[{?\[]", g)):
            problem = "`**/` 로 시작하고 `{ ? [` 없이 쓴다 — 이 검사가 detekt 와 같은 뜻으로 읽게"
        if problem is None:
            rx = glob_regex(g)
            if not any(rx.fullmatch(p) for p in paths):
                problem = "`%s` 가 본체 파일을 하나도 못 고른다 — 폴더를 옮겼으면 glob 을 고친다" % g
        if problem:
            found.append(Finding(DETEKT_CONFIG, n, "layer/empty-includes", problem))
    return found


def viewer_findings():
    """뷰어 날값(D-96)."""
    try:
        return [Finding(*f) for f in viewer.check(".")]
    except RuntimeError as error:
        raise Unrunnable(str(error)) from error


def changed_lines(base):
    """기준점(merge-base)에서 작업 트리까지 더하거나 바꾼 줄 {경로: {줄}}. 커밋 안 한 변경 · 새 파일도 넣는다."""
    out = {}
    # 옛 자리도 넣는다 — 새 자리만 주면 옮겨 온 파일이 이름 바뀜이 아니라 새 파일로 잡힌다
    diff = git("diff", "-M", "-U0", "--no-color", "--no-ext-diff", base, "--", *(ROOTS + OLD_ROOTS))
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
        elif len(parts) == 2 and parts[0] in ("D", "A") and (in_scope(parts[1]) or parts[0] == "D" and parts[1].endswith(".kt") and parts[1].startswith(OLD_ROOTS)):
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
    known = set().union(*(slop.qualifiers(src.text) for src in srcs.values()))
    for src in srcs.values():
        findings.extend(slop_findings(src, known))
    findings.extend(viewer_findings())
    ci = bool(os.environ.get("CI"))
    with open(DETEKT_CONFIG, encoding="utf-8") as f:
        findings.extend(empty_includes(f.read(), list(srcs)))
    findings.extend(detekt_findings((["--no-daemon"] if ci else []) + ([] if args.online or ci else ["--offline"])))

    changed = changed_lines(base)
    moved = renames(git("diff", "-M", "--name-status", "--no-ext-diff", base, "--", *(ROOTS + OLD_ROOTS)))
    findings.extend(new_comments(srcs, changed, lambda path: git("show", "%s:%s" % (base, moved.get(path, path)), check=False)))

    for f in sorted(findings, key=lambda f: (f.path, f.line, f.rule)):
        print("%s:%d  %s  %s" % (f.path, f.line, f.rule, f.advice))
    groups = Counter(f.rule.split("/")[0] for f in findings)
    order = ["slop", "metric", "dead", "layer", "comment", "viewer"]
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
