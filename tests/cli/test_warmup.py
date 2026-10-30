"""bin/prevue warmup — Gradle 을 몇 번 부르나와 회차 기록. 가짜 gradlew 가 부름을 적고 대상마다 덤프를 쓴다.
실행: python3 -m unittest discover -s tests/cli
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from unittest import mock

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "plugin", "bin"))
import prevue_plan as P  # noqa: E402
from test_plan import Repo  # noqa: E402

PREVUE = os.path.join(os.path.dirname(__file__), "..", "..", "plugin", "bin", "prevue")
PLAN_PY = os.path.join(os.path.dirname(__file__), "..", "..", "plugin", "bin", "prevue_plan.py")

# 가짜 gradlew — 부를 때마다 대상(-Dprevue.project.N · variant.N · out.N)을 한 줄 적고, 대상마다 덤프를, -Dprevue.timing 에 단계 시각을 쓴다.
# FAKE_FAIL_BOTH 가 있으면 대상이 둘인 부름은 실패한다(합친 호출이 실패하는 경우). FAKE_NO_CLASSPATH 면 덤프에 classPath 가 없다
# (warmup 의 응답을 못 만드는 덤프). FAKE_KMP({모듈: 담은 앱 문구})에 든 모듈은 새 모양 KMP 모듈처럼 덤프 스크립트의 실패를 낸다.
FAKE = r'''#!/usr/bin/env python3
import json, os, sys, time
props, timing = {}, ""
for a in sys.argv[1:]:
    if a.startswith("-Dprevue.timing="): timing = a.split("=", 1)[1]
    elif a.startswith("-Dprevue."): k, v = a[len("-Dprevue."):].split("=", 1); props[k] = v
targets = []
while "project.%d" % len(targets) in props:
    i = len(targets); targets.append((props["project.%d" % i], props["variant.%d" % i], props["out.%d" % i]))
with open(os.environ["FAKE_LOG"], "a") as f: f.write(";".join("|".join(t) for t in targets) + "\n")
kmp = json.loads(os.environ.get("FAKE_KMP") or "{}")
for m, v, out in targets:
    if m in kmp:
        sys.stderr.write("FAILURE: Build failed with an exception.\n\n* What went wrong:\nCould not create task '%s:prevueDumpClasspath'.\n"
                         "> %s is a KMP module — it is drawn from the dump of the Android app module that includes it. Warm up with a file "
                         "of the app module and this module's previews come up from that dump%s\n\n* Try:\n> Run with --stacktrace\n"
                         % (m, m, " — apps that include it: " + kmp[m] if kmp[m] else ""))
        sys.exit(1)
if os.environ.get("FAKE_FAIL_BOTH") and len(targets) > 1:
    sys.stderr.write("FAILURE: 가짜 실패\n"); sys.exit(1)
apks = json.loads(os.environ["FAKE_APKS"])
for m, v, out in targets:
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    d = {"schema": 3, "project": m, "variant": v, "namespace": "", "resourceApkPath": apks.get(m, ""),
         "classPath": [], "projectClassPath": [], "compileClassPath": [], "rClassJars": [], "resourceDirs": [],
         "variantsKnown": [v]}
    if os.environ.get("FAKE_NO_CLASSPATH"):
        del d["classPath"]
    json.dump(d, open(out, "w"))
t = int(time.time() * 1000)
json.dump({"initAt": t, "settingsAt": t + 1, "configuredAt": t + 2, "graphTasks": 12, "graphAt": t + 3,
           "ran": 2, "upToDate": 9, "fromCache": 1, "dumpedAt": t + 4}, open(timing, "w"))
'''


class Warmup(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.home = os.path.join(self.tmp.name, "home")
        os.makedirs(self.home)
        self.log = os.path.join(self.tmp.name, "gradle.log")

    def tearDown(self):
        self.tmp.cleanup()

    def repo(self, built=True):
        r = Repo(self.tmp.name, [":core:ui", ":app"])
        if built:
            r.built(":core:ui", "debug", when=time.time())
            r.built(":app", "debug", when=time.time())
        self.apk = r.apk(":app", "debug")
        g = os.path.join(r.root, "gradlew")
        with open(g, "w") as f:
            f.write(FAKE)
        os.chmod(g, 0o755)
        return r

    def warmup(self, r, *args, fail_both=False, no_perl=False, old_date=False, no_classpath=False, file=None, cwd=None, kmp=None):
        env = {k: v for k, v in os.environ.items() if not k.startswith("CODEX")}
        env.update(HOME=self.home, FAKE_LOG=self.log, FAKE_APKS=json.dumps({":app": self.apk}), FAKE_KMP=json.dumps(kmp or {}))
        if fail_both:
            env["FAKE_FAIL_BOTH"] = "1"
        if no_classpath:
            env["FAKE_NO_CLASSPATH"] = "1"
        if no_perl:
            env["PATH"] = self.without_perl() + os.pathsep + env["PATH"]
        if old_date:
            env["PATH"] = self.date_without_nanos() + os.pathsep + env["PATH"]
        p = subprocess.run([PREVUE, "warmup", file or r.src(":core:ui"), *args], capture_output=True, text=True, env=env,
                           cwd=cwd, timeout=60)
        lines = p.stdout.strip().splitlines()
        return p.returncode, json.loads(lines[-1]) if lines and lines[-1].startswith("{") else {"stdout": p.stdout, "stderr": p.stderr}

    def date_without_nanos(self):
        # %N 을 모르는 BSD date 는 글자 N 을 그대로 찍는다(옛 macOS) — 그 값을 시각으로 읽으면 회차 기록이 1970년이 된다
        d = os.path.join(self.tmp.name, "old-date")
        os.makedirs(d, exist_ok=True)
        date = os.path.join(d, "date")
        with open(date, "w") as f:
            f.write('#!/bin/sh\ncase "$1" in +%s%N) echo 1791948233N ;; *) exec /bin/date "$@" ;; esac\n')
        os.chmod(date, 0o755)
        return d

    def without_perl(self):
        # perl 이 없는 환경을 만든다 — PATH 앞에 늘 실패하는 perl 을 둔다
        d = os.path.join(self.tmp.name, "no-perl")
        os.makedirs(d, exist_ok=True)
        perl = os.path.join(d, "perl")
        with open(perl, "w") as f:
            f.write("#!/bin/sh\nexit 127\n")
        os.chmod(perl, 0o755)
        return d

    def calls(self):
        with open(self.log) as f:
            return f.read().splitlines()

    def runs(self, out):
        with open(out["gradle"]["runs"]) as f:
            return [json.loads(line) for line in f]

    def daemon(self, r, module, root, variant="debug"):
        """status · shutdown 만 답하는 가짜 데몬. 기록(pid 파일)을 남겨 bin/prevue 가 찾게 한다. 받은 shutdown 을 센다."""
        got = []
        status = {"module": module, "modules": [module], "variant": variant, "root": root,
                  "overlay": os.path.join(self.home, ".prevue", "projects", P.repo_key(r.root), "daemon", "1", "overlay")}

        class H(BaseHTTPRequestHandler):
            def do_GET(self):
                body = json.dumps(status, separators=(",", ":")).encode()   # 데몬처럼 붙여 쓴다 — 셸이 sed 로 overlay 를 읽는다
                self.send_response(200)
                self.end_headers()
                self.wfile.write(body)

            def do_POST(self):
                got.append(self.path)
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b"{}")

            def log_message(self, *a):
                pass

        srv = HTTPServer(("127.0.0.1", 0), H)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        self.addCleanup(srv.shutdown)
        port = srv.server_address[1]
        d = os.path.join(self.home, ".prevue", "daemons")
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "daemon-%d.pid" % port), "w") as f:
            f.write("%d\n" % os.getpid())
        return port, got

    # 이슈 #152 — warmup 뒤 next 의 start 가 옛 덤프를 쥔 데몬을 그대로 다시 써 15장이 전부 ZipException 이었다
    def test_이_모듈을_그리는_내_데몬은_내린다(self):
        r = self.repo()
        mine, got = self.daemon(r, ":core:ui", os.path.realpath(os.path.join(os.path.dirname(PREVUE), "..")))
        other, got_other = self.daemon(r, ":core:ui", "/somewhere/else")
        _, got_app = self.daemon(r, ":app", os.path.realpath(os.path.join(os.path.dirname(PREVUE), "..")))
        _, got_variant = self.daemon(r, ":core:ui", os.path.realpath(os.path.join(os.path.dirname(PREVUE), "..")), variant="release")
        rc, out = self.warmup(r, "--resources-from", ":app")
        self.assertEqual(rc, 0, out)
        self.assertEqual((out["stoppedDaemons"], got), ([mine], ["/shutdown"]))
        # 남의 것 · 다른 모듈 · 다른 변형의 것은 그대로 — 그 덤프는 이번에 뜨지 않았다
        self.assertEqual((out["otherDaemons"], got_other, got_app, got_variant), ([other], [], [], []))
        self.assertIn("note", out)

    def test_데몬이_없으면_내린_것도_없다(self):
        rc, out = self.warmup(self.repo(), "--resources-from", ":app")
        self.assertEqual(rc, 0, out)
        self.assertNotIn("stoppedDaemons", out)
        self.assertNotIn("otherDaemons", out)

    def test_응답을_못_만들어도_옛_덤프를_쥔_내_데몬은_내린다(self):
        r = self.repo()
        _, got = self.daemon(r, ":core:ui", os.path.realpath(os.path.join(os.path.dirname(PREVUE), "..")))
        rc, out = self.warmup(r, "--resources-from", ":app", no_classpath=True)
        self.assertEqual((rc, got), (1, ["/shutdown"]), out)

    def test_파일_끝의_슬래시는_없는_것으로_본다(self):
        r = self.repo()
        rc, out = self.warmup(r, "--resources-from", ":app", file=r.src(":core:ui") + "/")
        self.assertEqual((rc, out.get("module")), (0, ":core:ui"), out)

    def test_out_이_파일_이름뿐이면_그_자리에_디렉터리를_만들지_않는다(self):
        r = self.repo()
        self.warmup(r, "--resources-from", ":app", "--out", "cp.json", cwd=r.root)
        self.assertTrue(os.path.isfile(os.path.join(r.root, "cp.json")))   # 디렉터리가 아니라 Gradle 이 쓴 덤프다

    def test_뜬_덤프에_빌드_파일_지문을_적는다(self):
        r = self.repo()
        rc, out = self.warmup(r, "--resources-from", ":app")
        self.assertEqual(rc, 0, out)
        for p in (out["classpath"], out["resourcesClasspath"]):
            with open(p) as f:
                d = json.load(f)
            self.assertEqual(d["repo"], r.root)
            self.assertIn("settings.gradle.kts", d["buildFiles"])

    def test_리소스를_빌릴_앱을_알면_두_덤프를_한_번에(self):
        rc, out = self.warmup(self.repo(), "--resources-from", ":app")
        self.assertEqual(rc, 0, out)
        self.assertEqual([c.count("|") for c in self.calls()], [4])          # 한 번에 대상 둘
        self.assertEqual((out["gradle"]["calls"], out["module"]), (1, ":core:ui"))
        self.assertTrue(out["resourcesClasspath"].endswith("app-debug.json"))
        self.assertIn("--resources-from " + out["resourcesClasspath"], out["next"])   # show 는 고른 것을 받지 못한다 — start 가 덤프를 쥔다
        run = self.runs(out)[-1]
        self.assertEqual(run["targets"], [":core:ui/debug", ":app/debug"])
        self.assertEqual(set(run["phases"]), {"startup", "settings", "configure", "graph", "execute", "finish"})
        self.assertEqual(run["tasks"], {"graphTasks": 12, "ran": 2, "upToDate": 9, "fromCache": 1})

    def test_합친_호출이_실패하면_하나씩_다시_뜬다(self):
        rc, out = self.warmup(self.repo(), "--resources-from", ":app", fail_both=True)
        self.assertEqual(rc, 0, out)
        self.assertEqual([c.count("|") for c in self.calls()], [4, 2, 2])
        self.assertEqual(out["gradle"]["calls"], 3)
        self.assertEqual([r["ok"] for r in self.runs(out)], [False, True, True])

    def test_perl_이_없어도_회차를_남긴다(self):
        rc, out = self.warmup(self.repo(), "--resources-from", ":app", no_perl=True)
        self.assertEqual(rc, 0, out)
        run = self.runs(out)[-1]
        self.assertTrue(run["ok"])
        self.assertGreaterEqual(run["ms"], 0)
        self.assertEqual(run["targets"], [":core:ui/debug", ":app/debug"])

    def test_date_가_N_을_모르면_python_으로_잰다(self):
        rc, out = self.warmup(self.repo(), "--resources-from", ":app", old_date=True)
        self.assertEqual(rc, 0, out)
        run = self.runs(out)[-1]
        at = time.mktime(time.strptime(run["at"], "%Y-%m-%dT%H:%M:%S"))
        self.assertLess(abs(time.time() - at), 600, run)
        with open(out["classpath"]) as f:
            self.assertNotIn("changed-during-warmup", json.load(f)["buildFiles"].values())

    def test_변형을_못_찍으면_plan_응답을_그대로_내고_Gradle_을_부르지_않는다(self):
        r = self.repo(built=False)
        r.built(":core:ui", "release", when=time.time())
        rc, out = self.warmup(r)
        self.assertEqual((rc, out.get("need"), out.get("choose")), (2, "choose", ["variant"]), out)
        self.assertFalse(os.path.exists(self.log))

    def test_제공자를_덤프_뒤에_고르면_지금처럼_두_번(self):
        rc, out = self.warmup(self.repo())
        self.assertEqual(rc, 0, out)
        self.assertEqual([c.split("|")[0] for c in self.calls()], [":core:ui", ":app"])
        self.assertEqual(out["gradle"]["calls"], 2)

    def test_변형을_짐작했으면_합치지_않는다(self):
        rc, out = self.warmup(self.repo(built=False), "--resources-from", ":app")
        self.assertEqual(rc, 0, out)
        self.assertEqual([c.split("|")[0] for c in self.calls()], [":core:ui", ":app"])

    def test_출력_경로에_구분_글자가_있어도_뜬다(self):
        self.home = os.path.join(self.tmp.name, "ho;me|x")
        os.makedirs(self.home)
        rc, out = self.warmup(self.repo(), "--resources-from", ":app")
        self.assertEqual((rc, out["gradle"]["calls"]), (0, 1), out)
        self.assertTrue(out["classpath"].startswith(self.home) and os.path.exists(out["resourcesClasspath"]))


    def test_KMP_모듈은_담은_앱을_알면_모듈을_뜨지_않고_앱만_뜬다(self):
        r = self.repo(built=False)
        r.built(":core:ui", "androidMain", when=time.time())
        r.built(":app", "debug", when=time.time())
        f = r.src(":core:ui")
        rc, out = self.warmup(r, file=f, kmp={":core:ui": ":app [debug]"})
        self.assertEqual(rc, 0, out)
        self.assertEqual([c.split("|")[:2] for c in self.calls()], [[":app", "debug"]])
        self.assertEqual((out["module"], out["gradle"]["calls"]), (":app", 1))
        self.assertTrue(out["next"].endswith("--show " + f), out["next"])
        self.assertNotIn("--resources-from", out["next"])

    def test_KMP_모듈을_처음_뜨면_실패가_알려_준_앱으로_다시_뜬다(self):
        r = self.repo(built=False)
        os.remove(self.apk)                                                  # 새 클론 — 리소스 APK 도 없다
        rc, out = self.warmup(r, kmp={":core:ui": ":app [benchmarkDebug, debug]"})
        self.assertEqual(rc, 0, out)
        self.assertEqual([c.split("|")[:2] for c in self.calls()], [[":core:ui", "debug"], [":app", "debug"]])
        self.assertEqual((out["ok"], out["module"], out["gradle"]["calls"]), (True, ":app", 2))
        self.assertTrue(out["classpath"].endswith("app-debug.json"))

    def test_KMP_모듈을_담은_앱이_여럿이면_고르게_하고_멈춘다(self):
        rc, out = self.warmup(self.repo(built=False), kmp={":core:ui": ":app [debug]; :tb [debug]"})
        self.assertEqual((rc, out.get("need")), (2, "choose"), out)
        self.assertEqual(len(self.calls()), 1)

    def test_KMP_모듈의_앱을_못_찾으면_지금_안내로_멈춘다(self):
        rc, out = self.warmup(self.repo(built=False), kmp={":core:ui": ""})
        self.assertEqual(rc, 1, out)
        self.assertIn("Warm up with a file of the app module", out["error"])
        self.assertEqual(len(self.calls()), 1)


class Combine(unittest.TestCase):
    """이 모듈과 리소스 앱을 Gradle 한 번에 뜰지 — 실패할 근거가 보이면 합치지 않는다."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.r = Repo(self.tmp.name, [":core:ui", ":app"])
        self.r.built(":core:ui", "debug")
        self.r.apk(":app", "debug")

    def tearDown(self):
        self.tmp.cleanup()

    def combine(self, by="fresh", resfrom=":app", module=":core:ui"):
        return P.combine_provider(self.r.root, module, "debug", by, resfrom)

    def test_제공자_변형을_관찰했으면_합친다(self):
        self.r.built(":app", "debug")
        self.assertEqual((self.combine(), self.combine(resfrom="app")), ("debug", "debug"))

    def test_제공자_변형이_짐작이면_합치지_않는다(self):
        self.assertEqual(self.combine(), "")                       # :app 에 관찰된 변형이 없다(플레이버 앱을 안 빌드한 클론)

    def test_이_모듈의_변형이_짐작이면_합치지_않는다(self):
        self.r.built(":app", "debug")
        self.assertEqual(self.combine(by="assumed"), "")

    def test_변형을_받았으면_셸이_고른_JDK로_정한다(self):
        self.r.built(":app", "debug")
        self.assertEqual(P.warmup_target(self.r.root, ":core:ui", "debug", ":app", "", "/jdk\t출처"),
                         ("debug", "given", "/jdk", "출처", "debug", "", ""))

    def test_변형을_안_받았으면_plan_의_변형과_JDK로_정한다(self):
        plan = json.dumps({"variant": "debug", "variantChosenBy": "fresh", "gradleJdk": None, "gradleJdkFrom": "없음"})
        self.assertEqual(P.warmup_target(self.r.root, ":core:ui", "", "", plan, ""), ("debug", "fresh", "", "없음", "", "", ""))

    def test_plan_이_변형을_못_찍었으면_정하지_않는다(self):
        for plan in (json.dumps({"variant": None, "need": "choose"}), "gradlew not found"):
            self.assertIsNone(P.warmup_target(self.r.root, ":core:ui", "", ":app", plan, ""))

    def test_합칠지_판정이_깨지면_합치지_않고_하나씩_뜬다(self):
        with mock.patch.object(P, "combine_provider", side_effect=PermissionError("읽을 수 없다")):
            self.assertEqual(P.warmup_target(self.r.root, ":core:ui", "debug", ":app", "", "/jdk\t출처")[4], "")

    def test_자기_리소스_APK가_있거나_제공자가_자기면_합치지_않는다(self):
        self.r.built(":app", "debug")
        self.r.apk(":core:ui", "debug")
        self.assertEqual((self.combine(), self.combine(module=":app")), ("", ""))
        self.assertEqual(P.combine_provider(self.r.root, ":core:ui", "debug", "fresh", ""), "")


