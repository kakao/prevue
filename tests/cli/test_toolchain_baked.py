"""bin/prevue 의 툴체인 판정 — 체크아웃에 prevue-env 가 남아도 그것이 가리키는 공유 툴체인이 비면 없는 것이다.
실행: python3 -m unittest discover -s tests/cli

~/.prevue/toolchain 을 지웠거나 같은 체크아웃을 다른 계정이 쓰면 prevue-env 만 남는다. 파일만 보던 판정은 없는 jar 로
데몬을 띄워 JVM 이 "JavaFX 런타임 구성요소 누락"을 내며 죽었다(SDK 없는 맥 사람 확인 1회차). 진짜 bin/prevue 를
임시 플러그인 디렉터리에 옮겨 HOME 을 비운 채 친다 — 사용자의 ~/.prevue 와 이 체크아웃의 build/ 는 건드리지 않는다.
"""

import json
import os
import shutil
import stat
import subprocess
import unittest

from test_daemon_records import free_port
from test_plan import Case

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
        env = {k: v for k, v in os.environ.items() if k not in ("PREVUE_PORT", "PREVUE_PREPARATION")}
        env.update(HOME=self.home, PREVUE_HOME=os.path.join(self.home, ".prevue"),
                   GRADLE_USER_HOME=os.path.join(self.home, ".gradle"), NO_OPEN="1", **extra)
        p = subprocess.run([os.path.join(self.plugin, "bin", "prevue")] + list(args), cwd=self.tmp.name, env=env,
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
        return p.returncode, json.loads(p.stdout.decode().strip().splitlines()[-1])

    def toolchain(self, *rels):
        for rel in rels:
            os.makedirs(os.path.join(self.home, rel))

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

    def test_health_counts_the_toolchain_by_its_directories_not_the_env_file(self):
        f = self.file()
        for present, missing in (((LAYOUTLIB, COMPILER), True), ((LIB,), False)):
            with self.subTest(present=present):
                self.toolchain(*present)
                _, out = self.prevue("health", f)
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
