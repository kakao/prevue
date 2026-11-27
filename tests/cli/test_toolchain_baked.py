"""bin/prevue 의 툴체인 판정 — 체크아웃에 prevue-env 가 남아도 그것이 가리키는 공유 툴체인이 비면 없는 것이다.
실행: python3 -m unittest discover -s tests/cli

~/.prevue/toolchain 을 지웠거나 같은 체크아웃을 다른 계정이 쓰면 prevue-env 만 남는다. 파일만 보던 판정은 없는 jar 로
데몬을 띄워 JVM 이 "JavaFX 런타임 구성요소 누락"을 내며 죽었다(SDK 없는 맥 사람 확인 1회차). 진짜 bin/prevue 를
임시 플러그인 디렉터리에 옮겨 HOME 을 비운 채 친다 — 사용자의 ~/.prevue 와 이 체크아웃의 build/ 는 건드리지 않는다.
"""

import json
import os
import re
import shutil
import stat
import subprocess
import unittest

from test_daemon_records import free_port
from test_plan import Case, P, fake_jdk, fake_sdk

PLUGIN = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "plugin"))
LAYOUTLIB, COMPILER, LIB = ".prevue/toolchain/layoutlib-1", ".prevue/toolchain/compiler-1", ".prevue/toolchain/lib-1"


