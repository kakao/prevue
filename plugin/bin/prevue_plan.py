"""CLI 의 판정. 무엇이 있는지 보고(관찰) 무엇을 할지 정한다 — 모듈 · 변형 · 덤프 유효성 · 리소스 제공자 · health 병합 · Gradle 오류.

bash(bin/prevue)는 인자를 모아 여기를 부르고, 자리 계산·curl·Gradle 실행만 한다. 여기서는 네트워크를 만지지 않고
프로세스도 띄우지 않는다 — 파일만 읽으므로 가짜 저장소 트리로 판정 전부를 시험할 수 있다(tests/cli).
macOS 기본 python3(3.9)에서 돈다.
"""

import json
import os
import re
import sys
import time

# 덤프 규약 번호. 덤프에 적히는 경로 규칙이 바뀌면 여기와 init 스크립트를 함께 올린다.
# 도구 버전이 아니라 이 숫자로 판정하므로, 규약이 그대로인 패치에서는 아무도 다시 뜨지 않는다.
# 옛 규약을 받아 주는 길은 없다 — 번호가 다르면 다시 뜬다.
SCHEMA = 3

# 덤프 JSON 의 자리. 테스트가 가짜 홈으로 바꾼다.
PROJECTS = os.path.join(os.path.expanduser("~"), ".prevue", "projects")

# AGP가 변형별로 가르는 디렉터리들. 여기 있는 이름이 그 모듈에 **실재하는** 변형이다.
# 어느 것이 debug 계열인지는 여기서 고르지 않는다 — 이름을 그대로 올려 보낸다.
VARIANT_DIRS = ("compile_symbol_list javac runtime_library_classes_jar runtime_library_classes_dir compile_library_classes_jar "
                "built_in_kotlinc packaged_res merged_res classes").split()


# ── 관찰 ────────────────────────────────────────────────────────────────────
# 여기서 하는 일은 **무엇이 있는지 보는 것**뿐이다. 무엇이 앱 모듈인지는 판정하지 않는다 —
# 저장소마다 다르고, 규칙으로 박으면 남의 프로젝트에서 틀린다. 관찰된 후보가 하나뿐일 때만 코드가 넘긴다.

def repo_key(repo):
    """저장소 루트 → ~/.prevue/projects 아래의 키. bash repo_key 와 같은 문자열이다."""
    return repo.lstrip("/").replace("/", "_")


_layouts = {}


def module_layout(repo):
    """settings 가 정한 모듈 경로 → 디렉터리. projectDir 을 옮긴 저장소(`:widgets` → core/design/widgets)에서는 경로로 짐작할 수 없다.
    덤프마다 settings 전체를 실으므로 이 저장소의 가장 새 덤프 하나에서 읽는다. 덤프가 아직 없으면 빈 것 — 그때는 경로로 짐작한다."""
    d = os.path.join(PROJECTS, repo_key(repo))
    try:
        dumps = sorted(((os.path.getmtime(p), p) for p in (os.path.join(d, n) for n in os.listdir(d) if n.endswith(".json"))), reverse=True)
    except OSError:
        return {}
    for key in dumps:
        if key not in _layouts:
            try:
                with open(key[1], encoding="utf-8") as f:
                    _layouts[key] = json.load(f).get("moduleDirs") or {}
            except Exception:
                _layouts[key] = {}
        if _layouts[key]:
            return _layouts[key]
    return {}


def module_dir(repo, module):
    return module_layout(repo).get(module) or os.path.join(repo, module.lstrip(":").replace(":", "/"))


def module_of(repo, path):
    """가장 가까운 build.gradle 이 그 파일의 모듈이다. 판단이 아니라 위치다. 저장소 루트까지 없으면 None."""
    by_dir = {v: k for k, v in module_layout(repo).items() if k != ":"}
    d = os.path.abspath(path)
    if not os.path.isdir(d):
        d = os.path.dirname(d)
    while d != "/" and d != repo:
        if d in by_dir:
            return by_dir[d]
        if os.path.isfile(os.path.join(d, "build.gradle.kts")) or os.path.isfile(os.path.join(d, "build.gradle")):
            return ":" + os.path.relpath(d, repo).replace("/", ":")
        d = os.path.dirname(d)
    return None


# include( … ) 의 괄호 안, 괄호가 없는 Groovy 는 쉼표로 끝나는 줄까지. includeBuild 는 \b 에서 걸러진다.
INCLUDE = re.compile(r"\binclude\b\s*(?:\(([^)]*)\)|((?:[^\n]*,[ \t]*\n)*[^\n]*))")


def settings_modules(repo):
    """settings.gradle 의 include 인자를 그대로 읽는다. 여러 줄 include 도 잡는다.

    콜론 없는 이름도 모듈이다 — `include("app")`처럼 적은 저장소에서 콜론으로 시작하는 문자열만 줍던 때는 앱 모듈을 못 봐
    라이브러리의 리소스 제공자를 못 골랐다. include 밖의 문자열은 모듈이 아니다(excludedTaskNames 에 든 태스크 경로 등).
    덤프가 settings 의 모듈 목록을 실었으면 그것이 먼저다 — settings 플러그인이 include 하는 저장소는 글자로 못 읽는다.
    """
    layout = [m for m in module_layout(repo) if m != ":"]
    if layout:
        return layout
    for name in ("settings.gradle.kts", "settings.gradle"):
        p = os.path.join(repo, name)
        if os.path.isfile(p):
            with open(p, encoding="utf-8", errors="ignore") as f:
                t = f.read()
            t = re.sub(r"//[^\n]*", "", re.sub(r"/\*.*?\*/", "", t, flags=re.S))   # 주석 처리한 include 는 없는 모듈이다
            mods = []
            for m in INCLUDE.finditer(t):
                for s in re.findall(r"[\"']([A-Za-z0-9_.:-]+)[\"']", m.group(1) if m.group(1) is not None else m.group(2)):
                    mods.append(s if s.startswith(":") else ":" + s)
            return list(dict.fromkeys(mods))
    return []


def variants_observed(repo, module):
    d = os.path.join(module_dir(repo, module), "build", "intermediates")
    names = set()
    for n in VARIANT_DIRS:
        p = os.path.join(d, n)
        if os.path.isdir(p):
            names.update(x for x in os.listdir(p) if not x.startswith("."))
    return sorted(names)


def _first_apk(d, depth):
    # find -maxdepth 2 의 첫 결과와 같은 순서 — 디렉터리 순서대로 깊이 우선
    try:
        entries = list(os.scandir(d))
    except OSError:
        return None
    for e in entries:
        if e.name.endswith((".ap_", ".apk")):
            return e.path
        if depth < 2 and e.is_dir():
            hit = _first_apk(e.path, depth + 1)
            if hit:
                return hit
    return None


def resource_apks(repo):
    """리소스 APK가 실제로 디스크에 있는 곳. [{"module", "variant", "path"}]"""
    rows = []
    for m in settings_modules(repo):
        for cat in ("linked_resources_binary_format", "processed_res"):
            d = os.path.join(module_dir(repo, m), "build", "intermediates", cat)
            if not os.path.isdir(d):
                continue
            for v in sorted(os.listdir(d)):
                vdir = os.path.join(d, v)
                if not os.path.isdir(vdir):
                    continue
                f = _first_apk(vdir, 1)
                if f:
                    rows.append({"module": m, "variant": v, "path": f})
    return rows


# ── 변형 규칙 ────────────────────────────────────────────────────────────────
# 사람에게 묻지 않고 찍되, 무엇으로 찍었는지(by)를 함께 돌려준다.
# 1순위는 **최신성**이다 — 이미 구워 둔 변형을 고르면 warmup 이 산출물을 재사용해 몇 초로 끝나고, 아니면 의존 모듈까지
# 처음부터 컴파일한다(이슈 #3: 알파벳 첫째 dev2Debug 를 골라 23개 모듈 6분, 개발자가 빌드하던 것은 devDebug).
# flavor 가 많은 저장소에서 개발자가 쓰는 변형은 브랜치마다 달라 정렬 규칙으로는 따라가지 못한다.
# 최신성이 없으면(한 번도 빌드 안 됨) Android Studio 의 기본 규칙으로 찍는다 — isDefault, 없으면 debug + 차원마다 알파벳 첫째.
# 여기서는 debug 계열만 받는다(하드 제약: 릴리스·minify 는 클릭을 코드로 잇는 소스 정보를 지운다). 틀리면 --variant 로 바꾼다.