class Finish(unittest.TestCase):
    """warmup-finish — 내릴 데몬을 먼저 내보내고, 지문을 못 적어도 응답을 낸다."""

    def test_지문을_못_적어도_내릴_데몬과_응답을_낸다(self):
        with tempfile.TemporaryDirectory() as t:
            out = os.path.join(t, "core_ui-debug.json")
            with open(out, "w") as f:
                json.dump({"project": ":core:ui", "variant": "debug", "classPath": [], "resourceApkPath": ""}, f)
            status = json.dumps({"module": ":core:ui", "modules": [":core:ui"], "variant": "debug", "root": "/prevue"})
            p = subprocess.run([sys.executable, PLAN_PY, "warmup-finish", t, "1791948233834", ":core:ui", "debug", "/prevue",
                                out, os.path.join(t, "없는-덤프.json"), "", "", "", "1", "100", ""],
                               input="8791\t%s\n" % status, capture_output=True, text=True, timeout=30)
            lines = p.stdout.splitlines()
            self.assertEqual((p.returncode, lines[:2]), (0, ["8791", ""]), p.stderr)
            self.assertEqual(json.loads(lines[2])["stoppedDaemons"], [8791])
            self.assertIn("couldn't write build file fingerprints", p.stderr)
            with open(out) as f:
                self.assertIn("buildFiles", json.load(f))   # 읽을 수 있는 덤프에는 적었다


