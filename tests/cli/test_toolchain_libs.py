"""cli/toolchain_libs.py — 판올림마다 남는 lib 사본 중 어느 것을 지워도 되는가. 실행: python3 -m unittest discover -s tests/cli

쓰는 곳이 보이는 사본(이 체크아웃의 prevue-env · 떠 있는 데몬의 클래스패스)은 지워도 된다고 하지 않는다. 떠 있는 것을 못 보면 아무것도 지워도 된다고 하지 않는다.
끝의 묶음은 진짜 bin/prevue paths 를 가짜 HOME 으로 친다.
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "plugin", "cli"))
import toolchain_libs as T  # noqa: E402

PLUGIN = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "plugin"))


class Copies(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.tc = os.path.join(self.tmp.name, "toolchain")
        for n in ("lib-aaaa1111", "lib-bbbb2222", "lib-cccc3333", "layoutlib-17.0.3", "compiler-2.4.10"):
            os.makedirs(os.path.join(self.tc, n))
        open(os.path.join(self.tc, "lib-dead0000"), "w").close()

    def tearDown(self):
        self.tmp.cleanup()

    def copies(self, own, cmdlines):
        return {os.path.basename(c["path"]): (c["usedBy"], c["deletable"])
                for c in T.copies(self.tc, own, cmdlines, size=lambda p: 1)}

    def test_only_copies_nobody_uses_are_deletable(self):
        daemon = "java -cp /p/prevue.jar:%s/lib-bbbb2222/kotlin-stdlib.jar prevue.daemon.MainKt" % self.tc
        got = self.copies(os.path.join(self.tc, "lib-aaaa1111"), ["zsh", daemon])
        self.assertEqual(got, {
            "lib-aaaa1111": (["this plugin"], False),
            "lib-bbbb2222": (["running daemon"], False),
            "lib-cccc3333": ([], True),
        })

    def test_nothing_is_deletable_when_processes_cant_be_listed(self):
        got = self.copies(None, None)
        self.assertEqual({k: v[1] for k, v in got.items()},
                         {"lib-aaaa1111": False, "lib-bbbb2222": False, "lib-cccc3333": False})

    def test_a_hash_prefix_of_another_copy_is_not_a_use(self):
        got = self.copies(None, ["java -cp %s/lib-cccc33339/x.jar" % self.tc])
        self.assertEqual(got["lib-cccc3333"], ([], True))

    def test_missing_toolchain_lists_nothing(self):
        self.assertEqual(T.copies(os.path.join(self.tmp.name, "none"), None, []), [])


class PathsCommand(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.plugin = os.path.join(self.tmp.name, "plugin")
        os.makedirs(os.path.join(self.plugin, "bin"))
        shutil.copy(os.path.join(PLUGIN, "bin", "prevue"), os.path.join(self.plugin, "bin", "prevue"))
        shutil.copytree(os.path.join(PLUGIN, "cli"), os.path.join(self.plugin, "cli"),
                        ignore=shutil.ignore_patterns("__pycache__"))
        build = os.path.join(self.plugin, "daemon", "daemon", "build")
        os.makedirs(build)
        with open(os.path.join(build, "prevue-env"), "w") as f:
            f.write('PREVUE_LIB="$HOME/.prevue/toolchain/lib-aaaa1111"\n')
        self.home = os.path.join(self.tmp.name, "home")
        for n in ("lib-aaaa1111", "lib-cccc3333"):
            os.makedirs(os.path.join(self.home, ".prevue", "toolchain", n))

    def tearDown(self):
        self.tmp.cleanup()

    def test_paths_lists_every_copy_and_keeps_its_own(self):
        env = dict(os.environ, HOME=self.home, PREVUE_HOME=os.path.join(self.home, ".prevue"))
        p = subprocess.run([os.path.join(self.plugin, "bin", "prevue"), "paths"], cwd=self.tmp.name, env=env,
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
        out = json.loads(p.stdout.decode().strip().splitlines()[-1])
        self.assertEqual(p.returncode, 0)
        got = {os.path.basename(c["path"]): (c["usedBy"], c["deletable"]) for c in out["libCopies"]}
        self.assertEqual(got["lib-aaaa1111"], (["this plugin"], False))
        self.assertEqual(got["lib-cccc3333"][0], [])
        self.assertIn("libCopiesNote", out)


if __name__ == "__main__":
    unittest.main()