def _cap(s):
    return s[:1].upper() + s[1:]


# KMP 의 Android 라이브러리 플러그인은 변형이 이것 하나뿐이다(빌드 타입이 없다). debug 가 아니어도 소스 정보가 들어 있어(Kotlin 2.1.20 기본값)
# 클릭을 코드로 잇는 데 문제가 없다(D-108).
KMP_VARIANT = "androidMain"


def _is_debug(n):
    if n == KMP_VARIANT:
        return True
    return (n == "debug" or n.endswith("Debug")) and "UnitTest" not in n and "AndroidTest" not in n


def flavor_key(name):
    """AS 가 고르는 순서의 키. 변형 이름이 아니라 **플레이버 이름**을 차원마다 견준다.

    이름 전체를 문자열로 정렬하면 dev2Debug 가 devDebug 보다 앞선다('2' < 'D') — AS 는 플레이버 dev < dev2 로 devDebug 를 고른다.
    AGP 는 이름을 첫 플레이버 + 나머지 플레이버(첫 글자 대문자) + 빌드 타입으로 짓는다. 빌드 타입을 떼고 대문자 경계에서 자르면
    차원별 플레이버가 된다. 플레이버 이름 자체에 대문자가 있으면 잘못 자르지만 드물고, --variant 로 덮는다.
    """
    base = name[:-len("Debug")] if name.endswith("Debug") else ("" if name == "debug" else name)
    return [p.lower() for p in re.split(r"(?=[A-Z])", base) if p]


def last_built(module_dir_, name):
    """이 변형을 마지막으로 **실제로** 컴파일한 시각(epoch). 모르면 None.

    코틀린 플러그인이 컴파일을 돌 때마다 cacheable/last-build.bin 을 갱신한다(UP-TO-DATE 면 안 건드린다) — 파일 하나라 싸다.
    산출물 폴더의 mtime 은 바로 아래 항목이 바뀔 때만 움직여 증분 빌드를 못 따라가고(실측: 폴더 09-22 · 안의 최신 09-28),
    안을 다 뒤지면 대형 앱 모듈에서 3초라 health 마다 치를 수 없다. 코틀린 플러그인 내부 경로라 바뀔 수 있다 — 바뀌면 None 이 되어
    다음 순위로 넘어갈 뿐이다(개발 문서 버전 핀).
    """
    # KMP 는 태스크 이름이 다르다 — 새 플러그인 compileAndroidMain, 옛 조합 compile<변형>KotlinAndroid
    # 둘이 함께 있으면(KMP 로 옮긴 모듈의 옛 기록) 새것을 본다
    times = []
    for task in ("compile%sKotlin" % _cap(name), "compile%sKotlinAndroid" % _cap(name), "compile%s" % _cap(name)):
        try:
            times.append(os.path.getmtime(os.path.join(module_dir_, "build", "kotlin", task, "cacheable", "last-build.bin")))
        except OSError:
            pass
    return max(times) if times else None


def pick_fresh(module_dir_, names):
    """(변형, 시각) — 가장 최근에 컴파일된 debug 변형. 없으면 (None, None). 동률이면 AS 순서."""
    best = None
    for n in sorted(set(filter(_is_debug, names)), key=flavor_key):
        t = last_built(module_dir_, n)
        if t is not None and (best is None or t > best[1]):
            best = (n, t)
    return best or (None, None)


def pick(names, default_hint=None):
    """(변형 이름, 근거). 최신성이 없을 때 쓰는 AS 규칙이다. 근거는 isDefault · rule 이고, 고를 것이 없으면 ("", "")."""
    debugs = sorted(set(filter(_is_debug, names)), key=flavor_key)
    if default_hint:
        flavors = default_hint.get("flavors") or []
        bt = default_hint.get("buildType") or ""
        want = "".join(f if i == 0 else _cap(f) for i, f in enumerate(flavors))
        if bt:
            want = want + _cap(bt) if want else bt
        if want in debugs:
            return want, "isDefault"
    if debugs:
        return debugs[0], "rule"
    return "", ""


def resource_variant(repo, module, want):
    """리소스를 빌릴 모듈의 변형. 그 모듈에 같은 이름이 있으면 그것이고(nowinandroid demoDebug ↔ demoDebug), 없으면 그 모듈의 규칙대로 찍는다 —
    앱에만 플레이버가 있으면 이름이 안 맞는다(core:ui debug ↔ app devDebug). 여태 라이브러리 변형을 그대로 넘겨 덤프가 실패했다."""
    names = variants_observed(repo, module)
    if not want or want in names:
        return want
    v, _ = pick_fresh(module_dir(repo, module), names)
    return v or pick(names)[0] or want


# ── 덤프 ─────────────────────────────────────────────────────────────────────

def dump_path(projects, repo, module, variant):
    """덤프 JSON 은 저장소 밖에 둔다(NFR-2). bash dump_out 과 같은 경로다."""
    return os.path.join(projects, repo_key(repo), "%s-%s.json" % (module.lstrip(":").replace(":", "_"), variant))


def dump_why(path):
    """못 쓰는 이유. 쓸 수 있으면 None.

    파일이 있다고 쓸 수 있는 것이 아니다. 낡은 규약도 문제지만, clean 한 저장소에서는
    덤프가 멀쩡히 남은 채 **가리키는 산출물만 사라진다** — 그대로 start 하면 JVM 이 뜨다가
    "모듈명을 정할 수 없다"로 죽는다(실측). 이유가 한 겹 아래 숨는 그 모양을 여기서 끊는다.
    """
    if not path or not os.path.exists(path):
        return None if path is None else "missing"
    try:
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
    except Exception:
        return "unreadable"
    if d.get("schema") != SCHEMA:
        return "taken with an old schema — take it again"
    mod = d.get("project", "").strip(":").replace(":", "/")
    at = (d.get("moduleDirs") or {}).get(d.get("project"))
    own = [q for q in d.get("projectClassPath", [])
           if (q.startswith(at + "/build/") if at else "/%s/build/" % mod in q)] or d.get("projectClassPath", [])
    if own and not any(os.path.exists(q) for q in own):
        return "the outputs it points to are gone — if you cleaned, run setup again"
    changed = build_files_changed(path, d)
    if changed:
        return "build files changed after the dump (%s) — take it again" % ", ".join(changed)
    return None


# 바뀌면 덤프가 낡는 빌드 파일 — 모듈 · 의존 · 저장소 구성이 여기서 정해진다. 데몬의 감시 목록(ClasspathSpec.buildFiles)과 같은 것이다.
# 산출물만 보면 놓친다: 모듈을 개명하면 옛 자리의 build/ 가 디스크에 남아(git 이 지우지 않는다) 낡은 덤프가 가리키는 jar 가
# 멀쩡히 있다 — health 가 준비됨으로 답하고 렌더가 옛 R 을 찾다 전부 실패했다(이슈 #152).
ROOT_BUILD_FILES = ("build.gradle.kts", "build.gradle", "settings.gradle.kts", "settings.gradle",
                    "gradle.properties", "gradle/libs.versions.toml")


def build_files(repo, module):
    """저장소 상대 경로 목록. 없는 파일도 싣는다 — 새로 생긴 것도 바뀐 것이다."""
    mod = module.strip(":").replace(":", "/")
    own = [mod + "/build.gradle.kts", mod + "/build.gradle"] if mod else []   # 루트 프로젝트(":")는 루트 파일이 곧 제 것이다
    return own + list(ROOT_BUILD_FILES)


def _digest(path):
    import hashlib
    try:
        with open(path, "rb") as f:
            return hashlib.sha1(f.read()).hexdigest()
    except OSError:
        return None


