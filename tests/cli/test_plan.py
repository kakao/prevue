"""bin/prevue_plan.py — CLI 의 판정. 가짜 저장소 트리를 임시 디렉터리에 짓고 본다. 실행: python3 -m unittest discover -s tests/cli

트리를 커밋하지 않고 짓는 이유: build/ 는 gitignore 이고, 판정이 보는 것은 대개 빈 디렉터리라 git 이 담지 못한다.
"""

import json
import os
import re
import sys
import tempfile
import time
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "plugin", "bin"))
import prevue_plan as P  # noqa: E402

FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures")
GJ = "/jdk\t테스트"


def fixture(name):
    with open(os.path.join(FIXTURES, name), encoding="utf-8") as f:
        return f.read()


class Repo:
    """가짜 저장소. 모듈 · 변형 디렉터리 · 리소스 APK · 컴파일 기록 · 덤프를 필요한 만큼 짓는다."""

    def __init__(self, root, modules):
        base = tempfile.mkdtemp(dir=root)   # 한 테스트가 저장소를 여럿 지어도 겹치지 않게
        self.root, self.projects = os.path.join(base, "repo"), os.path.join(base, "projects")
        os.makedirs(self.root)
        open(os.path.join(self.root, "gradlew"), "w").close()
        with open(os.path.join(self.root, "settings.gradle.kts"), "w") as f:
            f.write("include(\n" + ",\n".join('    "%s"' % m for m in modules) + "\n)\n")
        for m in modules:
            d = P.module_dir(self.root, m)
            os.makedirs(os.path.join(d, "src", "main", "kotlin"), exist_ok=True)
            open(os.path.join(d, "build.gradle.kts"), "w").close()

    def src(self, module, name="Screen.kt"):
        p = os.path.join(P.module_dir(self.root, module), "src", "main", "kotlin", name)
        open(p, "w").close()
        return p

    def built(self, module, variant, when=None):
        """AGP 가 변형별로 남기는 디렉터리와 코틀린 플러그인의 컴파일 기록."""
        d = P.module_dir(self.root, module)
        os.makedirs(os.path.join(d, "build", "intermediates", "javac", variant), exist_ok=True)
        own = os.path.join(d, "build", "intermediates", "built_in_kotlinc", variant, "classes")
        os.makedirs(own, exist_ok=True)
        if when is not None:
            c = os.path.join(d, "build", "kotlin", "compile%sKotlin" % P._cap(variant), "cacheable")
            os.makedirs(c, exist_ok=True)
            open(os.path.join(c, "last-build.bin"), "w").close()
            os.utime(os.path.join(c, "last-build.bin"), (when, when))
        return own

    def apk(self, module, variant):
        d = os.path.join(P.module_dir(self.root, module), "build", "intermediates", "linked_resources_binary_format",
                         variant, "process%sResources" % P._cap(variant))
        os.makedirs(d, exist_ok=True)
        p = os.path.join(d, "linked-resources-binary-format-%s.ap_" % variant)
        open(p, "w").close()
        return p

    def dump(self, module, variant, schema=P.SCHEMA, own=None, apk="", **extra):
        path = P.dump_path(self.projects, self.root, module, variant)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        d = {"schema": schema, "project": module, "variant": variant, "resourceApkPath": apk,
             "projectClassPath": [own or self.built(module, variant)], "classPath": ["a.jar", "b.jar"]}
        d.update(extra)
        with open(path, "w") as f:
            json.dump(d, f)
        return path

    def plan(self, module, file="", variant="", toolchain=True):
        return P.plan(self.root, module, variant, file, toolchain, GJ, self.projects)


