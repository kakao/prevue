"""데몬 자리 고르기 — 바쁜 데몬의 status 가 늦어도 같은 저장소의 데몬에게 말하는가. 실행: python3 -m unittest discover -s tests/cli
"""

import hashlib
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import subprocess
import sys
import threading
import time

from test_plan import Case, P

ROOT = Path(__file__).resolve().parents[2] / "plugin"
CLI = (ROOT / "bin/prevue").read_text()
PORT_BASE = int(re.search(r"^PORT_BASE=(\d+)", CLI, re.M)[1])
PORT_SPAN = int(re.search(r"^PORT_SPAN=(\d+)", CLI, re.M)[1])


class SlowDaemon(BaseHTTPRequestHandler):
    """첫 status 는 CLI 의 2초 상한을 넘겨 답한다 — 렌더 줄 뒤에 선 데몬. 그다음부터는 바로 답한다."""
    status = {}
    statuses = 0
    waited = []
    lock = threading.Lock()

    def do_GET(self):
        if self.path != "/status":
            self.send_error(404)
            return
        with type(self).lock:
            type(self).statuses += 1
            first = type(self).statuses == 1
        if first:
            time.sleep(2.5)
        self.reply(type(self).status)

    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length", 0)))
        type(self).waited.append(self.path)
        self.reply({"ok": True, "complete": True, "cards": []})

    def reply(self, body):
        data = json.dumps(body, separators=(",", ":")).encode()   # 실제 데몬처럼 빈칸 없이 — CLI 가 sed 로 읽는다
        try:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def log_message(self, *args):
        pass


class Seat(Case):
    def setUp(self):
        super().setUp()
        self.r = self.repo(":app")
        os.chmod(os.path.join(self.r.root, "gradlew"), 0o755)
        self.file = self.r.src(":app")
        self.r.built(":app", "debug")
        self.home = os.path.join(self.tmp.name, "home")
        key = P.repo_key(os.path.abspath(self.r.root))
        self.port = PORT_BASE + int(hashlib.sha256(key.encode()).hexdigest()[:8], 16) % PORT_SPAN   # bin/prevue port_of
        SlowDaemon.statuses, SlowDaemon.waited = 0, []
        SlowDaemon.status = {"overlay": f"{self.home}/.prevue/projects/{key}/daemon/{self.port}/overlay/app", "root": str(ROOT),
                             "module": ":app", "modules": [":app"], "variant": "debug"}
        try:
            self.server = ThreadingHTTPServer(("127.0.0.1", self.port), SlowDaemon)
        except OSError:
            self.skipTest(f"{self.port} 를 다른 프로세스가 쓰고 있다")
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)
        daemons = os.path.join(self.home, ".prevue", "daemons")
        os.makedirs(daemons)
        # 기록은 명령줄이 그 포트의 데몬일 때만 산 것으로 읽힌다(bin/daemon_records.py ours)
        stand_in = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)", "prevue.daemon.MainKt", "--port", str(self.port)])
        self.addCleanup(stand_in.wait)
        self.addCleanup(stand_in.kill)
        Path(daemons, f"daemon-{self.port}.pid").write_text(str(stand_in.pid))

    def test_첫_status_가_늦어도_같은_저장소의_데몬에게_말한다(self):
        env = dict(os.environ, HOME=self.home, PREVUE_HOME=os.path.join(self.home, ".prevue"))
        p = subprocess.run([str(ROOT / "bin/prevue"), "wait", self.file], capture_output=True, text=True, cwd=self.tmp.name, env=env)
        self.assertEqual(SlowDaemon.waited, ["/wait"], p.stdout + p.stderr)
        self.assertGreaterEqual(SlowDaemon.statuses, 2, "첫 물음이 시간을 넘겨야 이 경우다")