def stamp_build_files(dump, repo, since=None):
    """warmup 이 뜬 덤프에 빌드 파일의 내용 지문을 적는다. 시각이 아니라 내용이다 — 브랜치를 갔다 오면 mtime 만 새것이 되어
    헛 warmup 을 부른다. since(Gradle 을 부르기 전, epoch 초) 뒤에 바뀐 파일은 덤프가 그 내용을 봤는지 몰라 지문을 비워 둔다 —
    다음 health 가 다시 뜨라고 한다."""
    with open(dump, encoding="utf-8") as f:
        d = json.load(f)

    def mark(rel):
        p = os.path.join(repo, rel)
        if since is not None and os.path.isfile(p) and os.path.getmtime(p) > since:
            return "changed-during-warmup"
        return _digest(p)
    d["repo"] = repo
    d["buildFiles"] = {rel: mark(rel) for rel in build_files(repo, d.get("project", ""))}
    tmp = dump + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False)
    os.replace(tmp, dump)


def build_files_changed(path, d):
    """덤프 뒤에 바뀐 빌드 파일(저장소 상대 경로). 지문이 없는 옛 덤프는 mtime 으로 본다 — 저장소 루트는 자기 산출물 경로에서 읽는다."""
    module = d.get("project", "")
    marks = d.get("buildFiles")
    if isinstance(marks, dict) and d.get("repo"):
        repo = d["repo"]
        return [rel for rel in build_files(repo, module) if _digest(os.path.join(repo, rel)) != marks.get(rel)]
    mark = "/%s/build/" % module.strip(":").replace(":", "/")
    roots = [q[:q.index(mark)] for q in d.get("projectClassPath", []) if mark in q]
    if not roots:
        return []
    repo, at = roots[0], os.path.getmtime(path)
    return [rel for rel in build_files(repo, module)
            if os.path.isfile(os.path.join(repo, rel)) and os.path.getmtime(os.path.join(repo, rel)) > at]


def dump_ok(path):
    return bool(path) and os.path.exists(path) and dump_why(path) is None


# ── 리소스 제공자 ─────────────────────────────────────────────────────────────
# 관찰로만 좁힌다 — 틀린 테마는 화면이 뜨긴 뜨는데 다르게 떠서 알아채기 어렵다(개발 문서). 앱 덤프가 이 모듈을 담지 않으면
# 그 앱의 테마는 이 화면의 것이 아니므로 뺀다. 그래도 둘 이상이면(core:ui 처럼 두 앱이 함께 담는 모듈) 사람이 고르고, 그 답을 기억한다.
# 변형 이름이 맞는 앱을 고르는 식의 짐작은 하지 않는다.

REMEMBERED = "resources-from.json"


def _app_holds(projects_dir, module):
    """{앱 모듈: 그 앱의 덤프가 이 모듈을 담는가}. 덤프가 없는 앱은 싣지 않는다(모른다).
    파일 이름이 아니라 덤프의 project 로 앱을 가린다 — 접두로 가르면 app- 이 app-nia-catalog- 에도 걸린다."""
    seg = "/%s/build/" % module.lstrip(":").replace(":", "/")
    holds = {}
    if not os.path.isdir(projects_dir):
        return holds
    for f in sorted(os.listdir(projects_dir)):
        if not f.endswith(".json") or f == REMEMBERED:
            continue
        try:
            with open(os.path.join(projects_dir, f), encoding="utf-8") as fh:
                d = json.load(fh)
        except Exception:
            continue
        app = d.get("project")
        if app:
            holds[app] = holds.get(app, False) or any(seg in q for q in d.get("projectClassPath", []))
    return holds


def dump_hosts(path, repo, module):
    """이 앱 덤프로 이 모듈을 그릴 수 있는가 — 렌더 클래스패스에 그 모듈의 산출물이 있고 디스크에 실재한다.
    데몬이 앱 클래스패스로 그릴지 가르는 것(ClasspathSpec.forRender 의 onApp)과 같은 기준이다. 실재까지 보는 것은
    그 모듈만 clean 했을 때 앱 덤프가 사라진 jar 를 가리켜 첫 렌더가 ClassNotFound 로 죽기 때문이다."""
    try:
        with open(path, encoding="utf-8") as f:
            cp = json.load(f).get("classPath", [])
    except Exception:
        return False
    d = module_dir(repo, module)
    pres = {d + "/build/", os.path.realpath(d) + "/build/"}
    return any(any(q.startswith(p) for p in pres) and os.path.exists(q) for q in cp)


def remembered(projects_dir, module):
    try:
        with open(os.path.join(projects_dir, REMEMBERED), encoding="utf-8") as f:
            return json.load(f).get(module, "")
    except Exception:
        return ""


def remember(projects_dir, module, provider):
    p = os.path.join(projects_dir, REMEMBERED)
    try:
        with open(p, encoding="utf-8") as f:
            d = json.load(f)
    except Exception:
        d = {}
    d[module] = provider
    os.makedirs(projects_dir, exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=1)


def pick_provider(rows, module, projects_dir):
    """(빌릴 모듈 또는 "", 근거, 남은 후보). 근거는 only(APK가 하나) · contains(이 모듈을 담은 앱이 하나) · remembered(전에 고른 것)."""
    mods = sorted({r["module"] for r in rows})
    if len(mods) == 1:
        return mods[0], "only", mods
    holds = _app_holds(projects_dir, module)
    # 어느 앱도 담지 않았다면 덤프가 이 모듈보다 낡은 것이다 — 좁힐 근거가 못 되니 전부 남긴다
    left = [m for m in mods if holds.get(m) is not False] or mods
    if len(left) == 1:
        return left[0], "contains", left
    mem = remembered(projects_dir, module)
    if mem in left:
        return mem, "remembered", left
    return "", "", left


# ── plan(resolve) ───────────────────────────────────────────────────────────

