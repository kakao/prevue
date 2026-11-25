import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest

SCRIPT = (Path(__file__).resolve().parents[2] / "plugin/bin/prevue").read_text(encoding="utf-8")
NOISE = re.search(r"^JVM_NOISE=.*$", SCRIPT, re.M).group(0)
FUNCS = "\n".join(re.search(rf"^{n}\(\) \{{.*?^\}}|^{n}\(\) \{{.*?\}}$", SCRIPT, re.S | re.M).group(0)
                  for n in ("log_failure", "log_why", "still_booting"))
AOT_TAIL = """Temporary AOTConfiguration recorded: /h/aot/1.aot.tmp.config
Launching child process /jdk/bin/java to assemble AOT cache /h/aot/1.aot.tmp using configuration /h/aot/1.aot.tmp.config
Picked up JAVA_TOOL_OPTIONS: -Xmx2g
Reading AOTConfiguration /h/aot/1.aot.tmp.config and writing AOTCache /h/aot/1.aot.tmp
[0.5s][warning][aot] Skipping a/B: Failed verification
AOTCache creation is complete: /h/aot/1.aot.tmp 204144640 bytes
Removed temporary AOT configuration file /h/aot/1.aot.tmp.config
"""


class LogWhy(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.log = os.path.join(self.tmp.name, "daemon.log")
        self.pid = os.path.join(self.tmp.name, "daemon-1.pid")

    def sh(self, call, log):
        Path(self.log).write_text(log, encoding="utf-8")
        script = f'LOG="{self.log}"; DAEMON_DIR="{self.tmp.name}"; PORT=1\n{NOISE}\n{FUNCS}\n{call}'
        return subprocess.run(["bash", "-c", script], capture_output=True, text=True)

    def test_AOT_마무리_줄만_남으면_이유로_내지_않는다(self):
        self.assertEqual(self.sh("log_why", "[prevue 1:00:00] 부트스트랩\n" + AOT_TAIL).stdout, "[prevue 1:00:00] 부트스트랩")
        self.assertEqual(self.sh("log_why", AOT_TAIL).stdout, "")

    def test_실패_줄이_있으면_AOT_줄_앞이어도_그것이_이유다(self):
        log = "[prevue 1:00:00] 데몬 실패: boom\n" + AOT_TAIL
        self.assertEqual(self.sh("log_why", log).stdout, "[prevue 1:00:00] 데몬 실패: boom")

    def test_살아_있고_실패_줄이_없으면_뜨는_중이다(self):
        Path(self.pid).write_text(str(os.getpid()))
        self.assertEqual(self.sh("still_booting", AOT_TAIL).returncode, 0)

    def test_실패_줄이_있거나_죽었으면_뜨는_중이_아니다(self):
        Path(self.pid).write_text(str(os.getpid()))
        self.assertNotEqual(self.sh("still_booting", "[prevue 1:00:00] 데몬 실패: x\n").returncode, 0)
        Path(self.pid).write_text("999999")
        self.assertNotEqual(self.sh("still_booting", AOT_TAIL).returncode, 0)


if __name__ == "__main__":
    unittest.main()