class Case(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.tmp.cleanup()

    def repo(self, *modules):
        return Repo(self.tmp.name, modules)


# ── 변형 규칙 ────────────────────────────────────────────────────────────────

class FlavorOrder(unittest.TestCase):
    """AS 규칙은 변형 이름이 아니라 플레이버 이름을 견준다."""

    def test_짧은_플레이버가_앞선다(self):
        # 이름 전체로 정렬하면 dev2Debug 가 먼저다('2' < 'D') — 이슈 #3
        names = ["dev2Debug", "dev3Debug", "dev7Debug", "devDebug", "devRelease"]
        self.assertEqual(P.pick(names), ("devDebug", "rule"))

    def test_차원마다_알파벳(self):
        names = ["prodFullDebug", "demoFullDebug", "demoBasicDebug", "prodBasicDebug"]
        self.assertEqual(P.pick(names)[0], "demoBasicDebug")

    def test_테스트_변형은_빠진다(self):
        self.assertEqual(P.pick(["devDebugUnitTest", "devDebugAndroidTest", "dev2Debug"])[0], "dev2Debug")

    def test_플레이버_없는_debug(self):
        self.assertEqual(P.pick(["debug", "release"]), ("debug", "rule"))

    def test_isDefault_가_규칙보다_앞선다(self):
        hint = {"flavors": ["dev3"], "buildType": "debug"}
        self.assertEqual(P.pick(["devDebug", "dev3Debug"], hint), ("dev3Debug", "isDefault"))

    def test_debug_계열이_없으면_비운다(self):
        self.assertEqual(P.pick(["devRelease"]), ("", ""))


class Freshness(Case):
    def setUp(self):
        super().setUp()
        self.r = self.repo(":app")
        self.mod = P.module_dir(self.r.root, ":app")

    def test_가장_최근에_컴파일한_변형(self):
        now = time.time()
        self.r.built(":app", "dev2Debug", now - 86400 * 70)   # 두 달 넘게 묵었다
        self.r.built(":app", "devDebug", now - 3600)
        self.r.built(":app", "dev3Debug", now - 86400 * 60)
        name, at = P.pick_fresh(self.mod, ["dev2Debug", "dev3Debug", "devDebug"])
        self.assertEqual(name, "devDebug")
        self.assertAlmostEqual(at, now - 3600, delta=1)

    def test_테스트_컴파일은_세지_않는다(self):
        now = time.time()
        self.r.built(":app", "devDebug", now - 86400)
        self.r.built(":app", "devDebugUnitTest", now)
        self.assertEqual(P.pick_fresh(self.mod, ["devDebug", "devDebugUnitTest"])[0], "devDebug")

    def test_기록이_없으면_다음_순위로(self):
        self.assertEqual(P.pick_fresh(self.mod, ["devDebug", "dev2Debug"]), (None, None))

    def test_release_는_최신이어도_고르지_않는다(self):
        self.r.built(":app", "devRelease", time.time())
        self.assertEqual(P.pick_fresh(self.mod, ["devRelease"]), (None, None))


class KmpVariant(Case):
    """KMP 의 Android 라이브러리 플러그인은 변형이 androidMain 하나뿐이고 태스크 이름도 다르다(D-108)."""

    def kmp_built(self, module, task, when):
        c = os.path.join(P.module_dir(self.r.root, module), "build", "kotlin", task, "cacheable")
        os.makedirs(c, exist_ok=True)
        open(os.path.join(c, "last-build.bin"), "w").close()
        os.utime(os.path.join(c, "last-build.bin"), (when, when))

    def setUp(self):
        super().setUp()
        self.r = self.repo(":app", ":shared")

    def test_androidMain_은_debug_계열이다(self):
        self.assertEqual(P.pick(["androidMain"]), ("androidMain", "rule"))

    def test_새_플러그인의_컴파일_기록(self):
        self.kmp_built(":shared", "compileAndroidMain", time.time())
        self.assertEqual(P.pick_fresh(P.module_dir(self.r.root, ":shared"), ["androidMain"])[0], "androidMain")

    def test_옛_조합의_컴파일_기록(self):
        self.kmp_built(":shared", "compileDebugKotlinAndroid", time.time())
        self.assertEqual(P.pick_fresh(P.module_dir(self.r.root, ":shared"), ["debug", "release"])[0], "debug")

    def test_옛_기록과_새_기록이_함께면_새것을_본다(self):
        now = time.time()
        self.kmp_built(":shared", "compileDebugKotlin", now - 86400)
        self.kmp_built(":shared", "compileDebugKotlinAndroid", now)
        self.assertAlmostEqual(P.last_built(P.module_dir(self.r.root, ":shared"), "debug"), now, delta=1)

    def test_앱_덤프가_담으면_자기_덤프_없이_준비됨(self):
        d = P.module_dir(self.r.root, ":shared")
        jar = os.path.join(d, "build", "intermediates", "runtime_library_classes_jar", "androidMain", "classes.jar")
        os.makedirs(os.path.dirname(jar))
        open(jar, "w").close()
        self.kmp_built(":shared", "compileAndroidMain", time.time())
        self.r.built(":app", "debug", time.time())
        apk = self.r.apk(":app", "debug")
        self.r.dump(":app", "debug", apk=apk, classPath=[jar], compileClassPath=["c.jar"])
        out, rc = self.r.plan(":shared", file=self.r.src(":shared"))
        self.assertEqual((out["variant"], out.get("host")), ("androidMain", ":app"))
        self.assertNotIn("choose", out)


# ── 관찰 ────────────────────────────────────────────────────────────────────

class Observe(Case):
    def test_모듈은_가장_가까운_빌드_파일(self):
        r = self.repo(":app", ":feature:foryou:impl")
        self.assertEqual(P.module_of(r.root, r.src(":feature:foryou:impl")), ":feature:foryou:impl")

    def test_저장소_루트의_빌드_파일은_모듈이_아니다(self):
        r = self.repo(":app")
        open(os.path.join(r.root, "build.gradle.kts"), "w").close()
        os.makedirs(os.path.join(r.root, "gradle"))
        self.assertIsNone(P.module_of(r.root, os.path.join(r.root, "gradle")))

    def test_settings_의_여러_줄_include(self):
        r = self.repo(":app", ":core:ui", ":app")
        self.assertEqual(P.settings_modules(r.root), [":app", ":core:ui"])

    def test_settings_의_콜론_없는_include(self):
        # 앱은 콜론 없이 include 하고, include 밖에는 태스크 경로 문자열이 있다
        r = self.repo(":app")
        with open(os.path.join(r.root, "settings.gradle.kts"), "w") as f:
            f.write('includeBuild("build-logic")\ninclude("app")\ninclude(":core:ui")\n'
                    'gradle.startParameter.excludedTaskNames.addAll(listOf(":build-logic:convention:testClasses"))\n')
        self.assertEqual(P.settings_modules(r.root), [":app", ":core:ui"])

    def test_settings_gradle_의_괄호_없는_include(self):
        r = self.repo(":app")
        os.remove(os.path.join(r.root, "settings.gradle.kts"))
        with open(os.path.join(r.root, "settings.gradle"), "w") as f:
            f.write("include ':app',\n        'core:ui'\n// include ':old'\n/* include ':older' */\n")
        self.assertEqual(P.settings_modules(r.root), [":app", ":core:ui"])

    def test_관찰된_변형은_디렉터리_이름(self):
        r = self.repo(":app")
        r.built(":app", "prodDebug")
        r.built(":app", "demoDebug")
        self.assertEqual(P.variants_observed(r.root, ":app"), ["demoDebug", "prodDebug"])

    def test_리소스_APK는_디스크에_있는_곳만(self):
        r = self.repo(":app", ":core:ui")
        p = r.apk(":app", "demoDebug")
        self.assertEqual(P.resource_apks(r.root), [{"module": ":app", "variant": "demoDebug", "path": p}])


# ── 덤프 유효성 ──────────────────────────────────────────────────────────────

class DumpValidity(Case):
    def test_멀쩡한_덤프(self):
        r = self.repo(":app")
        self.assertIsNone(P.dump_why(r.dump(":app", "debug")))

    def test_낡은_규약(self):
        r = self.repo(":app")
        self.assertIn("old schema", P.dump_why(r.dump(":app", "debug", schema=P.SCHEMA - 1)))

    def test_clean_뒤_산출물이_사라졌다(self):
        # 덤프는 남고 가리키는 것만 사라진다 — 그대로 start 하면 JVM 이 "모듈명을 정할 수 없다"로 죽는다
        r = self.repo(":app")
        self.assertIn("are gone", P.dump_why(r.dump(":app", "debug", own=os.path.join(r.root, "app", "build", "gone"))))

    def test_지문_뒤에_빌드_파일이_바뀌면_낡았다(self):
        # 이슈 #152 — 모듈을 개명해도 옛 build/ 가 남아 산출물 검사로는 못 잡는다. settings 가 바뀐 것으로 잡는다
        r = self.repo(":app")
        p = r.dump(":app", "debug")
        P.stamp_build_files(p, r.root)
        self.assertIsNone(P.dump_why(p))
        with open(os.path.join(r.root, "settings.gradle.kts"), "a") as f:
            f.write('include(":feature")\n')
        self.assertIn("settings.gradle.kts", P.dump_why(p))

    def test_새로_생긴_빌드_파일도_바뀐_것이다(self):
        r = self.repo(":app")
        p = r.dump(":app", "debug")
        P.stamp_build_files(p, r.root)
        os.makedirs(os.path.join(r.root, "gradle"))
        open(os.path.join(r.root, "gradle", "libs.versions.toml"), "w").close()
        self.assertIn("gradle/libs.versions.toml", P.dump_why(p))

    def test_내용이_같으면_mtime_만_새것이어도_멀쩡하다(self):
        # 브랜치를 갔다 오면 체크아웃이 파일을 다시 써 mtime 만 새것이 된다 — 헛 warmup 을 부르지 않는다
        r = self.repo(":app")
        p = r.dump(":app", "debug")
        P.stamp_build_files(p, r.root)
        later = time.time() + 60
        os.utime(os.path.join(r.root, "settings.gradle.kts"), (later, later))
        self.assertIsNone(P.dump_why(p))

    def test_Gradle_이_도는_동안_바뀐_빌드_파일은_지문을_비워_둔다(self):
        # Gradle 이 옛 settings 로 뜬 덤프에 새 settings 의 지문을 적으면 낡은 덤프가 준비됨이 된다
        r = self.repo(":app")
        p = r.dump(":app", "debug")
        since = time.time() - 30
        P.stamp_build_files(p, r.root, since)
        self.assertIn("settings.gradle.kts", P.dump_why(p))

    def test_루트_프로젝트는_루트_파일만_본다(self):
        self.assertEqual(P.build_files("/r", ":"), list(P.ROOT_BUILD_FILES))

    def test_지문_없는_옛_덤프는_mtime_으로_본다(self):
        r = self.repo(":app")
        p = r.dump(":app", "debug")
        self.assertIsNone(P.dump_why(p))
        later = time.time() + 60
        os.utime(os.path.join(r.root, "app", "build.gradle.kts"), (later, later))
        self.assertIn("app/build.gradle.kts", P.dump_why(p))

    def test_낡은_덤프는_plan_이_warmup_으로_보낸다(self):
        r = self.repo(":app")
        p = r.dump(":app", "debug")
        P.stamp_build_files(p, r.root)
        with open(os.path.join(r.root, "settings.gradle.kts"), "a") as f:
            f.write("// 개명\n")
        out, rc = r.plan(":app", variant="debug")
        self.assertEqual(rc, 1)
        self.assertIsNone(out["classpath"])
        self.assertEqual(out["dumpOutdated"], p)
        self.assertIn("build files changed", out["why"])
        self.assertTrue(out["next"].startswith("prevue warmup"))

    def test_읽을_수_없다(self):
        r = self.repo(":app")
        p = r.dump(":app", "debug")
        with open(p, "w") as f:
            f.write("{")
        self.assertEqual(P.dump_why(p), "unreadable")


# ── plan ────────────────────────────────────────────────────────────────────

class Plan(Case):
    def test_앱_모듈은_덤프가_있으면_준비됨(self):
        r = self.repo(":app")
        f = r.src(":app")
        r.apk(":app", "debug")
        dump = r.dump(":app", "debug", apk="x.ap_")
        out, rc = r.plan(":app", f)
        self.assertEqual(rc, 0)
        self.assertEqual(out["variantChosenBy"], "rule")
        self.assertEqual(out["next"], "prevue start --classpath %s --show %s" % (dump, f))

    def test_덤프가_없으면_warmup(self):
        r = self.repo(":app")
        f = r.src(":app")
        r.built(":app", "debug")
        out, rc = r.plan(":app", f)
        self.assertEqual((rc, out["need"], out["classpath"]), (1, "setup", None))
        self.assertEqual(out["next"], "prevue warmup " + f)

    def test_툴체인이_없으면_준비되지_않았다(self):
        r = self.repo(":app")
        r.apk(":app", "debug")
        r.dump(":app", "debug", apk="x.ap_")
        self.assertEqual(r.plan(":app", toolchain=False)[1], 1)

    def test_최근에_구운_변형을_고른다(self):
        r = self.repo(":app")
        now = time.time()
        r.built(":app", "dev2Debug", now - 86400)
        r.built(":app", "devDebug", now - 60)
        out, _ = r.plan(":app")
        self.assertEqual((out["variant"], out["variantChosenBy"]), ("devDebug", "fresh"))
        self.assertIn("variantBuiltAt", out)

    def test_라이브러리_모듈은_리소스를_하나뿐인_앱에서_빌린다(self):
        r = self.repo(":app", ":core:ui")
        r.built(":core:ui", "debug")
        r.apk(":app", "debug")
        lib = r.dump(":core:ui", "debug")
        app = r.dump(":app", "debug", apk="x.ap_")
        out, rc = r.plan(":core:ui")
        self.assertEqual(rc, 0)
        self.assertEqual((out["resourcesFrom"], out["moduleHasResourceApk"]), (":app", False))
        self.assertEqual(out["next"], "prevue start --classpath %s --resources-from %s" % (lib, app))

    def test_리소스_후보가_여럿이면_묻는다(self):
        r = self.repo(":app", ":wear", ":core:ui")
        r.built(":core:ui", "debug")
        r.apk(":app", "debug")
        r.apk(":wear", "debug")
        out, rc = r.plan(":core:ui")
        self.assertEqual((rc, out["choose"]), (2, ["resourcesFrom"]))
        self.assertIn("--resources-from <:app|:wear>", out["next"])

    def app_dump(self, r, app, *holds):
        """앱 덤프. 클래스패스에 담은 모듈들의 산출물을 싣는다(nowinandroid :app 은 feature 모듈을 담고 catalog 는 안 담는다)."""
        cp = [r.built(app, "debug")] + [r.built(m, "debug") for m in holds]
        return r.dump(app, "debug", apk="x.ap_", projectClassPath=cp, classPath=cp + ["a.jar"])

    # 앱 데몬이 떠 있으면 그 앱이 담은 모듈은 덤프 없이 그린다(health 의 hosted). 데몬이 내려가 있어도 같은 앱 덤프로 띄운다 —
    # 여태는 이 모듈의 덤프를 요구해 승인 한 번과 Gradle 두 번(이 모듈 · 앱 다시)을 치렀다.
    def test_앱_덤프가_담은_모듈은_자기_덤프_없이_띄운다(self):
        r = self.repo(":app", ":core:ui")
        f = r.src(":core:ui")
        r.apk(":app", "debug")
        app = self.app_dump(r, ":app", ":core:ui")
        out, rc = r.plan(":core:ui", f)
        self.assertEqual((rc, out["classpath"], out["host"], out["hostChosenBy"]), (0, app, ":app", "only"))
        self.assertEqual(out["next"], "prevue start --classpath %s --show %s" % (app, f))
        self.assertNotIn("resourcesFrom", out)
        h, _ = P.health(out, rc, False, "", f, "", False, "", False, {"HOME": self.tmp.name})
        self.assertEqual((h["missing"], P.autostart(h)), (["daemon"], ["--classpath", app]))   # show 가 스스로 띄운다

    def test_자기_덤프가_있으면_그것으로_띄운다(self):
        r = self.repo(":app", ":core:ui")
        r.apk(":app", "debug")
        app = self.app_dump(r, ":app", ":core:ui")
        lib = r.dump(":core:ui", "debug")
        out, rc = r.plan(":core:ui")
        self.assertEqual((rc, out["classpath"], out["resourcesFrom"]), (0, lib, ":app"))
        self.assertNotIn("host", out)
        self.assertTrue(out["next"].endswith("--resources-from %s" % app))

    def test_앱_덤프가_안_담으면_warmup(self):
        r = self.repo(":app", ":core:ui")
        r.built(":core:ui", "debug")
        r.apk(":app", "debug")
        self.app_dump(r, ":app")
        out, rc = r.plan(":core:ui")
        self.assertEqual((rc, out["need"], out["classpath"]), (1, "setup", None))
        self.assertEqual(out["next"], "prevue warmup --module :core:ui --resources-from :app")

    def test_담은_산출물이_사라졌으면_warmup(self):
        # 그 모듈만 clean 했다 — 앱 덤프가 가리키는 jar 가 없으면 첫 렌더가 ClassNotFound 로 죽는다
        r = self.repo(":app", ":core:ui")
        r.apk(":app", "debug")
        self.app_dump(r, ":app", ":core:ui")
        os.rename(os.path.join(r.root, "core", "ui", "build"), os.path.join(self.tmp.name, "gone"))
        out, rc = r.plan(":core:ui")
        self.assertEqual((rc, out["classpath"]), (1, None))

    def test_앱_덤프로_띄우면_다른_변형의_덤프는_알리지_않는다(self):
        r = self.repo(":app", ":core:ui")
        r.apk(":app", "debug")
        self.app_dump(r, ":app", ":core:ui")
        r.dump(":core:ui", "prodDebug")
        out, rc = r.plan(":core:ui")
        self.assertEqual((rc, out["host"]), (0, ":app"))
        self.assertNotIn("variantChanged", out)

    def test_이_모듈을_담은_앱이_하나면_묻지_않는다(self):
        r = self.repo(":app", ":catalog", ":feature")
        r.apk(":app", "debug")
        r.apk(":catalog", "debug")
        app = self.app_dump(r, ":app", ":feature")
        self.app_dump(r, ":catalog")
        r.dump(":feature", "debug")
        out, rc = r.plan(":feature")
        self.assertEqual((rc, out["resourcesFrom"], out["resourcesFromBy"]), (0, ":app", "contains"))
        self.assertTrue(out["next"].endswith("--resources-from %s" % app))

    def test_두_앱이_다_담으면_묻는다(self):
        r = self.repo(":app", ":catalog", ":core:ui")
        r.apk(":app", "debug")
        r.apk(":catalog", "debug")
        self.app_dump(r, ":app", ":core:ui")
        self.app_dump(r, ":catalog", ":core:ui")
        r.dump(":core:ui", "debug")
        out, rc = r.plan(":core:ui")
        self.assertEqual((rc, out["choose"]), (2, ["resourcesFrom"]))
        self.assertIn("--resources-from <:app|:catalog>", out["next"])

    def test_덤프가_없는_앱은_빼지_않는다(self):
        r = self.repo(":app", ":wear", ":feature")
        r.apk(":app", "debug")
        r.apk(":wear", "debug")
        self.app_dump(r, ":app", ":feature")   # :wear 는 덤프가 없어 담는지 모른다
        r.dump(":feature", "debug")
        out, rc = r.plan(":feature")
        self.assertIn("--resources-from <:app|:wear>", out["next"])

    def test_어느_앱도_안_담으면_좁히지_않는다(self):
        r = self.repo(":app", ":catalog", ":feature")
        r.apk(":app", "debug")
        r.apk(":catalog", "debug")
        self.app_dump(r, ":app")
        self.app_dump(r, ":catalog")
        r.dump(":feature", "debug")
        out, rc = r.plan(":feature")
        self.assertIn("--resources-from <:app|:catalog>", out["next"])

    def test_고른_것을_기억해_다시_묻지_않는다(self):
        r = self.repo(":app", ":catalog", ":core:ui")
        r.apk(":app", "debug")
        r.apk(":catalog", "debug")
        app = self.app_dump(r, ":app", ":core:ui")
        self.app_dump(r, ":catalog", ":core:ui")
        lib = r.dump(":core:ui", "debug")
        self.assertEqual(P.warmup_resources(r.root, ":core:ui", "debug", lib, ":app")[0], ":app")
        out, rc = r.plan(":core:ui")
        self.assertEqual((rc, out["resourcesFrom"], out["resourcesFromBy"]), (0, ":app", "remembered"))
        self.assertTrue(out["next"].endswith("--resources-from %s" % app))

    def test_기억한_것이_후보에서_빠지면_다시_묻는다(self):
        r = self.repo(":app", ":catalog", ":wear", ":core:ui")
        r.apk(":catalog", "debug")
        r.apk(":wear", "debug")
        lib = r.dump(":core:ui", "debug")
        P.remember(os.path.dirname(lib), ":core:ui", ":app")   # :app 의 APK가 사라졌다(clean)
        out, rc = r.plan(":core:ui")
        self.assertEqual(rc, 2)

    def test_debug_계열이_없으면_묻는다(self):
        r = self.repo(":app")
        r.built(":app", "devRelease")
        out, rc = r.plan(":app")
        self.assertEqual((rc, out["choose"]), (2, ["variant"]))
        self.assertIn("--variant <devRelease>", out["next"])

    def test_안_빌드된_모듈은_다른_모듈에서_이름을_본다(self):
        r = self.repo(":app", ":core:ui")
        r.built(":app", "demoDebug")
        out, _ = r.plan(":core:ui")
        self.assertEqual((out["variant"], out["variantsObservedFrom"]), ("demoDebug", ":app"))

    def test_아무것도_없으면_debug_로_둔다(self):
        r = self.repo(":app")
        out, _ = r.plan(":app")
        self.assertEqual((out["variant"], out["variantChosenBy"]), ("debug", "assumed"))

    def test_관찰이_없으면_덤프가_적어_둔_isDefault(self):
        r = self.repo(":app", ":core:ui")
        r.dump(":app", "devDebug", variantsKnown=["devDebug", "dev3Debug"], defaultHint={"flavors": ["dev3"], "buildType": "debug"})
        for d in ("javac", "built_in_kotlinc"):   # 덤프만 남기고 산출물 디렉터리는 없다 — clean 한 저장소
            os.rename(os.path.join(r.root, "app", "build", "intermediates", d), os.path.join(self.tmp.name, d))
        out, _ = r.plan(":core:ui")
        self.assertEqual((out["variant"], out["variantChosenBy"]), ("dev3Debug", "isDefault"))
        self.assertEqual(out["variantsKnown"], ["dev3Debug", "devDebug"])

    def test_다른_변형의_덤프만_있으면_알린다(self):
        r = self.repo(":app")
        r.built(":app", "devDebug", time.time())
        r.dump(":app", "dev2Debug")
        out, _ = r.plan(":app")
        self.assertEqual(out["variantChanged"], {"from": ["dev2Debug"]})

    def test_못_쓰는_덤프는_이유를_싣는다(self):
        r = self.repo(":app")
        r.apk(":app", "debug")
        p = r.dump(":app", "debug", schema=1, apk="x.ap_")
        out, rc = r.plan(":app")
        self.assertEqual((rc, out["dumpOutdated"]), (1, p))
        self.assertIn("old schema", out["why"])

    def test_모듈을_못_정하면_include_목록(self):
        r = self.repo(":app")
        os.makedirs(os.path.join(r.root, "gradle"))
        f = os.path.join(r.root, "gradle", "libs.versions.toml")
        open(f, "w").close()
        m, err = P.locate_module(r.root, f)
        self.assertIsNone(m)
        self.assertEqual(err["modules"], [":app"])
        err = P.locate_module(r.root, "", for_warmup=True)[1]
        self.assertEqual(err["choose"], ["module"])
        self.assertEqual((err["ask"], err["options"]), (P.say("choose-module"), err["modules"]))
        self.assertEqual(err["next"], "prevue warmup --module <%s>" % "|".join(err["modules"]))


# ── health ──────────────────────────────────────────────────────────────────

class Health(Case):
    def ready_plan(self):
        r = self.repo(":app")
        f = r.src(":app")
        r.apk(":app", "debug")
        r.dump(":app", "debug", apk="x.ap_")
        return r.plan(":app", f), f

    def health(self, plan, f, alive=False, dmod="", blocked=False, unbaked=False, env=None, dmods=(), dstale=(), nojdk="",
               jdkver=""):
        (out, rc) = plan
        return P.health(out, rc, alive, "http://127.0.0.1:8800/" if alive or blocked else "", f, dmod, blocked, "막혔다",
                        unbaked, env or {"HOME": self.tmp.name}, dmods, dstale, nojdk, jdkver)

    def test_리소스가_낡은_데몬이면_다시_뜨라고_묻는다(self):
        plan, f = self.ready_plan()
        out, rc = self.health(plan, f, alive=True, dmod=":app", dstale=["resources"])
        self.assertEqual((rc, out["ok"], out["missing"], out["next"]), (1, False, ["dump"], "prevue warmup " + f))
        self.assertEqual(out["ask"], P.say("dump-resources") + " " + P.say("proceed"))

    def test_앱_데몬이_그리는_모듈도_리소스가_낡으면_제공자와_함께_뜬다(self):
        r = self.repo(":app", ":core:ui")
        f = r.src(":core:ui")
        r.built(":core:ui", "debug")
        r.apk(":app", "debug")
        out, _ = self.health(r.plan(":core:ui", f), f, alive=True, dmod=":app", dmods=(":core:ui", ":app"), dstale=["resources"])
        self.assertEqual((out["missing"], out["next"]), (["dump"], "prevue warmup %s --resources-from :app" % f))

    def test_빌드_파일이_낡은_데몬은_설정이_바뀌었다고_묻는다(self):
        plan, f = self.ready_plan()
        out, _ = self.health(plan, f, alive=True, dmod=":app", dstale=["build-files"])
        self.assertEqual((out["missing"], out["ask"]), (["dump"], P.say("dump-changed") + " " + P.say("proceed")))

    def test_다른_모듈을_그리는_데몬의_낡음은_이_파일과_무관하다(self):
        plan, f = self.ready_plan()
        out, _ = self.health(plan, f, alive=True, dmod=":core:ui", dstale=["resources"])
        self.assertEqual(out["missing"], ["daemon"])

    def test_툴체인도_없으면_then_이_다시_뜨기다(self):
        plan, f = self.ready_plan()
        out, _ = self.health((dict(plan[0], toolchain=False), plan[1]), f, alive=True, dmod=":app", dstale=["resources"])
        self.assertEqual((out["missing"], out["next"], out["then"]), (["toolchain", "dump"], "prevue setup", "prevue warmup " + f))

    def test_낡음을_쥔_데몬은_변형이_달라도_warmup_이_내린다(self):
        st = json.dumps({"module": ":app", "modules": [":core:ui", ":app"], "variant": "demoDebug", "root": "/r",
                         "stale": {"resources": {}}})
        fresh = json.dumps({"module": ":app", "modules": [":core:ui", ":app"], "variant": "demoDebug", "root": "/r"})
        self.assertEqual(P.warmup_daemons(["8801\t" + st], ":core:ui", "debug", "/r")[0], ["8801"])
        self.assertEqual(P.warmup_daemons(["8801\t" + fresh], ":core:ui", "debug", "/r")[0], [])

    def test_status_의_stale_중_다시_떠야_닫히는_것만(self):
        st = json.dumps({"stale": {"compile": {}, "resources": {}, "build-files": {}}})
        self.assertEqual(P.restart_stale(st), ["resources", "build-files"])
        self.assertEqual((P.restart_stale(""), P.restart_stale("{")), ([], []))

    def test_데몬까지_있으면_show(self):
        plan, f = self.ready_plan()
        out, rc = self.health(plan, f, alive=True, dmod=":app")
        self.assertEqual((rc, out["missing"], out["next"]), (0, [], "prevue show " + f))

    def test_데몬만_없으면_start(self):
        plan, f = self.ready_plan()
        out, rc = self.health(plan, f)
        self.assertEqual((rc, out["missing"]), (1, ["daemon"]))
        self.assertTrue(out["next"].startswith("prevue start "))

    def test_java_가_없으면_띄우지_않고_JDK_를_말한다(self):
        plan, f = self.ready_plan()
        out, rc = self.health(plan, f, nojdk="/Applications/Android Studio.app/Contents/jbr/Contents/Home")
        self.assertEqual((rc, out["missing"], out["next"]), (1, ["jdk", "daemon"], "prevue health " + f))
        self.assertEqual(out["tell"], P.say("jdk", jdk="/Applications/Android Studio.app/Contents/jbr/Contents/Home"))
        self.assertIsNone(P.autostart(out))

    def test_java_가_없으면_덤프_승인보다_먼저_말한다(self):
        r = self.repo(":app")
        f = r.src(":app")
        r.built(":app", "debug")
        out, _ = self.health(r.plan(":app", f, toolchain=False), f, nojdk="/nope")
        self.assertEqual((out["missing"], out["next"]), (["jdk", "toolchain", "dump", "daemon"], "prevue health " + f))
        self.assertEqual((out["tell"], "ask" in out, "then" in out), (P.say("jdk", jdk="/nope"), False, False))

    def test_저장소를_못_찾은_이유가_java_보다_먼저다(self):
        out, _ = P.health({"ok": False, "error": "gradlew not found"}, 2, False, "", "/x/A.kt", "", False, "", False,
                          {"HOME": self.tmp.name}, nojdk="/nope")
        self.assertNotIn("jdk", out["missing"])
        self.assertNotIn("tell", out)

    def test_java_가_21_미만이면_없는_것과_같이_말하고_찾은_버전을_싣는다(self):
        plan, f = self.ready_plan()
        out, rc = self.health(plan, f, nojdk="/jdk17", jdkver="17")
        self.assertEqual((rc, out["missing"], out["jdk"], out["jdkVersion"]), (1, ["jdk", "daemon"], "/jdk17", "17"))
        self.assertEqual(out["tell"], P.say("jdk", jdk="/jdk17"))

    # 지킬 것: 고를 것이 남아도 java 가 먼저다 — 종료 2 는 ask · options 를 약속하는데, jdk 갈래는 tell 만 싣는다
    def test_고를_것이_남아도_java_가_없으면_고르기를_묻지_않고_1(self):
        r = self.repo(":app")
        r.built(":app", "devRelease")
        out, rc = self.health(r.plan(":app"), "", nojdk="/nope")
        self.assertEqual((rc, out["missing"][0]), (1, "jdk"))
        self.assertFalse({"need", "choose", "ask", "options"} & set(out))
        self.assertEqual(out["tell"], P.say("jdk", jdk="/nope"))

    # 지킬 것: 데몬이 떠 있는데 이 셸이 못 닿으면 JDK 탓이 아니다 — missing 첫 자리가 next · tell 과 같은 network 여야 한다
    def test_닿지_못하는_데몬은_java_를_찾지_않는다(self):
        plan, f = self.ready_plan()
        out, rc = self.health(plan, f, blocked=True, nojdk="/nope")
        self.assertEqual((rc, out["missing"]), (1, ["network"]))
        self.assertEqual(out["tell"], P.say("network"))

    def test_start_가_멈출_때_error_는_사실만_말한다(self):
        none, old = P.jdk_missing("/nope"), P.jdk_missing("/jdk17", "17")
        self.assertEqual((none["error"], "jdkVersion" in none), ("No java at /nope/bin/java", False))
        self.assertEqual((old["error"], old["jdkVersion"]), ("Java 17 at /jdk17 — the daemon needs 21 or later", "17"))
        for out in (none, old):
            self.assertEqual((out["ok"], out["missing"]), (False, ["jdk"]))
            self.assertNotIn("PREVUE_JDK", out["error"])
            self.assertIn("PREVUE_JDK", out["tell"])

    def test_떠_있는_데몬은_java_를_다시_찾지_않는다(self):
        plan, f = self.ready_plan()
        out, rc = self.health(plan, f, alive=True, dmod=":app", nojdk="/nope")
        self.assertEqual((rc, out["missing"]), (0, []))
        self.assertNotIn("tell", out)

    def test_다른_모듈을_그리는_데몬은_없는_것(self):
        plan, f = self.ready_plan()
        out, _ = self.health(plan, f, alive=True, dmod=":core:ui")
        self.assertEqual((out["missing"], out["daemon"]), (["daemon"], False))

    def test_같은_앱의_모듈은_덤프가_없어도_그_데몬이_그린다(self):
        r = self.repo(":app", ":core:ui")
        f = r.src(":core:ui")
        r.built(":core:ui", "debug")
        out, rc = self.health(r.plan(":core:ui", f), f, alive=True, dmod=":app", dmods=(":core:ui", ":app"))
        self.assertEqual((rc, out["missing"], out["next"], out["daemon"]), (0, [], "prevue show " + f, True))
        self.assertNotIn("daemonModule", out)

    def test_앱에_없는_모듈은_새_자리에_띄운다(self):
        plan, f = self.ready_plan()
        out, _ = self.health(plan, f, alive=True, dmod=":feature:x", dmods=(":feature:x", ":demo"))
        self.assertEqual(out["missing"], ["daemon"])
        self.assertTrue(out["next"].startswith("prevue start "))
        self.assertNotIn("daemonModule", out)

    def test_툴체인과_덤프가_없으면_한_번에(self):
        r = self.repo(":app")
        f = r.src(":app")
        r.built(":app", "debug")
        out, rc = self.health(r.plan(":app", f, toolchain=False), f)
        self.assertEqual((rc, out["missing"]), (1, ["toolchain", "dump", "daemon"]))
        self.assertEqual((out["next"], out["then"]), ("prevue setup", "prevue warmup " + f))

    def test_닿지_못하면_셸을_바꾼다(self):
        plan, f = self.ready_plan()
        out, rc = self.health(plan, f, blocked=True)
        self.assertEqual((rc, out["missing"], out["networkBlocked"]), (1, ["network"], True))

    def test_Codex_샌드박스_설정_전(self):
        plan, f = self.ready_plan()
        env = {"HOME": self.tmp.name, "CODEX_SANDBOX_NETWORK_DISABLED": "1"}
        out, _ = self.health(plan, f, env=env)
        self.assertEqual(out["missing"][0], "sandbox")
        self.assertFalse(out["sandbox"]["configured"])

    def test_Codex_샌드박스_설정_뒤_재시작_전(self):
        plan, f = self.ready_plan()
        os.makedirs(os.path.join(self.tmp.name, ".codex"))
        with open(os.path.join(self.tmp.name, ".codex", "config.toml"), "w") as fh:
            fh.write('[sandbox_workspace_write]\nnetwork_access = true\nwritable_roots = ["%s/.prevue"]\n' % self.tmp.name)
        out, _ = self.health(plan, f, env={"HOME": self.tmp.name, "CODEX_SANDBOX_NETWORK_DISABLED": "1"})
        self.assertTrue(out["sandbox"]["restartNeeded"])

    def test_판올림_뒤_샌드박스의_start_는_권한_상승(self):
        plan, f = self.ready_plan()
        out, _ = self.health(plan, f, unbaked=True, env={"HOME": self.tmp.name, "CODEX_SANDBOX": "seatbelt"})
        self.assertTrue(out["startNeedsEscalation"])

    # NFR-17. 판올림하면 새 체크아웃에는 데몬이 없고 실행 파일도 안 구워졌다 — show 가 스스로 띄우거나(아래 8c),
    # 샌드박스라 권한 상승이 들면 show(1) 다음 next 하나(2)가 첫 프리뷰를 내야 한다.
    # health·setup·warmup 을 거치거나 start 뒤에 show 를 또 쳐야 하면 3회가 된다.
    def test_판올림_뒤에도_첫_프리뷰는_두_번(self):
        plan, f = self.ready_plan()
        for env in ({"HOME": self.tmp.name}, {"HOME": self.tmp.name, "CODEX_SANDBOX": "seatbelt"}):
            out, rc = self.health(plan, f, unbaked=True, env=env)
            self.assertEqual((rc, out["missing"]), (1, ["daemon"]))
            self.assertRegex(out["next"], r"^prevue start .* --show " + re.escape(f) + "$")
            self.assertNotIn("then", out)

    def test_고를_것이_남으면_2(self):
        r = self.repo(":app")
        r.built(":app", "devRelease")
        out, rc = self.health(r.plan(":app"), "")
        self.assertEqual(rc, 2)
        self.assertEqual(out["need"], "choose")

    # D-86. 준비가 덜 되면 응답이 사람에게 물을 문장(ask)을 싣는다 — 상황마다 문장이 하나로 정해지고, 승인 둘을 섞지 않는다.
    def test_데몬만_없으면_묻지_않는다(self):
        plan, f = self.ready_plan()
        out, _ = self.health(plan, f)
        self.assertEqual(out["missing"], ["daemon"])
        self.assertFalse({"ask", "tell", "options"} & set(out))

    def test_빌드_설정만_없으면_그_승인을_묻는다(self):
        r = self.repo(":app")
        f = r.src(":app")
        r.built(":app", "debug")
        out, _ = self.health(r.plan(":app", f), f)
        self.assertEqual(out["missing"], ["dump", "daemon"])
        self.assertEqual(out["ask"], P.say("dump") + " " + P.say("proceed"))
        self.assertNotIn("components", out["ask"])
        self.assertNotIn("options", out)

    def test_둘_다_없으면_한_질문으로_한_번(self):
        r = self.repo(":app")
        f = r.src(":app")
        r.built(":app", "debug")
        out, _ = self.health(r.plan(":app", f, toolchain=False), f)
        self.assertEqual(out["ask"], P.say("toolchain-dump") + " " + P.say("proceed"))
        self.assertIn("components", out["ask"])
        self.assertIn("build settings", out["ask"])

    def test_툴체인만_없으면_구성_요소만_묻는다(self):
        plan, f = self.ready_plan()
        out, rc = P.health(dict(plan[0], toolchain=False), plan[1], False, "", f, "", False, "", False, {"HOME": self.tmp.name})
        self.assertEqual(out["missing"], ["toolchain", "daemon"])
        self.assertEqual(out["ask"], P.say("toolchain") + " " + P.say("proceed"))
        self.assertNotIn("build settings", out["ask"])

    def test_브랜치가_바뀌면_다시_읽는_문장(self):
        r = self.repo(":app")
        f = r.src(":app")
        r.built(":app", "devDebug", time.time())
        r.dump(":app", "dev2Debug")
        out, _ = self.health(r.plan(":app", f), f)
        self.assertEqual(out["variantChanged"], {"from": ["dev2Debug"]})
        self.assertEqual(out["ask"], P.say("dump-changed") + " " + P.say("proceed"))

    def test_빌드_파일이_바뀌어_낡은_덤프도_다시_읽는_문장(self):
        plan, f = self.ready_plan()
        out, _ = self.health((dict(plan[0], classpath=None, dumpOutdated="/x.json"), 1), f)
        self.assertEqual(out["ask"], P.say("dump-changed") + " " + P.say("proceed"))   # "first time opening"은 거짓이다

    def test_후보가_비면_고르기를_묻지_않는다(self):
        r = self.repo(":core:ui")
        out = P.warmup_resources(r.root, ":core:ui", "debug", r.dump(":core:ui", "debug"), "", "/abs/Screen.kt")[1]
        self.assertFalse({"ask", "options"} & set(out))

    def test_앱_고르기와_승인을_한_질문으로(self):
        r = self.repo(":app", ":wear", ":core:ui")
        f = r.src(":core:ui")
        r.built(":core:ui", "debug")
        r.apk(":app", "debug")
        r.apk(":wear", "debug")
        out, rc = self.health(r.plan(":core:ui", f), f)
        self.assertEqual((rc, out["missing"]), (2, ["dump", "daemon"]))
        self.assertEqual(out["options"], [":app", ":wear"])
        self.assertEqual(out["ask"], P.say("choose-app") + " " + P.say("dump"))
        self.assertNotIn(P.say("proceed"), out["ask"])        # 후보 하나를 고르는 것이 곧 승인이다
        self.assertIn("--resources-from <:app|:wear>", out["next"])

    def test_툴체인도_없으면_고르기는_then_의_자리에서(self):
        r = self.repo(":app", ":wear", ":core:ui")
        f = r.src(":core:ui")
        r.built(":core:ui", "debug")
        r.apk(":app", "debug")
        r.apk(":wear", "debug")
        out, _ = self.health(r.plan(":core:ui", f, toolchain=False), f)
        self.assertEqual((out["next"], out["options"]), ("prevue setup", [":app", ":wear"]))
        self.assertEqual(out["ask"], P.say("choose-app") + " " + P.say("toolchain-dump"))

    def test_닿지_못하면_전하고_멈춘다(self):
        plan, f = self.ready_plan()
        out, _ = self.health(plan, f, blocked=True)
        self.assertEqual(out["tell"], P.say("network"))
        self.assertNotIn("ask", out)

    def test_Codex_샌드박스는_넣을_값과_함께_동의를_묻는다(self):
        plan, f = self.ready_plan()
        out, _ = self.health(plan, f, env={"HOME": self.tmp.name, "CODEX_SANDBOX_NETWORK_DISABLED": "1"})
        self.assertIn('writable_roots = ["%s/.prevue"]' % self.tmp.name, out["ask"])
        self.assertIn(os.path.join(self.tmp.name, ".codex", "config.toml"), out["ask"])
        self.assertNotIn("{", out["ask"].replace("{…}", ""))   # 채우지 못한 자리가 없다
        self.assertEqual(out["tell"], P.say("sandbox-restart"))

    def test_Codex_재시작만_남았으면_묻지_않고_전한다(self):
        plan, f = self.ready_plan()
        os.makedirs(os.path.join(self.tmp.name, ".codex"))
        with open(os.path.join(self.tmp.name, ".codex", "config.toml"), "w") as fh:
            fh.write('[sandbox_workspace_write]\nnetwork_access = true\nwritable_roots = ["%s/.prevue"]\n' % self.tmp.name)
        out, _ = self.health(plan, f, env={"HOME": self.tmp.name, "CODEX_SANDBOX_NETWORK_DISABLED": "1"})
        self.assertEqual(out["tell"], P.say("sandbox-restart"))
        self.assertNotIn("ask", out)

    def test_문장_파일은_모두_쓰인다(self):
        with open(P.__file__, encoding="utf-8") as fh:
            src = fh.read()
        with open(os.path.join(os.path.dirname(P.__file__), "prevue"), encoding="utf-8") as fh:
            src += fh.read()             # python3 문장은 bin/prevue 가 python 없이 읽는다
        for name in sorted(n[:-4] for n in os.listdir(P.ASK_DIR)):
            with self.subTest(name=name):
                self.assertRegex(src, r'"%s"|ask/%s\.txt' % (re.escape(name), re.escape(name)))

    # NFR-17 · 8c. 덤프는 있는데 데몬만 없으면 show 가 next 의 start 를 스스로 쳐 첫 프리뷰가 한 번이다.
    # 승인이나 사람의 답이 드는 것(툴체인 · 덤프 · 고를 것 · 샌드박스 권한 상승)이 남으면 띄우지 않고 health 로 보낸다.
    def test_데몬만_없으면_show_가_스스로_띄운다(self):
        plan, f = self.ready_plan()
        out, _ = self.health(plan, f, unbaked=True)
        self.assertEqual(P.autostart(out), ["--classpath", out["classpath"]])
        self.assertIn("prevue start --classpath " + out["classpath"], out["next"])     # 손으로 칠 next 와 같은 인자다

    def test_승인이_드는_것이_남으면_띄우지_않는다(self):
        r = self.repo(":app")
        f = r.src(":app")
        r.built(":app", "debug")
        out, _ = self.health(r.plan(":app", f, toolchain=False), f)
        self.assertIsNone(P.autostart(out))
        plan, f = self.ready_plan()
        out, _ = self.health(plan, f, unbaked=True, env={"HOME": self.tmp.name, "CODEX_SANDBOX": "seatbelt"})
        self.assertIsNone(P.autostart(out))
        out, _ = self.health(plan, f, blocked=True)
        self.assertIsNone(P.autostart(out))

    def test_고를_것이_남으면_띄우지_않는다(self):
        r = self.repo(":app")
        r.built(":app", "devRelease")
        self.assertIsNone(P.autostart(self.health(r.plan(":app"), "")[0]))

    def test_리소스를_빌리면_그_덤프도_넘긴다(self):
        h = {"missing": ["daemon"], "classpath": "/p/lib.json", "resourcesFrom": ":app", "resourcesClasspath": "/p/app.json"}
        self.assertEqual(P.autostart(h), ["--classpath", "/p/lib.json", "--resources-from", "/p/app.json"])
        self.assertIsNone(P.autostart(dict(h, resourcesClasspath=None)))      # 제공자 덤프가 없으면 warmup 이다

    def test_데몬이_있으면_띄우지_않는다(self):
        plan, f = self.ready_plan()
        self.assertIsNone(P.autostart(self.health(plan, f, alive=True, dmod=":app")[0]))

    def test_낡은_덤프는_준비됨이_아니고_띄우지_않는다(self):
        # 이슈 #152 — missing [] 로 답해 show 가 옛 덤프로 데몬을 띄웠고 15장이 전부 실패했다
        r = self.repo(":app")
        f = r.src(":app")
        r.apk(":app", "debug")
        P.stamp_build_files(r.dump(":app", "debug", apk="x.ap_"), r.root)
        with open(os.path.join(r.root, "settings.gradle.kts"), "a") as fh:
            fh.write("// 개명\n")
        out, rc = self.health(r.plan(":app", f), f)
        self.assertEqual((rc, out["missing"]), (1, ["dump", "daemon"]))
        self.assertTrue(out["next"].startswith("prevue warmup "))
        self.assertIsNone(P.autostart(out))


# ── warmup ──────────────────────────────────────────────────────────────────

class Seat(unittest.TestCase):
    """같은 저장소의 데몬 중 어디에 말하나(D-50) — 앱마다 데몬 하나."""
    APP = json.dumps({"module": ":feature:foryou", "modules": [":feature:foryou", ":core:ui", ":app"], "variant": "demoDebug"})
    CATALOG = json.dumps({"module": ":app-nia-catalog", "modules": [":app-nia-catalog", ":core:ui"], "variant": "debug"})
    LINES = ["8801\t" + APP, "8802\t" + CATALOG]

    def test_그_모듈을_그리는_데몬(self):
        self.assertEqual(P.seat(self.LINES, ":app-nia-catalog"), "8802")

    def test_두_앱이_함께_담은_모듈은_최근_것(self):
        self.assertEqual((P.seat(self.LINES, ":core:ui", "", "8802"), P.seat(self.LINES, ":core:ui", "", "8801")), ("8802", "8801"))

    def test_아무_앱에도_없으면_새_자리(self):
        self.assertEqual(P.seat(self.LINES, ":feature:x"), "")

    def test_다른_변형은_그_데몬이_아니다(self):
        self.assertEqual(P.seat(self.LINES, ":feature:foryou", "prodDebug"), "")

    def test_모듈을_안_주면_최근_것(self):
        self.assertEqual((P.seat(self.LINES, "", "", "8802"), P.seat(self.LINES, "")), ("8802", "8801"))

    def test_status_에_다른_앱_데몬을_싣는다(self):
        self.assertEqual([d["port"] for d in json.loads(P.with_daemons(self.APP, self.LINES))["daemons"]], [8801, 8802])
        self.assertNotIn("daemons", json.loads(P.with_daemons(self.APP, self.LINES[:1])))


class Own(unittest.TestCase):
    """이 체크아웃이 띄운 데몬만 쓴다 — 다른 워크트리·옛 판의 데몬은 코드가 다르다."""
    MINE = "8801\t" + json.dumps({"module": ":app", "root": "/w/a"})
    OTHER = "8802\t" + json.dumps({"module": ":app", "root": "/w/b"})
    OLD = "8803\t" + json.dumps({"module": ":app"})

    def test_내_체크아웃의_데몬만(self):
        self.assertEqual(P.own([self.MINE, self.OTHER, self.OLD], "/w/a"), [self.MINE])

    def test_root_를_안_싣는_옛_데몬은_남이다(self):
        self.assertEqual(P.own([self.OLD], "/w/a"), [])

    def test_경로는_정규화해_비교한다(self):
        self.assertEqual(P.own([self.MINE], "/w/a/"), [self.MINE])

    CLAUDE = "/h/.claude/plugins/cache/prevue/prevue/"
    CODEX = "/h/.codex/plugins/cache/prevue/prevue/"

    def line(self, port, root):
        return "%d\t%s" % (port, json.dumps({"module": ":app", "root": root}))

    def test_같은_릴리즈를_깐_다른_에이전트의_데몬은_내_것이다(self):
        codex = self.line(8816, self.CODEX + "0.10.0")
        self.assertEqual(P.own([codex], self.CLAUDE + "0.10.0"), [codex])

    def test_판이_다른_릴리즈는_남이다(self):
        self.assertEqual(P.own([self.line(8816, self.CODEX + "0.10.0")], self.CLAUDE + "0.9.0"), [])

    def test_개발_체크아웃은_릴리즈와_판이_같아도_남이다(self):
        # 워크트리의 코드는 고치는 중이라 VERSION 이 같아도 같은 코드가 아니다
        dev = self.line(8817, "/w/compose-preview-standalone")
        self.assertEqual(P.own([dev], self.CLAUDE + "0.10.0"), [])
        self.assertEqual(P.own([self.line(8816, self.CODEX + "0.10.0")], "/w/compose-preview-standalone"), [])

    def test_릴리즈_판은_플러그인_캐시_경로에서만_읽는다(self):
        self.assertEqual((P.release_of(self.CODEX + "0.10.0"), P.release_of("/w/prevue/0.10.0"), P.release_of(self.CODEX + "0.10.0/bin")),
                         ("0.10.0", None, None))


class GradleFailure(unittest.TestCase):
    def test_안쪽_원인을_읽는다(self):
        # 첫 "> " 줄은 껍데기다. 마지막 들여쓴 줄이 진짜 이유다
        self.assertEqual(P.gradle_why(fixture("gradle-variant-missing.txt")),
                         ":feature:foryou:impl has no variant 'debug' — debug variant candidates: prodDebug, demoDebug")

    def test_Try_아래의_줄은_원인이_아니다(self):
        self.assertEqual(P.gradle_why(fixture("gradle-compile-failed.txt")), "Compilation error. See log for more details")

    def test_후보가_있으면_규칙으로_다시_뜬다(self):
        retry, resp = P.dump_failure(fixture("gradle-variant-missing.txt"), ":feature:foryou:impl", "debug", False)
        self.assertEqual(retry, "demoDebug")
        self.assertIn("debug variant candidates", resp["error"])

    def test_변형을_받았으면_다시_고르지_않는다(self):
        self.assertEqual(P.dump_failure(fixture("gradle-variant-missing.txt"), ":m", "debug", True)[0], "")

    def test_이유가_없으면_확인할_것을_말한다(self):
        retry, resp = P.dump_failure(fixture("gradle-no-reason.txt"), ":app", "debug", False)
        self.assertEqual(retry, "")
        self.assertEqual(resp["error"], "the classpath dump failed — check the module name and variant (:app / debug)")


class WarmupResources(Case):
    def test_자기_APK가_있으면_빌리지_않는다(self):
        r = self.repo(":app")
        self.assertEqual(P.warmup_resources(r.root, ":app", "debug", r.dump(":app", "debug", apk="x.ap_"), ""), ("", None))

    def test_받은_것을_쓴다(self):
        r = self.repo(":app", ":core:ui")
        self.assertEqual(P.warmup_resources(r.root, ":core:ui", "debug", r.dump(":core:ui", "debug"), "app")[0], ":app")

    def test_후보가_하나면_그것(self):
        r = self.repo(":app", ":core:ui")
        r.apk(":app", "debug")
        self.assertEqual(P.warmup_resources(r.root, ":core:ui", "debug", r.dump(":core:ui", "debug"), "")[0], ":app")

    def test_후보가_없거나_여럿이면_묻는다(self):
        r = self.repo(":app", ":wear", ":core:ui")
        dump = r.dump(":core:ui", "debug")
        self.assertEqual(P.warmup_resources(r.root, ":core:ui", "debug", dump, "")[1]["choose"], ["resourcesFrom"])
        r.apk(":app", "debug")
        r.apk(":wear", "debug")
        self.assertEqual(len(P.warmup_resources(r.root, ":core:ui", "debug", dump, "")[1]["resourceApks"]), 2)

    def test_Gradle_뒤에_고를_것이_남으면_고르기만_묻는다(self):
        r = self.repo(":app", ":wear", ":core:ui")
        dump = r.dump(":core:ui", "debug")
        r.apk(":app", "debug")
        r.apk(":wear", "debug")
        out = P.warmup_resources(r.root, ":core:ui", "debug", dump, "", "/abs/Screen.kt")[1]
        self.assertEqual((out["ask"], out["options"]), (P.say("choose-app"), [":app", ":wear"]))   # 승인은 이미 받았다
        self.assertEqual(out["next"], "prevue warmup /abs/Screen.kt --resources-from <:app|:wear>")

    def test_빌드된_APK가_하나도_없으면_include_목록에서_고른다(self):
        r = self.repo(":app", ":wear", ":core:ui")
        out = P.warmup_resources(r.root, ":core:ui", "debug", r.dump(":core:ui", "debug"), "", "/abs/Screen.kt")[1]
        self.assertEqual(out["options"], [":app", ":wear"])
        self.assertEqual(out["next"], "prevue warmup /abs/Screen.kt --resources-from <:app|:wear>")

    def test_담은_앱으로_좁힌다(self):
        r = self.repo(":app", ":catalog", ":feature")
        r.apk(":app", "debug")
        r.apk(":catalog", "debug")
        r.dump(":app", "debug", apk="x.ap_", projectClassPath=[r.built(":app", "debug"), r.built(":feature", "debug")])
        r.dump(":catalog", "debug", apk="x.ap_")
        self.assertEqual(P.warmup_resources(r.root, ":feature", "debug", r.dump(":feature", "debug"), "")[0], ":app")

    def test_받은_것을_기억한다(self):
        r = self.repo(":app", ":core:ui")
        dump = r.dump(":core:ui", "debug")
        P.warmup_resources(r.root, ":core:ui", "debug", dump, "app")
        self.assertEqual(P.remembered(os.path.dirname(dump), ":core:ui"), ":app")

    def test_리소스_모듈의_변형은_그_모듈의_것(self):
        r = self.repo(":app", ":core:ui")
        r.built(":app", "dev2Debug", when=1000)
        r.built(":app", "devDebug", when=2000)
        self.assertEqual(P.resource_variant(r.root, ":app", "debug"), "devDebug")

    def test_같은_이름이_있으면_그것(self):
        r = self.repo(":app", ":core:ui")
        r.built(":app", "demoDebug", when=1000)
        r.built(":app", "prodDebug", when=2000)
        self.assertEqual(P.resource_variant(r.root, ":app", "demoDebug"), "demoDebug")

    def test_plan_은_리소스_덤프를_그_모듈의_변형으로_찾는다(self):
        r = self.repo(":app", ":core:ui")
        f = r.src(":core:ui")
        r.built(":core:ui", "debug", when=1000)
        r.built(":app", "devDebug", when=2000)
        r.apk(":app", "devDebug")
        r.dump(":core:ui", "debug")
        res = r.dump(":app", "devDebug", apk="x.ap_")
        out, _ = r.plan(":core:ui", f)
        self.assertEqual((out["resourcesFrom"], out["resourcesClasspath"]), (":app", res))


if __name__ == "__main__":
    unittest.main()


class Hosts(unittest.TestCase):
    ST = json.dumps({"module": ":feature:foryou:impl", "variant": "demoDebug", "modules": [":core:ui", ":feature:foryou:impl", ":app"]})

    def test_앱의_모듈이면_그린다(self):
        self.assertTrue(P.hosts(self.ST, ":core:ui"))
        self.assertTrue(P.hosts(self.ST, ":app", "demoDebug"))

    def test_다른_변형이나_앱_밖이면_아니다(self):
        self.assertFalse(P.hosts(self.ST, ":core:ui", "prodDebug"))
        self.assertFalse(P.hosts(self.ST, ":feature:x"))
        self.assertFalse(P.hosts("", ":core:ui"))

    def test_modules가_없는_옛_데몬은_자기_모듈만(self):
        old = json.dumps({"module": ":app", "variant": "debug", "last": {"compile": {"module": ":lib"}}})
        self.assertEqual(P.daemon_status(old)[:2], (":app", [":app"]))
        self.assertFalse(P.hosts(old, ":lib"))