def plan(repo, module, variant, file, toolchain, gradle_jdk, projects):
    """(응답, 종료 코드). 0 준비됨 · 1 툴체인·덤프 없음 · 2 고를 것이 남았다(스킬이 사람에게 묻는다). Gradle 을 부르지 않는다.

    gradle_jdk 는 "<경로>\\t<출처>" — warmup 이 Gradle 을 부를 JDK 다. ps 를 봐야 해서 bash 가 정해 넘긴다.
    """
    moddir = module_dir(repo, module)
    variants = variants_observed(repo, module)
    vfrom = ""
    # 이 모듈이 아직 한 번도 안 빌드됐으면 변형 이름이 없다. 그때는 저장소의 다른 모듈에서 이름을 본다.
    if not variants:
        for m in settings_modules(repo):
            variants = variants_observed(repo, m)
            if variants:
                vfrom = m
                break
    rows = resource_apks(repo)
    projects_dir = os.path.join(projects, repo_key(repo))

    # 변형은 묻지 않고 찍는다. 근거는 순서대로 —
    #   given     --variant 로 받았다
    #   fresh     이 모듈에서 가장 최근에 컴파일된 debug 변형. 구워 둔 것을 골라야 warmup 이 몇 초로 끝난다(이슈 #3)
    #   isDefault 이 저장소의 어느 덤프가 적어 둔 빌드 파일의 isDefault
    #   rule      관찰된 이름 중 debug 계열·차원마다 플레이버 알파벳 첫째(AS 규칙). 관찰이 없으면 다른 덤프가 적어 둔 variantsKnown 에서
    #   assumed   아무것도 관찰되지 않은 clean 저장소 — "debug" 로 두고 Gradle 이 후보를 말하면 warmup 이 규칙으로 다시 고른다
    # 전에 뜬 덤프(record)는 고르는 근거로 쓰지 않는다 — 브랜치를 바꿔 다른 변형을 빌드하면 옛 덤프는 묵은 산출물을 가리켜,
    # 느린 게 아니라 조용히 틀린 화면이 된다. 옛 덤프는 지우지 않고 variantChanged 로만 알린다.
    pre = module.lstrip(":").replace(":", "_") + "-"
    records, known, default_hint = [], [], None
    if os.path.isdir(projects_dir):
        for f in sorted(os.listdir(projects_dir)):
            if not f.endswith(".json"):
                continue
            if f.startswith(pre):
                records.append(f[len(pre):-5])
            try:
                with open(os.path.join(projects_dir, f), encoding="utf-8") as fh:
                    d = json.load(fh)
                known += d.get("variantsKnown", [])
                default_hint = default_hint or d.get("defaultHint") or None
            except Exception:
                pass

    chosen, chosen_by = variant, "given" if variant else ""
    fresh_at = None
    if not chosen:
        f_name, fresh_at = pick_fresh(moddir, variants)
        if f_name:
            chosen, chosen_by = f_name, "fresh"
    if not chosen:
        chosen, chosen_by = pick(variants or known, default_hint)
    if not chosen and not variants and not known:
        chosen, chosen_by = "debug", "assumed"
    dump = dump_path(projects, repo, module, chosen) if chosen else ""

    gj_path, _, gj_from = gradle_jdk.partition("\t")
    out = {"ok": False, "repo": repo, "module": module, "toolchain": toolchain,
           "variant": chosen or None, "variantChosenBy": chosen_by or None, "variantsObserved": variants,
           "classpath": dump if dump_ok(dump) else None,
           "gradleJdk": gj_path or None, "gradleJdkFrom": gj_from}   # warmup 이 Gradle 을 부를 JDK — 산출물을 구운 JDK 와 같아야 재사용한다
    if fresh_at:
        import datetime
        out["variantBuiltAt"] = datetime.datetime.fromtimestamp(fresh_at).isoformat(timespec="seconds")
    # 이 모듈의 덤프가 다른 변형으로만 있다 — 브랜치를 바꿔 빌드 변형이 달라졌다. ask 가 그 문장(dump-changed)으로 다시 묻는다.
    others = [r for r in records if r != chosen]
    if chosen and others and not dump_ok(dump):
        out["variantChanged"] = {"from": others}
    if not variants and known:
        out["variantsKnown"] = sorted(set(known))   # 산출물이 없어 관찰이 아니라 덤프 기록에서 읽었다
    why = dump_why(dump) if dump and os.path.exists(dump) else None   # 없는 것은 classpath: null 이 말한다
    if why:
        out["dumpOutdated"] = dump   # 있지만 못 쓴다. 다시 떠야 한다
    if vfrom:
        out["variantsObservedFrom"] = vfrom   # 이 모듈은 안 빌드됐다 — 이름을 저기서 봤다
    if rows:
        out["resourceApks"] = rows
        mine = [r for r in rows if r["module"] == module and (not chosen or r["variant"] == chosen)]
        out["moduleHasResourceApk"] = bool(mine)

    choose = []
    if not chosen:
        choose.append("variant")

    # 자기 리소스 APK가 관찰되지 않으면 어디서 빌릴지가 남는다. "앱 모듈"이 무엇인지는 정하지 않고,
    # 디스크에 APK가 실재하는 곳을 관찰로 좁힌다(pick_provider). 하나로 좁혀지면 고를 것이 없으므로 그대로 쓴다.
    resfrom, resdump, left = "", "", []
    if chosen and rows and not out.get("moduleHasResourceApk"):
        resfrom, by, left = pick_provider(rows, module, projects_dir)
        if resfrom:
            resdump = dump_path(projects, repo, resfrom, resource_variant(repo, resfrom, chosen))
            if not dump_ok(dump) and dump_ok(resdump) and dump_hosts(resdump, repo, module):
                # 자기 덤프가 없어도 그 앱의 덤프가 이 모듈을 담으면 그것으로 띄운다. 앱 데몬이 떠 있으면 덤프 없이 그리는 것(health 의
                # hosted)과 같은 렌더러다(D-38) — 데몬이 내려갔다는 이유로 승인과 Gradle 두 번을 다시 치를 까닭이 없다.
                # 컴파일 인자는 데몬이 앱 덤프에서 끌어낸다. 모자라 실패하면 그 실패의 remedy 가 이 모듈의 warmup 을 말한다.
                out.update({"classpath": resdump, "host": resfrom, "hostChosenBy": by})
                for k in ("variantChanged", "dumpOutdated"):
                    out.pop(k, None)
                why, resfrom = None, ""
            else:
                out["resourcesFrom"] = resfrom
                out["resourcesFromBy"] = by
                out["resourcesClasspath"] = resdump if dump_ok(resdump) else None
        else:
            choose.append("resourcesFrom")

    cmd = "prevue warmup " + (file or "--module " + module)
    if resfrom:
        cmd += " --resources-from " + resfrom
    if choose:
        out["need"] = "choose"
        out["choose"] = choose
        out["hint"] = ("variant means no debug variant was observed — give one with --variant. "
                       "resourcesFrom: give the one module in resourceApks with the resources and theme to draw this screen as --resources-from")
        if "variant" in choose and variants:
            cmd += " --variant <" + "|".join(variants[:8]) + ">"
        if "resourcesFrom" in choose:
            cmd += " --resources-from <" + "|".join(left) + ">"
        out["next"] = cmd
        return out, 2

    if out["classpath"] and toolchain and (not resfrom or dump_ok(resdump)):
        out["ok"] = True
        start = "prevue start --classpath " + out["classpath"]
        if resfrom:
            start += " --resources-from " + resdump
        if file:
            start += " --show " + file
        out["next"] = start
        return out, 0

    out["need"] = "setup"
    if why:
        out["why"] = "the dump can't be used — %s" % why
    out["next"] = cmd
    return out, 1


def locate_module(repo, file, for_warmup=False):
    """(모듈, None) 또는 (None, 오류 응답). 모듈은 파일이 놓인 자리다. 못 정하면 include 목록을 그대로 올려 보내고 스킬이 고른다."""
    m = module_of(repo, file or repo) if (file or for_warmup) else None
    if m:
        return m, None
    mods = settings_modules(repo)
    if for_warmup:
        return None, with_ask({"ok": False, "need": "choose", "choose": ["module"],
                               "error": "can't decide the module — give a file path or --module", "modules": mods,
                               "next": "prevue warmup %s--module <%s>" % (file + " " if file else "", "|".join(mods))}, [], "")
    if file:
        return None, {"ok": False, "error": "no build.gradle above this file — give the module with --module", "file": file, "modules": mods}
    return None, {"ok": False, "error": "a file or --module is needed to decide the module", "modules": mods}


# ── 사람에게 할 말 ───────────────────────────────────────────────────────────
# 승인 · 고르기 문장은 bin/help/ask/ 가 갖는다 — 도움말처럼 CLI 가 하는 말이라, 문장만 고쳐도 /ship 의 스킬 평가가 돌고
# 가짜 CLI(tests/evals/prevue)도 같은 파일을 읽는다(D-86). {이름} 자리만 채운다.

ASK_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "help", "ask")


def say(name, **slots):
    with open(os.path.join(ASK_DIR, name + ".txt"), encoding="utf-8") as f:
        text = f.read().strip()
    for k, v in slots.items():
        text = text.replace("{%s}" % k, v)
    return text


def choose_options(out):
    """(고르기 문장 이름, 후보) 또는 (None, []). 후보는 next 의 <…> 자리에 들어갈 값이다."""
    choose = out.get("choose") or []
    if "module" in choose:
        return "choose-module", list(out.get("modules") or [])
    if "resourcesFrom" in choose:
        m = re.search(r"--resources-from <([^>]*)>", out.get("next", "") + " " + out.get("then", ""))
        return "choose-app", (m.group(1).split("|") if m else sorted({r["module"] for r in out.get("resourceApks") or []}))
    if "variant" in choose:
        m = re.search(r"--variant <([^>]*)>", out.get("next", "") + " " + out.get("then", ""))
        return "choose-variant", (m.group(1).split("|") if m else list(out.get("variantsObserved") or []))
    return None, []


def with_ask(out, missing, home):
    """준비가 덜 된 응답에 사람에게 할 말을 싣는다 — ask 는 물을 문장(승인 · 고르기를 한 질문으로), options 는 고를 후보,
    tell 은 전하고 멈출 문장이다. 승인 둘(외부망 · Gradle)은 문장이 상황마다 따로라 섞이지 않는다(D-25 의 이유)."""
    sandbox = out.get("sandbox")
    if sandbox:
        if sandbox.get("restartNeeded"):
            out["tell"] = say("sandbox-restart")
        else:
            out["ask"] = say("sandbox", config=sandbox.get("config", ""), root=os.path.join(home, ".prevue"))
            out["tell"] = say("sandbox-restart")
        return out
    if "network" in missing:
        out["tell"] = say("network")
        return out
    pick, options = choose_options(out)
    options = [o for o in options if o]
    parts = [say(pick)] if pick and options else []
    if "toolchain" in missing:
        parts.append(say("toolchain-dump" if "dump" in missing else "toolchain"))
    elif "dump" in missing:
        if "resources" in (out.get("daemonStale") or []):
            parts.append(say("dump-resources"))
        else:
            parts.append(say("dump-changed" if out.get("variantChanged") or out.get("dumpOutdated") or out.get("daemonStale") else "dump"))
    if not parts:
        return out
    if options:
        out["options"] = options
    elif "toolchain" in missing or "dump" in missing:
        parts.append(say("proceed"))
    out["ask"] = " ".join(parts)
    return out