class Baked(Case):
    def setUp(self):
        super().setUp()
        self.plugin = os.path.join(self.tmp.name, "plugin")
        os.makedirs(os.path.join(self.plugin, "bin"))
        shutil.copy(os.path.join(PLUGIN, "bin", "prevue"), os.path.join(self.plugin, "bin", "prevue"))
        shutil.copytree(os.path.join(PLUGIN, "cli"), os.path.join(self.plugin, "cli"),
                        ignore=shutil.ignore_patterns("__pycache__"))
        os.makedirs(os.path.join(self.plugin, "daemon", "gradle"))
        shutil.copy(os.path.join(PLUGIN, "daemon", "gradle", "libs.versions.toml"),
                    os.path.join(self.plugin, "daemon", "gradle", "libs.versions.toml"))
        build = os.path.join(self.plugin, "daemon", "daemon", "build")
        os.makedirs(build)
        with open(os.path.join(build, "prevue-env"), "w") as f:
            f.write('PREVUE_CP="$ROOT/daemon/daemon/build/libs/prevue.jar:$HOME/%s/a.jar"\n' % LIB)
            f.write('PREVUE_LAYOUTLIB="$HOME/%s"\nPREVUE_COMPILER="$HOME/%s"\nPREVUE_LIB="$HOME/%s"\n' % (LAYOUTLIB, COMPILER, LIB))
        self.home = os.path.join(self.tmp.name, "home")
        os.makedirs(self.home)

    def prevue(self, *args, **extra):
        env = {k: v for k, v in os.environ.items()
               if k not in ("PREVUE_PORT", "PREVUE_PREPARATION", "PREVUE_JDK", "PREVUE_JDK_RESOLVED", "CODEX_SANDBOX")}
        env.update(HOME=self.home, PREVUE_HOME=os.path.join(self.home, ".prevue"),
                   GRADLE_USER_HOME=os.path.join(self.home, ".gradle"), NO_OPEN="1", **extra)
        p = subprocess.run([os.path.join(self.plugin, "bin", "prevue")] + list(args), cwd=self.tmp.name, env=env,
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
        return p.returncode, json.loads(p.stdout.decode().strip().splitlines()[-1])

    def toolchain(self, *rels):
        for rel in rels:
            os.makedirs(os.path.join(self.home, rel), exist_ok=True)

    def file(self):
        r = self.repo(":app")
        gradlew = os.path.join(r.root, "gradlew")
        os.chmod(gradlew, os.stat(gradlew).st_mode | stat.S_IXUSR)
        return r.src(":app")

    def test_start_says_setup_instead_of_launching_on_missing_jars(self):
        code, out = self.prevue("start", "--no-open", PREVUE_PORT=str(free_port()),
                                PREVUE_PREPARATION=os.path.join(self.tmp.name, "prep"))
        self.assertEqual((code, out["missing"]), (3, ["toolchain"]))
        self.assertFalse(os.path.exists(os.path.join(self.home, ".prevue", "daemons")))

    def shared_toolchain(self):
        """이 플러그인 버전의 공유 툴체인(컴파일러 · layoutlib · Metro 캐시)을 HOME 에 둔다 — 판올림 뒤 build/ 만 빈 상태."""
        with open(os.path.join(self.plugin, "daemon", "gradle", "libs.versions.toml")) as f:
            v = dict(re.findall(r'^(kotlin|layoutlib-data|metro) *= *"([^"]+)"', f.read(), re.M))
        self.toolchain(".prevue/toolchain/compiler-" + v["kotlin"], ".prevue/toolchain/layoutlib-" + v["layoutlib-data"],
                       ".gradle/caches/modules-2/files-2.1/dev.zacsweers.metro/compiler/" + v["metro"])

    def traced(self, path):
        """부르면 흔적 파일을 남기는 실행 파일. 흔적 경로를 돌려준다."""
        trace = path + ".ran"
        if os.path.exists(trace):
            os.remove(trace)
        with open(path, "w") as f:
            f.write('#!/bin/sh\necho "$*" > "%s"\n' % trace)
        os.chmod(path, 0o755)
        return trace

    def bake_start(self, jdk_version):
        """안 구워졌고 공유 툴체인은 있을 때의 start — prevue_prepare.py 가 PREVUE_PREPARATION 으로 다시 부르는 안쪽 start 다."""
        self.shared_toolchain()
        jdk = fake_jdk(os.path.join(self.tmp.name, "jdk-" + jdk_version), jdk_version)
        gradle_ran = self.traced(os.path.join(self.plugin, "daemon", "gradlew"))
        code, out = self.prevue("start", "--no-open", PREVUE_PORT=str(free_port()), PREVUE_JDK=jdk,
                                PREVUE_PREPARATION=os.path.join(self.tmp.name, "prep"))
        return code, out, os.path.exists(gradle_ran)

    def failing_bake_start(self, gradle_says):
        self.shared_toolchain()
        jdk = fake_jdk(os.path.join(self.tmp.name, "jdk-start-%d" % len(os.listdir(self.tmp.name))), "21.0.12")
        with open(os.path.join(self.plugin, "daemon", "gradlew"), "w") as f:
            f.write("#!/bin/sh\necho '%s' >&2\nexit 1\n" % gradle_says)
        os.chmod(os.path.join(self.plugin, "daemon", "gradlew"), 0o755)
        return self.prevue("start", "--no-open", PREVUE_PORT=str(free_port()), PREVUE_JDK=jdk,
                           PREVUE_PREPARATION=os.path.join(self.tmp.name, "prep"))

    def test_start_bake_asks_for_setup_only_when_the_cache_lacks_it(self):
        for says in ("No cached version of org.jetbrains.kotlin:kotlin-stdlib:2.0.0 available for offline mode",
                     "Plugin was not found: could not resolve plugin artifact 'dev.zacsweers.metro:dev.zacsweers.metro.gradle.plugin:9.9'"):
            with self.subTest(says=says):
                code, out = self.failing_bake_start(says)
                self.assertEqual((code, out.get("missing")), (3, ["toolchain"]), out)
                self.assertTrue(out["next"].endswith("prevue setup"), out)

    def test_start_bake_points_at_the_gradle_output_when_the_build_fails_for_another_reason(self):
        code, out = self.failing_bake_start("e: UnsupportedClassVersionError: class file version 65")
        self.assertEqual(code, 1, out)
        self.assertNotIn("next", out)
        self.assertNotIn("missing", out)
        self.assertIn("Gradle output above", out["error"])

    def test_show_answers_the_failed_start_bake_instead_of_asking_for_the_daemon(self):
        os.remove(os.path.join(self.plugin, "daemon", "daemon", "build", "prevue-env"))
        self.shared_toolchain()
        r = self.repo(":app")
        os.chmod(os.path.join(r.root, "gradlew"), 0o755)
        path = P.dump_path(os.path.join(self.home, ".prevue", "projects"), r.root, ":app", "debug")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            json.dump({"schema": P.SCHEMA, "project": ":app", "variant": "debug", "resourceApkPath": r.apk(":app", "debug"),
                       "projectClassPath": [r.built(":app", "debug")], "classPath": ["a.jar"]}, f)
        bakes = os.path.join(self.tmp.name, "bakes")
        with open(os.path.join(self.plugin, "daemon", "gradlew"), "w") as f:
            f.write("#!/bin/sh\necho ran >> '%s'\necho 'e: compile error' >&2\nexit 1\n" % bakes)
        os.chmod(os.path.join(self.plugin, "daemon", "gradlew"), 0o755)
        code, out = self.prevue("show", r.src(":app"), PREVUE_PORT=str(free_port()),
                                PREVUE_JDK=fake_jdk(os.path.join(self.tmp.name, "jdk-show"), "21.0.12"),
                                ANDROID_HOME=fake_sdk(os.path.join(self.tmp.name, "sdk")))
        self.assertEqual(code, 1, out)
        self.assertNotIn("missing", out)
        self.assertIn("Gradle output above", out["error"])
        with open(bakes) as f:
            self.assertEqual(len(f.readlines()), 1)

    def gradle_args(self, *setup_args):
        jdk = fake_jdk(os.path.join(self.tmp.name, "jdk-setup" + "".join(setup_args)), "21.0.12")
        trace = self.traced(os.path.join(self.plugin, "daemon", "gradlew"))
        self.prevue("setup", *setup_args, PREVUE_JDK=jdk)
        with open(trace) as f:
            return f.read().split()

    def test_start_bake_without_21_jdk_answers_jdk_before_gradle(self):
        code, out, gradle = self.bake_start("11.0.18")
        self.assertEqual((code, out.get("missing"), out.get("jdkVersion")), (3, ["jdk"], "11"), out)
        self.assertFalse(gradle, "굽기가 Gradle 래퍼를 불렀다")

    def test_start_bake_with_21_jdk_calls_gradle(self):
        # 위 테스트가 정말 굽기 갈래에서 멈췄다는 대조군 — 가짜 래퍼는 아무것도 굽지 않으니 끝은 툴체인 없음이다
        code, out, gradle = self.bake_start("21.0.12")
        self.assertTrue(gradle, "21+ JDK 인데 굽기가 Gradle 래퍼를 부르지 않았다")
        self.assertEqual((code, out.get("missing")), (3, ["toolchain"]), out)

    def test_every_bake_compiles_inside_gradle_not_in_a_shared_kotlin_daemon(self):
        in_process = "-Pkotlin.compiler.execution.strategy=in-process"
        for args in ((), ("--offline",)):
            with self.subTest(setup=args):
                self.assertIn(in_process, self.gradle_args(*args))
        self.bake_start("21.0.12")
        with open(os.path.join(self.plugin, "daemon", "gradlew.ran")) as f:
            self.assertIn(in_process, f.read().split())

    def offline_setup(self, gradle_says):
        jdk = fake_jdk(os.path.join(self.tmp.name, "jdk-offline-%d" % len(os.listdir(self.tmp.name))), "21.0.12")
        with open(os.path.join(self.plugin, "daemon", "gradlew"), "w") as f:
            f.write("#!/bin/sh\necho '%s' >&2\nexit 1\n" % gradle_says)
        os.chmod(os.path.join(self.plugin, "daemon", "gradlew"), 0o755)
        return self.prevue("setup", "--offline", PREVUE_JDK=jdk)

    def test_offline_setup_asks_for_a_download_only_when_the_cache_lacks_it(self):
        for says in ("No cached version of org.jetbrains.kotlin:kotlin-stdlib:2.0.0 available for offline mode",
                     "Plugin was not found: could not resolve plugin artifact 'dev.zacsweers.metro:dev.zacsweers.metro.gradle.plugin:9.9'"):
            with self.subTest(says=says):
                code, out = self.offline_setup(says)
                self.assertEqual((code, out["missing"]), (1, ["toolchain"]), out)
                self.assertTrue(out["next"].endswith("prevue setup"), out)

    def test_offline_setup_points_at_the_gradle_output_when_the_build_fails_for_another_reason(self):
        code, out = self.offline_setup("e: UnsupportedClassVersionError: class file version 65")
        self.assertEqual(code, 1)
        self.assertNotIn("next", out)
        self.assertNotIn("missing", out)
        self.assertIn("Gradle output above", out["error"])

    def test_doctor_counts_the_toolchain_by_its_directories_not_the_env_file(self):
        f = self.file()
        for present, missing in (((LAYOUTLIB, COMPILER), True), ((LIB,), False)):
            with self.subTest(present=present):
                self.toolchain(*present)
                _, out = self.prevue("doctor", f)
                self.assertEqual("toolchain" in out["missing"], missing)

    def test_paths_keeps_every_lib_copy_a_plugin_install_points_at(self):
        installs = ((".claude", "0.22.1", "daemon/daemon/build", "lib-22222222"),
                    (".codex", "0.20.1", "build", "lib-20202020"))
        for cfg, version, spot, name in installs:
            d = os.path.join(self.home, cfg, "plugins", "cache", "prevue", "prevue", version, spot)
            os.makedirs(d)
            with open(os.path.join(d, "prevue-env"), "w") as f:
                f.write('PREVUE_LIB="$HOME/.prevue/toolchain/%s"\n' % name)
        self.toolchain(LIB, ".prevue/toolchain/lib-22222222", ".prevue/toolchain/lib-20202020", ".prevue/toolchain/lib-99999999")
        code, out = self.prevue("paths", CLAUDE_CONFIG_DIR="", CODEX_HOME="")
        got = {os.path.basename(c["path"]): c["usedBy"] for c in out["libCopies"]}
        self.assertEqual((code, got), (0, {"lib-1": ["this plugin"], "lib-22222222": ["installed plugin"],
                                           "lib-20202020": ["installed plugin"], "lib-99999999": []}))


if __name__ == "__main__":
    unittest.main()