class GradleRun(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.runs = os.path.join(self.tmp.name, "p", "warmup-runs.jsonl")
        self.timing = os.path.join(self.tmp.name, "timing.json")

    def tearDown(self):
        self.tmp.cleanup()

    def stamps(self, d):
        with open(self.timing, "w") as f:
            json.dump(d, f)

    def last(self):
        with open(self.runs) as f:
            return json.loads(f.read().splitlines()[-1])

    def test_단계는_앞뒤_시각의_차(self):
        self.stamps({"initAt": 1500, "settingsAt": 2000, "configuredAt": 4000, "graphAt": 4100, "dumpedAt": 9000, "ran": 3})
        self.assertEqual(P.gradle_run(self.timing, "1000", "9300", "0", self.runs, "/jdk", [":a|debug|/o.json"]), 8300)
        r = self.last()
        self.assertEqual(r["phases"], {"startup": 500, "settings": 500, "configure": 2000, "graph": 100, "execute": 4900, "finish": 300})
        self.assertEqual((r["ok"], r["targets"], r["tasks"]), (True, [":a/debug"], {"ran": 3}))

    def test_실패한_빌드는_간_데까지만(self):
        self.stamps({"initAt": 1500, "settingsAt": 2000})
        P.gradle_run(self.timing, "1000", "5000", "1", self.runs, "", [":a|debug|/o.json"])
        r = self.last()
        self.assertEqual((r["ok"], r["phases"], r["tasks"]), (False, {"startup": 500, "settings": 500}, {}))

    def test_시각_파일이_없어도_벽시계는_남는다(self):
        P.gradle_run(os.path.join(self.tmp.name, "없음"), "1000", "4000", "1", self.runs, "", [":a|debug|/o.json"])
        self.assertEqual((self.last()["ms"], self.last()["phases"]), (3000, {}))

    def test_기록은_덧붙이고_두_배로_불면_최근_것만_남긴다(self):
        keep, P.RUNS_KEEP = P.RUNS_KEEP, 5
        try:
            for i in range(11):
                P.gradle_run("", str(i * 10), str(i * 10 + i), "0", self.runs, "", [":a|debug|/o.json"])
                with open(self.runs) as f:
                    n = len(f.read().splitlines())
                self.assertEqual(n, i + 1 if i < 10 else 5)
            with open(self.runs) as f:
                self.assertEqual([json.loads(line)["ms"] for line in f], [6, 7, 8, 9, 10])
        finally:
            P.RUNS_KEEP = keep


class NotGradle(unittest.TestCase):
    """Amper 처럼 gradlew 가 없는 빌드 — Gradle 만 읽는다고 이유를 말하고 멈춘다. --project 만 권하면 없는 gradlew 를 찾게 만든다."""

    def test_gradlew_가_없으면_Gradle_빌드만_읽는다고_말한다(self):
        with tempfile.TemporaryDirectory() as t:
            open(os.path.join(t, "module.yaml"), "w").close()
            kt = os.path.join(t, "Main.kt")
            open(kt, "w").close()
            env = dict(os.environ, HOME=t)
            w = subprocess.run([PREVUE, "warmup", kt], capture_output=True, text=True, env=env, timeout=60)
            self.assertEqual(w.returncode, 2, w.stdout + w.stderr)
            h = subprocess.run([PREVUE, "health", kt], capture_output=True, text=True, env=env, timeout=60)
            for out in (w.stdout, h.stdout):
                self.assertIn("Gradle builds only", json.loads(out.strip().splitlines()[-1])["error"])


class NoPython(unittest.TestCase):
    """python3 가 없는 맥(Command Line Tools 없음). bin/prevue 가 python 없이 답해야 한다 — 물을 문장(ask)까지 JSON 으로."""

    def test_python3_가_없으면_설치_동의를_묻는다(self):
        with tempfile.TemporaryDirectory() as t:
            for c in ("sed", "tr", "dirname", "cat", "uname", "readlink", "basename", "head", "grep", "cut", "mkdir"):
                p = shutil.which(c)
                if p:
                    os.symlink(p, os.path.join(t, c))
            p = subprocess.run(["/bin/bash", PREVUE, "health", "/x/Screen.kt"], capture_output=True, text=True,
                               env={"HOME": t, "PATH": t}, timeout=30)
            self.assertEqual(p.returncode, 1, p.stdout + p.stderr)
            out = json.loads(p.stdout)
            self.assertEqual(out["missing"], ["python3"])
            self.assertEqual(out["ask"], P.say("python3"))


if __name__ == "__main__":
    unittest.main()