# ── health ──────────────────────────────────────────────────────────────────

def codex_sandbox(env):
    """Codex 샌드박스를 첫 판정에서 알아챈다. 데몬이 막히고 나서야 말하면 작업 도중에 설정 질문이 끼어든다.

    Codex 는 샌드박스 안의 명령에 CODEX_SANDBOX=seatbelt · CODEX_SANDBOX_NETWORK_DISABLED=1 을 준다(codex 바이너리 문자열로 확인).
    network_access=true 면 둘째 변수가 없으므로 막힐 것이 없다 → None. 설정은 넣었는데 재시작 전이면 restartNeeded 를 붙여 묻지 않게 한다.
    """
    if env.get("CODEX_SANDBOX_NETWORK_DISABLED") != "1":
        return None
    home = env.get("HOME") or os.path.expanduser("~")
    cfg = os.path.join(env.get("CODEX_HOME") or os.path.join(home, ".codex"), "config.toml")
    try:
        with open(cfg, encoding="utf-8") as f:
            text = f.read()
    except OSError:
        text = ""
    # tomllib 은 3.11+ 라 macOS 기본 python3(3.9)에 없다 — 테이블 하나만 보면 되므로 정규식으로 읽는다.
    m = re.search(r"^\[sandbox_workspace_write\][ \t]*$(.*?)(?=^\[|\Z)", text, re.M | re.S)
    body = (m.group(1) if m else "") + "\n" + "\n".join(re.findall(r"^sandbox_workspace_write\.(.*)$", text, re.M))
    net = re.search(r"^\s*network_access\s*=\s*true\b", body, re.M) is not None
    prevue_home = os.path.join(home, ".prevue")
    roots = re.search(r"^\s*writable_roots\s*=\s*\[(.*?)\]", body, re.M | re.S)
    writable = roots is not None and any(r.rstrip("/") in (prevue_home, "~/.prevue") for r in re.findall(r'"([^"]*)"', roots.group(1)))
    s = {"agent": "codex", "networkDisabled": True, "configured": net and writable, "config": cfg}
    # 설정이 들어갔어도 이 셸은 아직 막혀 있다 — 재시작 전이다. missing 에 두어야 응답의 tell 이 재시작을 안내한다.
    if net and writable:
        s["restartNeeded"] = True
    return s


def daemon_status(text):
    """status 응답 → (그리는 모듈, 다시 띄우지 않고 그릴 수 있는 모듈들, 변형). 데몬이 없거나 못 읽으면 ("", [], "")."""
    try:
        st = json.loads(text) if text else {}
    except ValueError:
        return "", [], ""
    if not isinstance(st, dict):
        return "", [], ""
    mod = st.get("module") or ""
    return mod, st.get("modules") or ([mod] if mod else []), st.get("variant") or ""


# 데몬이 쥔 것이 낡아 다시 떠야 닫히는 낡음 — 리소스 APK와 빌드 파일은 데몬이 살아 있는 한 그대로다(StaleReasons).
RESTART_STALE = ("resources", "build-files")


def restart_stale(text):
    """데몬 status 의 stale 중 warmup 으로만 닫히는 키들. 데몬이 없거나 못 읽으면 []."""
    try:
        st = json.loads(text) if text else {}
    except ValueError:
        return []
    stale = st.get("stale") if isinstance(st, dict) else None
    return [k for k in RESTART_STALE if isinstance(stale, dict) and k in stale]


def hosts(status_text, module, variant=""):
    """이 데몬이 module 을 다시 띄우지 않고 그리는가. 렌더러가 앱 클래스패스면 앱이 담은 모듈 전부다(D-38) —
    같은 앱의 다른 모듈은 보드만 바꾼다. 변형을 주면 그것도 같아야 한다 — 다른 변형의 덤프는 다른 산출물을 가리킨다."""
    _, mods, v = daemon_status(status_text)
    return module in mods and (not variant or not v or variant == v)


def release_of(root):
    """플러그인으로 깐 릴리즈의 판, 아니면 None. 에이전트마다 캐시 위치가 달라도(~/.claude/plugins/cache · ~/.codex/plugins/cache)
    판이 같으면 같은 태그에서 받은 같은 코드다. 개발 체크아웃 · 워크트리 · --plugin-dir 은 이 모양이 아니라 경로로만 같다."""
    m = re.search(r"/plugins/cache/prevue/prevue/([^/]+)$", os.path.realpath(root))
    return m.group(1) if m else None


def own(lines, root):
    """데몬들(한 줄에 포트\tstatus) 중 이 체크아웃(root)이 띄운 것만. 워크트리마다·판올림마다 코드가 달라,
    남이 띄운 데몬을 재사용하면 내 수정이 아닌 코드로 그린 그림을 검증으로 받는다. root 를 안 싣는 옛 데몬도 남이다.
    같은 릴리즈를 깐 다른 에이전트의 데몬은 내 것이다(D-64) — 갈라 띄우면 같은 체크아웃에 데몬 · 뷰어가 둘이 된다."""
    mine = os.path.realpath(root)
    rel = release_of(root)
    out = []
    for line in lines:
        _, _, st = line.partition("\t")
        try:
            r = json.loads(st).get("root") if st else None
        except (ValueError, AttributeError):
            r = None
        if r and (os.path.realpath(r) == mine or (rel is not None and release_of(r) == rel)):
            out.append(line)
    return out


def seat(lines, module, variant="", recent=""):
    """같은 저장소의 살아 있는 데몬들(한 줄에 포트\tstatus) 중 이 호출이 말할 포트. 앱마다 데몬 하나라(D-50) 저장소 하나에 여럿일 수 있다.
    모듈을 주면 그 모듈을 그리는 데몬만 고르고, 둘 이상이 담으면(두 앱이 함께 쓰는 모듈) 가장 최근에 show·start 를 받은 쪽이다.
    모듈이 없으면(status·wait 처럼 파일을 안 가리킨 명령) 가장 최근 것. 없으면 "" — 새 자리에 띄울 일이다."""
    cands = []
    for line in lines:
        port, _, st = line.partition("\t")
        if port and (not module or hosts(st, module, variant)):
            cands.append(port)
    if not cands:
        return ""
    return recent if recent in cands else cands[0]


def with_daemons(status_text, lines):
    """status 에 같은 저장소의 다른 앱 데몬들을 싣는다 — 하나뿐이면 그대로다. 사람이 뷰어 탭이 왜 둘인지 알 수 있게."""
    try:
        st = json.loads(status_text)
    except ValueError:
        return status_text
    ds = []
    for line in lines:
        port, _, other = line.partition("\t")
        if not port:
            continue
        mod, _, _ = daemon_status(other)
        ds.append({"port": int(port), "module": mod, "viewer": viewer_at(port)})
    if len(ds) > 1:
        st["daemons"] = ds
    return json.dumps(st, ensure_ascii=False)


