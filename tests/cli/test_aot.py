"""AOT 캐시 임시 파일 거두기 — bin/prevue 의 aot_args 를 떼어 와 임시 PREVUE_HOME 에서 돌린다. 데몬 · 실제 JDK 가 필요 없다.
실행: python3 -m unittest discover -s tests/cli
"""

import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest

SCRIPT = (Path(__file__).resolve().parents[2] / "plugin/bin/prevue").read_text(encoding="utf-8")
FUNC = re.search(r"^aot_args\(\) \{.*?^\}\n", SCRIPT, re.S | re.M).group(0)
DAY = 86400


class AotTemp(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.jdk = os.path.join(self.tmp.name, "jdk")
        os.makedirs(self.jdk)
        Path(self.jdk, "release").write_text('JAVA_VERSION="25.0.1"\n')
        self.aot = os.path.join(self.tmp.name, "home", "aot")
        os.makedirs(self.aot)

    def run_aot(self):
        script = f'JDK="{self.jdk}"; jdk_major() {{ echo 25; }}; AOT_DIR="{self.aot}"\n{FUNC}\naot_args -Xmx1g /cp'
        subprocess.run(["bash", "-c", script], check=True, env=dict(os.environ, PREVUE_AOT="1", FG="0"))

    def put(self, name, age_days):
        p = Path(self.aot, name)
        p.write_text("x")
        t = p.stat().st_mtime - age_days * DAY
        os.utime(p, (t, t))

    def names(self):
        return sorted(os.listdir(self.aot))

    def learn(self):
        self.run_aot()
        lock = next(n for n in self.names() if n.endswith(".training"))
        return lock[: -len(".training")]

    def test_하루_넘은_다른_키의_임시_파일은_거둔다(self):
        for n in ("1.aot.tmp", "1.aot.tmp.config", "1.aot", "1.training"):
            self.put(n, 2)
        self.run_aot()
        self.assertFalse([n for n in self.names() if n.startswith("1.")], self.names())

    def test_하루_안의_다른_키_임시_파일은_둔다(self):
        for n in ("1.aot.tmp", "1.aot.tmp.config"):
            self.put(n, 0)
        self.run_aot()
        self.assertEqual({"1.aot.tmp", "1.aot.tmp.config"} <= set(self.names()), True, self.names())

    def test_죽은_학습의_잠금을_치울_때_그_키의_config도_치운다(self):
        key = self.learn()
        Path(self.aot, key + ".training", "pid").write_text("999999")
        self.put(key + ".aot.tmp", 0)
        self.put(key + ".aot.tmp.config", 0)
        self.run_aot()
        self.assertFalse([n for n in self.names() if n.endswith((".tmp", ".tmp.config"))], self.names())


if __name__ == "__main__":
    unittest.main()
