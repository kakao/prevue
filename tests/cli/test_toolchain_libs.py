"""cli/toolchain_libs.py — 판올림마다 남는 lib 사본 중 어느 것을 지워도 되는가. 실행: python3 -m unittest discover -s tests/cli

쓰는 곳이 보이는 사본(이 체크아웃 · 깔린 플러그인의 prevue-env, 떠 있는 데몬의 클래스패스)은 지워도 된다고 하지 않는다.
떠 있는 것을 못 보면 아무것도 지워도 된다고 하지 않는다. 진짜 bin/prevue paths 는 test_toolchain_baked 가 친다.
"""

import os
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "plugin", "cli"))
import toolchain_libs as T  # noqa: E402


class Copies(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.tc = os.path.join(self.tmp.name, "toolchain")
        for n in ("lib-aaaa1111", "lib-bbbb2222", "lib-cccc3333", "lib-dddd4444", "layoutlib-17.0.3", "compiler-2.4.10"):
            os.makedirs(os.path.join(self.tc, n))
        open(os.path.join(self.tc, "lib-dead0000"), "w").close()

    def tearDown(self):
        self.tmp.cleanup()

    def lib(self, name):
        return os.path.join(self.tc, name)

    def copies(self, own, installed, cmdlines):
        return {os.path.basename(c["path"]): (c["usedBy"], c["deletable"])
                for c in T.copies(self.tc, own, installed, cmdlines)}

    def test_only_copies_nobody_uses_are_deletable(self):
        daemon = "java -cp /p/prevue.jar:%s/kotlin-stdlib.jar prevue.daemon.MainKt" % self.lib("lib-bbbb2222")
        got = self.copies(self.lib("lib-aaaa1111"), {os.path.realpath(self.lib("lib-dddd4444"))}, ["zsh", daemon])
        self.assertEqual(got, {
            "lib-aaaa1111": (["this plugin"], False),
            "lib-bbbb2222": (["running daemon"], False),
            "lib-cccc3333": ([], True),
            "lib-dddd4444": (["installed plugin"], False),
        })

    def test_nothing_is_deletable_when_processes_cant_be_listed(self):
        got = self.copies(None, set(), None)
        self.assertFalse(any(deletable for _, deletable in got.values()))

    def test_a_copy_named_as_a_bare_argument_is_not_a_use(self):
        paths_run = "python3 - /p /l /c %s /h" % self.lib("lib-cccc3333")
        self.assertEqual(self.copies(None, set(), [paths_run])["lib-cccc3333"], ([], True))

    def test_missing_toolchain_lists_nothing(self):
        self.assertEqual(T.copies(os.path.join(self.tmp.name, "none"), None, set(), []), [])

    def test_installed_plugins_are_read_from_every_env_spot_but_not_orphaned_versions(self):
        home = os.path.join(self.tmp.name, "home")
        cache = os.path.join(home, ".claude", "plugins", "cache")
        for version, spot, name in (("0.22.1", "daemon/daemon/build", "lib-1"), ("0.18.0", "plugin/build", "lib-2"),
                                    ("0.20.1", "build", "lib-3")):
            d = os.path.join(cache, "prevue", "prevue", version, spot)
            os.makedirs(d)
            with open(os.path.join(d, "prevue-env"), "w") as f:
                f.write('PREVUE_CP="x"\nPREVUE_LIB="$HOME/.prevue/toolchain/%s"\n' % name)
        orphan = os.path.join(cache, "prevue", "prevue", "0.17.0")
        os.makedirs(os.path.join(orphan, "build"))
        with open(os.path.join(orphan, "build", "prevue-env"), "w") as f:
            f.write('PREVUE_LIB="$HOME/.prevue/toolchain/lib-4"\n')
        open(os.path.join(orphan, ".orphaned_at"), "w").close()
        got = T.installed_libs(home, [cache, os.path.join(home, ".codex", "plugins", "cache")])
        self.assertEqual(got, {os.path.realpath(os.path.join(home, ".prevue", "toolchain", n)) for n in ("lib-1", "lib-2", "lib-3")})

    def test_a_live_process_holding_a_copy_marks_it_running(self):
        jar = os.path.join(self.lib("lib-bbbb2222"), "kotlin-stdlib.jar")
        p = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)", "-cp", jar])
        self.addCleanup(p.wait)
        self.addCleanup(p.kill)
        if os.environ.get("CODEX_SANDBOX"):
            self.skipTest("the Codex sandbox blocks ps")
        cmdlines = T.running_cmdlines()
        self.assertIsNotNone(cmdlines)
        self.assertEqual(self.copies(None, set(), cmdlines)["lib-bbbb2222"], (["running daemon"], False))

    def test_process_names_that_arent_utf8_dont_break_the_listing(self):
        ps = subprocess.CompletedProcess([], 0, stdout=b"python3 x\xffy\njava -cp /t/lib-1/a.jar\n")
        with mock.patch.object(T.subprocess, "run", return_value=ps):
            self.assertEqual(T.running_cmdlines(), ["python3 x\ufffdy", "java -cp /t/lib-1/a.jar"])


if __name__ == "__main__":
    unittest.main()