def health(out, rc, alive, viewer, file, dmod, blocked, blocked_msg, unbaked, env, dmods=(), dstale=()):
    """(응답, 종료 코드). plan 의 판정에 데몬 생존을 더한다. 빠진 것을 **전부** missing 에 순서대로 싣는다 —
    하나씩 말하면 툴체인을 승인받고 30초 뒤 덤프를 또 물어 대화가 두 번 끊긴다. 한 번에 알면 한 번에 묻는다.
    종료 0 준비됨(데몬까지) · 1 빠진 것 있음 · 2 고를 것이 남았다.
    """
    out = dict(out)
    # 같은 앱의 다른 모듈이면 떠 있는 데몬이 그린다 — 이 모듈의 덤프도 고를 변형도 필요 없다(앱 덤프에서 끌어낸다, Q4).
    hosted = alive and bool(out.get("module")) and out["module"] in (list(dmods) or [dmod])
    if hosted:
        rc = 0
        for k in ("need", "choose", "hint", "why", "dumpOutdated", "variantChanged"):
            out.pop(k, None)
    # 살아 있는 데몬이 이 모듈을 안 그리면 이 파일에게는 없는 것이다. 그 데몬은 그대로 두고 next 의 start 가
    # 새 자리에 이 앱의 데몬을 하나 더 띄운다(D-50). 자리 계산이 그리는 데몬이나 빈자리만 주므로 여기는 --port 를 직접 줬을 때뿐이다.
    elif alive and dmod and out.get("module") and dmod != out["module"]:
        alive = False
    missing = []
    sandbox = codex_sandbox(env)
    if sandbox:
        out["sandbox"] = sandbox
        missing.append("sandbox")
    if out.get("toolchain") is False:
        missing.append("toolchain")
    if not hosted and "error" not in out and (rc == 2 or not out.get("classpath")
                               or (out.get("resourcesFrom") and not out.get("resourcesClasspath"))):
        missing.append("dump")
    # 이 파일을 그리는 데몬이 리소스 · 빌드 파일 변경 전의 것을 쥐고 있다 — 덤프가 멀쩡해도(hosted) 다시 떠야 닫힌다
    stale = list(dstale) if alive and not blocked else []
    if stale:
        out["daemonStale"] = stale
        if "dump" not in missing:
            missing.append("dump")
    if blocked:
        missing.append("network")       # 데몬은 있다. 이 셸이 못 닿는 것이다 — start 가 아니라 셸을 바꿔야 한다
        out["networkBlocked"] = True
        out["error"] = blocked_msg
    elif not alive:
        missing.append("daemon")
    out["daemon"] = alive
    if viewer:
        out["viewer"] = viewer
    out["missing"] = missing
    if rc != 2:
        out.pop("need", None)
    plan_next = out.get("next", "")
    dump_next = plan_next if not stale or plan_next.startswith("prevue warmup ") else warmup_cmd(file, out)
    if "network" in missing:
        out["next"] = "prevue show " + file + "   # in a shell with network access"
    elif "toolchain" in missing:
        out["next"] = "prevue setup"
        if "dump" in missing:
            out["then"] = dump_next        # warmup 명령. 승인 둘을 한 번에 알리라고 같이 실어 준다
    elif "dump" in missing:
        out["next"] = dump_next
    elif "daemon" in missing:
        out["next"] = plan_next                                # prevue start …
        # 판올림 뒤 첫 start 는 실행 파일을 굽느라 Gradle 을 부른다 — 샌드박스 안에서 치면 needsEscalation 으로 한 번 헛돈다.
        # 여기서 미리 알려 처음부터 권한 상승으로 치게 한다(모델 호출 하나).
        if unbaked and env.get("CODEX_SANDBOX") == "seatbelt":
            out["startNeedsEscalation"] = True
    else:
        out["next"] = "prevue show " + file
    with_ask(out, missing, env.get("HOME") or os.path.expanduser("~"))
    out["ok"] = not missing and "error" not in out
    return out, (2 if (rc == 2 or ("error" in out and not blocked)) else (1 if missing else 0))


def warmup_cmd(file, out):
    cmd = "prevue warmup " + file
    return cmd + " --resources-from " + out["resourcesFrom"] if out.get("resourcesFrom") else cmd


# ── warmup ──────────────────────────────────────────────────────────────────

def gradle_why(err):
    """Gradle stderr 에서 실패 이유 한 줄. 못 찾으면 "".

    Gradle 은 원인을 "> " 줄에 적되 **안쪽 원인은 들여써서 겹친다** — 첫 줄은 "Could not create task" 같은 껍데기고
    진짜 이유(없는 변형과 후보 목록)는 마지막 들여쓴 줄이다. 첫 줄을 잡았더니 재시도가 후보를 못 봤다(실측).
    """
    inside, last = False, ""
    for line in err.splitlines():
        if line.startswith("* What went wrong"):
            inside = True
            continue
        if line.startswith("* Try"):
            inside = False
        if inside and re.match(r"^ *> ", line):
            last = re.sub(r"^ *> ", "", line)
    return last


def dump_failure(err, module, variant, variant_given):
    """(다시 뜰 변형 또는 "", 오류 응답). clean 저장소는 관찰할 이름이 없어 "debug" 로 짐작했다.
    Gradle 이 실재하는 debug 계열 후보를 말해 주면 같은 규칙으로 한 번만 다시 고른다 — 사람에게 묻지 않는다(AS 도 묻지 않는다).
    """
    why = gradle_why(err) or "check the module name and variant (%s / %s)" % (module, variant)
    resp = {"ok": False, "error": "the classpath dump failed — %s" % why, "hint": "details are in the Gradle output above"}
    retry = ""
    m = re.search(r"debug variant candidates: (.*)", why)
    if not variant_given and m:
        retry = pick([n for n in re.split(r"[\s,]+", m.group(1)) if n])[0]
        if retry == variant:
            retry = ""
    return retry, resp


def warmup_resources(repo, module, variant, classpath, given, file=""):
    """(리소스를 빌릴 모듈 또는 "", 고를 것 응답 또는 None). 자기 리소스 APK가 있으면 빌릴 것이 없다.
    없으면 디스크에 APK가 실제로 있는 곳을 관찰로 좁히고(pick_provider), 그래도 여럿이면 스킬이 고른다.
    사람이 고른 것(given)은 기억해 다음 콜드 시작이 다시 묻지 않게 한다. "앱 모듈"을 여기서 정의하지 않는다.
    """
    with open(classpath, encoding="utf-8") as f:
        if json.load(f).get("resourceApkPath"):
            return "", None
    projects_dir = os.path.dirname(classpath)   # 덤프는 projects/<저장소 키>/ 아래에 있다
    if given:
        given = given if given.startswith(":") else ":" + given
        remember(projects_dir, module, given)
        return given, None
    rows = resource_apks(repo)
    mod, _, left = pick_provider(rows, module, projects_dir)
    if mod:
        return mod, None
    # 아무것도 빌드되지 않은 저장소에는 APK가 하나도 없다 — 관찰할 후보가 없으면 include 목록에서 사람이 고른다
    left = left or [m for m in settings_modules(repo) if m != module]
    return "", with_ask({"ok": False, "need": "choose", "choose": ["resourcesFrom"], "module": module, "variant": variant,
                         "error": "this module has no resource APK — choose which module's resources to draw with via --resources-from",
                         "resourceApks": [r for r in rows if r["module"] in left], "classpath": classpath,
                         "next": "prevue warmup %s --resources-from <%s>" % (file or "--module " + module, "|".join(left))}, [], "")


def combine_provider(repo, module, variant, by, resfrom):
    """이 모듈과 Gradle 한 번에 함께 뜰 리소스 제공자의 변형, 합치지 않으면 "". 합친 호출이 실패하면 하나씩 다시 떠 한 번 더 들므로
    실패할 근거가 보이면 합치지 않는다 — 이 모듈의 변형이 짐작(assumed)이거나 제공자의 변형이 관찰이 아니라 짐작일 때(플레이버 앱을
    한 번도 안 빌드한 클론). 이 모듈에 자기 리소스 APK가 보이면 빌릴 일이 없어 앱 덤프가 헛일이 된다."""
    if not resfrom or not variant or by == "assumed":
        return ""
    resfrom = resfrom if resfrom.startswith(":") else ":" + resfrom
    if resfrom == module or any(r["module"] == module and r["variant"] == variant for r in resource_apks(repo)):
        return ""
    v = resource_variant(repo, resfrom, variant)
    return v if v in variants_observed(repo, resfrom) else ""


def warmup_target(repo, module, variant, resfrom, plan_text, gradle_jdk):
    """warmup 이 Gradle 을 부르기 전에 정할 것 — (변형, 근거, JDK, JDK 출처, 함께 뜰 제공자 변형). 변형을 못 찍었으면 None.
    변형을 받지 않았으면 plan 응답(plan_text)에서 변형과 JDK 를 읽는다 — JDK 를 다시 고르면 데몬 로그를 한 번 더 훑는다.
    받았으면 셸이 고른 gradle_jdk("<경로>\\t<출처>")를 쓴다."""
    by = "given"
    if variant:
        gj, _, gj_from = gradle_jdk.partition("\t")
    else:
        try:
            d = json.loads(plan_text)
        except ValueError:
            return None
        variant, by = d.get("variant") or "", d.get("variantChosenBy") or ""
        if not variant:
            return None
        gj, gj_from = d.get("gradleJdk") or "", d.get("gradleJdkFrom") or ""
    try:
        both = combine_provider(repo, module, variant, by, resfrom)
    except OSError:
        both = ""   # 합치는 것은 고정비를 아낄 뿐이다 — 판정이 깨져도 하나씩 뜨면 된다
    return variant, by, gj, gj_from, both


# 단계 — (이름, 앞 시각, 뒤 시각). 시각은 init 스크립트가 남긴 것이고 start · end 는 CLI 의 벽시계다.
# startup 은 gradlew 래퍼 · 데몬 기동/접속, finish 는 덤프를 쓴 뒤 빌드가 끝나 셸로 돌아오기까지다.
GRADLE_PHASES = [("startup", "start", "initAt"), ("settings", "initAt", "settingsAt"), ("configure", "settingsAt", "configuredAt"),
                 ("graph", "configuredAt", "graphAt"), ("execute", "graphAt", "dumpedAt"), ("finish", "dumpedAt", "end")]
GRADLE_TASKS = ["graphTasks", "ran", "upToDate", "fromCache", "noSource", "skipped"]
RUNS_KEEP = 500


def gradle_run(timing, start, end, rc, runs, jdk, targets):
    """Gradle 호출 한 번의 회차 기록을 runs(jsonl)에 한 줄 붙이고 벽시계 ms 를 돌려준다. 실패한 빌드는 간 데까지의 단계만 남는다.
    targets 는 "<모듈>|<변형>|<출력>"."""
    try:
        with open(timing, encoding="utf-8") as f:
            st = json.load(f)
    except (OSError, ValueError):
        st = {}
    at = dict(st, start=int(start), end=int(end))
    rec = {"at": time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(int(start) / 1000)), "ok": str(rc) == "0",
           "targets": ["%s/%s" % tuple(t.split("|")[:2]) for t in targets], "ms": int(end) - int(start),
           "phases": {n: at[b] - at[a] for n, a, b in GRADLE_PHASES if a in at and b in at},
           "tasks": {k: st[k] for k in GRADLE_TASKS if k in st}, "gradleJdk": jdk or None}
    try:
        # 덧붙이기다 — 같은 저장소의 warmup 둘이 함께 끝나도 줄을 잃지 않는다. 두 배로 불면 최근 것만 남겨 통째로 바꾼다.
        os.makedirs(os.path.dirname(runs), exist_ok=True)
        with open(runs, "a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        with open(runs, encoding="utf-8") as f:
            lines = f.read().splitlines()
        if len(lines) > 2 * RUNS_KEEP:
            tmp = "%s.%d" % (runs, os.getpid())
            with open(tmp, "w", encoding="utf-8") as f:
                f.write("\n".join(lines[-RUNS_KEEP:]) + "\n")
            os.replace(tmp, runs)
    except OSError:
        pass
    return rec["ms"]


def warmup_daemons(lines, module, variant, root):
    """(내릴 포트들, 알리기만 할 포트들). 이 모듈 · 변형을 그리는 데몬 중 내 것(own — 같은 릴리즈 설치본 포함, D-64)은 내리고
    남의 것은 알리기만 한다. 다른 변형의 데몬은 이번에 뜬 덤프와 무관하다 — 단 이 모듈을 그리며 다시 떠야 닫히는 낡음을 쥔 데몬은
    변형이 달라도 내린다. health 가 그 낡음으로 이 warmup 을 시켰다(앱 demoDebug 데몬이 라이브러리 debug 를 그리는 경우)."""
    mine = set(own(lines, root))
    stop, others = [], []
    for line in lines:
        port, _, st = line.partition("\t")
        if port and (hosts(st, module, variant) or (hosts(st, module) and restart_stale(st))):
            (stop if line in mine else others).append(port)
    return stop, others


def prepare_request(result):
    for key in ("next", "then"):
        command = result.get(key, "")
        if command.startswith("prevue warmup ") and " --show" not in command:
            result[key] = command + " --show"
    return result


def warmup_result(out, resout, file, gj, gj_from, calls="", ms="", runs="", stopped="", others=""):
    with open(out, encoding="utf-8") as f:
        d = json.load(f)
    start = "prevue start --classpath " + out
    if resout:
        start += " --resources-from " + resout
    if file:
        start += " --show " + file
    r = {"ok": True, "classpath": out, "module": d["project"], "variant": d["variant"],
         "classPath": len(d["classPath"]), "resourceApk": bool(d["resourceApkPath"]), "next": start,
         "gradleJdk": gj or None, "gradleJdkFrom": gj_from}
    if resout:
        r["resourcesClasspath"] = resout
    if calls:
        r["gradle"] = {"calls": int(calls), "ms": int(ms or 0), "runs": runs or None}   # 고정비 내역은 runs 의 줄마다
    if stopped.split():
        r["stoppedDaemons"] = [int(p) for p in stopped.split()]   # 옛 덤프를 쥔 내 데몬 — next 의 start 가 새 덤프로 띄운다
    if others.split():
        r["otherDaemons"] = [int(p) for p in others.split()]
        r["note"] = "a daemon from another checkout draws this module with the old dump — it uses the new dump only after that session stops and restarts it"
    return r


# ── 진입점 ───────────────────────────────────────────────────────────────────

# ── 에이전트가 읽는 응답 ──────────────────────────────────────────────────────

def agent_view(d, viewer="", shown=None):
    """show · start --show · wait 응답을 스킬이 쓰는 것만으로 추린다(NFR-18 카드당 1KB). 카드마다 phases·URL·fqn 까지 실으면
    5장 보드가 6.7KB라 모델이 그걸 읽느라 차례가 길어졌다(Codex 실측: 응답 1초 뒤 판단 49초). 전부는 board·status 가 준다."""
    if viewer and isinstance(d, dict):
        d["viewer"] = viewer
    # show 의 답은 wait 모양이지만 tab 은 show 의 것이다 — 연 탭인지 옮긴 탭인지(파일은 file 에 있다). 상한으로 닫은 탭도 옮긴다(D-54).
    if isinstance(d, dict) and isinstance(shown, dict):
        for k in ("tab", "closedTab", "started"):
            if shown.get(k):
                d[k] = shown[k]
        if shown.get("opened") is False:          # 스스로 띄웠는데 브라우저를 못 열었다 — 주소를 링크로 건네야 한다
            d["opened"] = False
    if isinstance(d, dict) and isinstance(d.get("cards"), list):
        def card(c):
            o = {"index": c.get("index"), "name": c.get("name"), "ok": c.get("ok")}
            label = (c.get("params") or {}).get("name")
            if label:
                o["label"] = label
            if (c.get("paramCount") or 1) > 1:
                o["paramIndex"] = c.get("paramIndex")
                o["paramCount"] = c.get("paramCount")
            if c.get("ok") is not True:
                for k in ("failure", "message"):
                    if c.get(k):
                        o[k] = c[k]
            for k in ("image", "tree"):
                if c.get(k):
                    o[k] = c[k]
            return o
        for k in ("gen", "waitedMs"):
            d.pop(k, None)
        if not d.get("stale"):
            d.pop("stale", None)
        # 카드 배열은 맨 끝이다 — 에이전트는 긴 응답을 앞에서 잘라 읽는데(실측 wait 48번 중 47번), 그 뒤에 오던
        # complete:false 의 이유(message · interactive)가 잘려 옛 그림을 재다가 다시 띄웠다.
        d["cards"] = [card(c) for c in d.pop("cards")]
    return d


def autostart(h):
    """show 가 데몬을 스스로 띄울 start 인자, 아니면 None. 빠진 것이 데몬 하나뿐일 때만이다 — 툴체인 · 덤프 · 고를 것은
    승인이나 사람의 답이 들어 응답의 ask 로 묻는다. 샌드박스에서 굽기가 권한 상승을 부를 때도 띄우지 않는다."""
    if not isinstance(h, dict) or h.get("missing") != ["daemon"] or h.get("startNeedsEscalation") or not h.get("classpath"):
        return None
    args = ["--classpath", h["classpath"]]
    if h.get("resourcesFrom"):
        if not h.get("resourcesClasspath"):
            return None
        args += ["--resources-from", h["resourcesClasspath"]]
    return args


# bin/prevue 만 부른다. 인자는 자리로 받는다 — 빈 값도 자리를 지켜야 하므로 셸이 늘 따옴표로 넘긴다.

# 뷰어 언어(D-110). 에이전트가 show · open 에 준 --lang 을 셸이 PREVUE_LANG 으로 넘긴다 — 다음 명령에도 실어야
# 사람이 승인한 뒤 치는 warmup · start 가 같은 언어로 화면을 연다.
def lang():
    return os.environ.get("PREVUE_LANG", "")


def viewer_at(port):
    return "http://127.0.0.1:%s/" % port + ("?lang=" + lang() if lang() else "")


def with_lang(resp):
    if not lang() or not isinstance(resp, dict):
        return resp
    for key in ("next", "then"):
        command = resp.get(key)
        if isinstance(command, str) and command.startswith("prevue ") and " --lang " not in command:
            head, mark, note = command.partition("   #")
            resp[key] = head + " --lang " + lang() + mark + note
    return resp


def _emit(resp, code=0):
    print(json.dumps(with_lang(resp), ensure_ascii=False))
    sys.exit(code)


def main(argv):
    cmd, a = argv[0], argv[1:]
    if cmd == "module":                      # <repo> <파일> <plan|warmup>
        m, err = locate_module(a[0], a[1], a[2] == "warmup")
        if err:
            _emit(err, 2)
        print(m)
    elif cmd == "plan":                      # <repo> <module> <variant> <파일> <toolchain> <gradle jdk> <projects>
        _emit(*plan(a[0], a[1], a[2], a[3], a[4] == "true", a[5], a[6]))
    elif cmd == "health":                    # <plan 응답> <plan 종료 코드> <alive> <viewer> <파일> <데몬 status> <blocked> <막힘 문구> <unbaked>
        try:
            out = json.loads(a[0])
        except ValueError:
            out = {"ok": False, "error": a[0].strip()}
        dmod, dmods, _ = daemon_status(a[5])
        _emit(*health(out, int(a[1]), a[2] == "true", a[3], a[4], dmod, a[6] == "true", a[7], a[8] == "true", os.environ, dmods,
                      restart_stale(a[5])))
    elif cmd == "hosts":                     # <데몬 status> <모듈> [변형] — 종료 0 이 데몬이 그린다 · 1 다른 앱의 모듈이거나 데몬 없음
        sys.exit(0 if hosts(a[0], a[1], a[2] if len(a) > 2 else "") else 1)
    elif cmd == "resource-variant":          # <repo> <리소스 모듈> <이 모듈의 변형> — 리소스 모듈을 뜰 변형
        print(resource_variant(a[0], a[1], a[2]))
    elif cmd == "seat":                      # <모듈|""> <변형|""> <최근 포트|""> + stdin: 포트\tstatus 줄 — 말할 포트, 없으면 빈 줄
        print(seat(sys.stdin.read().splitlines(), a[0], a[1], a[2]))
    elif cmd == "own":                       # <prevue 체크아웃> + stdin: 포트\tstatus 줄 — 그 체크아웃이 띄운 줄만
        print("\n".join(own(sys.stdin.read().splitlines(), a[0])))
    elif cmd == "with-daemons":              # <status> + stdin: 포트\tstatus 줄
        print(with_daemons(a[0], sys.stdin.read().splitlines()))
    elif cmd == "daemon-module":             # <데몬 status> — 지금 그리는 모듈
        print(daemon_status(a[0])[0])
    elif cmd == "dump-failure":              # <stderr 파일> <module> <variant> <given 0|1> — 첫 줄 다시 뜰 변형, 둘째 줄 오류 응답
        with open(a[0], encoding="utf-8", errors="replace") as f:
            retry, resp = dump_failure(f.read(), a[1], a[2], a[3] == "1")
        print(retry)
        print(json.dumps(resp, ensure_ascii=False))
    elif cmd == "warmup-resources":          # <repo> <module> <variant> <덤프> <--resources-from 로 받은 것> [파일]
        mod, choose = warmup_resources(a[0], a[1], a[2], a[3], a[4], a[5] if len(a) > 5 else "")
        if choose:
            _emit(choose, 2)
        print(mod)
    elif cmd == "agent-view":                # [뷰어 주소] [show 응답] + stdin: 데몬 응답 — JSON 이 아니면 그대로 낸다
        raw = sys.stdin.read()
        try:
            d = json.loads(raw)
        except ValueError:
            sys.stdout.write(raw)
            return
        try:
            shown = json.loads(a[1]) if len(a) > 1 else None
        except ValueError:
            shown = None
        print(json.dumps(agent_view(d, a[0] if a else "", shown), ensure_ascii=False))
        # complete:false 는 인터랙티브 중이라 다른 카드가 저장 전 그림이다 — 0 으로 끝내면 에이전트가 옛 그림을 새 그림으로 믿는다
        if isinstance(d, dict) and d.get("complete") is False:
            sys.exit(1)
    elif cmd == "with-lang":                 # stdin: 셸이 지은 응답 — next · then 에 --lang
        _emit(json.load(sys.stdin))
    elif cmd == "prepare-request":
        _emit(prepare_request(json.load(sys.stdin)))
    elif cmd == "autostart":                 # stdin: health 응답 — start 인자를 한 줄에 하나, 띄우지 않을 것이면 종료 1
        try:
            args = autostart(json.loads(sys.stdin.read()))
        except ValueError:
            args = None
        if not args:
            sys.exit(1)
        print("\n".join(args))
    elif cmd == "warmup-target":             # <repo> <module> <받은 변형> <--resources-from 로 받은 것> <plan 응답> <셸이 고른 JDK>
        # 한 줄에 하나씩 변형 · 근거 · JDK · JDK 출처 · 함께 뜰 제공자 변형. 변형을 못 찍었으면 plan 응답을 그대로 내고 종료 2
        t = warmup_target(*a[:6])
        if t is None:
            sys.stdout.write(a[4])
            sys.exit(2)
        print("\n".join(t))
    elif cmd == "warmup-finish":             # <repo> <Gradle 전 epoch ms> <모듈> <변형> <prevue 체크아웃> <덤프> <리소스 덤프> <파일>
        #                                      <gradle jdk> <출처> <Gradle 호출 수> <그 ms> <회차 기록> + stdin: 포트\tstatus 줄
        # 첫 줄 내릴 포트들 · 둘째 줄 남의 포트들 · 셋째 줄 응답. 응답은 내릴 데몬을 내린 뒤에 셸이 낸다 — 포트를 먼저 내보내
        # 지문이나 응답이 실패해도 셸이 데몬은 내린다
        repo, since_ms, module, variant, root, out, resout = a[:7]
        stop, others = warmup_daemons(sys.stdin.read().splitlines(), module, variant, root)
        print(" ".join(stop))
        print(" ".join(others), flush=True)
        for d in (out, resout):
            if d:
                try:
                    stamp_build_files(d, repo, int(since_ms) / 1000)
                except (OSError, ValueError) as e:   # 지문이 없으면 다음 health 가 빌드 파일의 mtime 으로 본다
                    sys.stderr.write("prevue: couldn't write build file fingerprints to %s — %s\n" % (d, e))
        _emit(warmup_result(out, resout, *a[7:13], stopped=" ".join(stop), others=" ".join(others)))
    elif cmd == "gradle-run":                # <시각 파일> <시작 ms> <끝 ms> <종료 코드> <회차 기록> <gradle jdk> <모듈|변형|출력>... — 벽시계 ms
        print(gradle_run(a[0], a[1], a[2], a[3], a[4], a[5], a[6:]))
    else:
        sys.exit("unknown command: %s" % cmd)


if __name__ == "__main__":
    main(sys.argv[1:])
