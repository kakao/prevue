"""previews --of — 컴포저블 이름으로 Preview 찾기의 판정과 셸의 기다림(D-165). 실행: python3 -m unittest discover -s tests/cli
"""

from http.server import BaseHTTPRequestHandler
import json
import os
from pathlib import Path
import subprocess
import unittest

from test_plan import P
from test_seat import ROOT, DaemonSeat

DEF = {"path": "/r/lib/Badge.kt", "rel": "lib/Badge.kt", "module": ":lib"}
PREVIEW = {"fqn": "demo.BadgesKt.BadgePreview", "fn": "BadgePreview", "file": "/r/app/Badges.kt", "rel": "app/Badges.kt", "module": ":app"}


def index(definitions=(), previews=(), ready=True, of="Badge"):
    return {"ready": ready, "of": of, "definitions": list(definitions), "previews": list(previews)}


class Judgement(unittest.TestCase):
    def test_찾으면_0_이고_판정이_목록보다_앞에_온다(self):
        out, code = P.previews_of(index([DEF], [PREVIEW]), "Badge", 0)
        self.assertEqual(code, 0)
        self.assertEqual(list(out)[:2], ["ok", "of"])
        self.assertEqual(out["previews"], [PREVIEW])
        self.assertNotIn("message", out)

    def test_같은_이름의_정의가_여럿이면_0_에_고르게_하는_말을_싣는다(self):
        out, code = P.previews_of(index([DEF, dict(DEF, module=":app")], [PREVIEW]), "Badge", 0)
        self.assertEqual(code, 0)
        self.assertIn("let them choose", out["message"])

    def test_정의만_있으면_1_이고_정의_파일을_권한다(self):
        out, code = P.previews_of(index([DEF]), "Badge", 0)
        self.assertEqual((code, out["ok"]), (1, False))
        self.assertIn("No @Preview calls Badge directly", out["message"])
        self.assertEqual(out["definitions"], [DEF])

    def test_정의도_없으면_1_이고_라이브러리이거나_이름이_다르다고_말한다(self):
        out, code = P.previews_of(index(of="Text"), "Text", 0)
        self.assertEqual(code, 1)
        self.assertIn("No @Composable named Text", out["message"])

    def test_색인_준비_전이면_3(self):
        out, code = P.previews_of(index(ready=False), "Badge", 0)
        self.assertEqual((code, out["ready"]), (3, False))

    def test_데몬이_of_를_모르면_1_이고_파일로_돌아가게_한다(self):
        out, code = P.previews_of({"ok": False, "error": "java.lang.IllegalStateException: file이 필요하다"}, "Badge", 1)
        self.assertEqual((code, out["ok"]), (1, False))
        self.assertIn("prevue show <file>", out["error"])

    def test_데몬이_없으면_3_이고_파일을_찾아_show_하라고_한다(self):
        out, code = P.previews_of({"ok": False, "daemon": False, "error": "No daemon"}, "Badge", 3)
        self.assertEqual(code, 3)
        self.assertIn("prevue show <file>", out["error"])


class SlowIndex(BaseHTTPRequestHandler):
    """처음 두 번은 색인을 훑는 중이다."""
    status = {}
    asked = []

    def do_GET(self):
        self.reply(type(self).status)

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
        type(self).asked.append(body)
        ready = len(type(self).asked) > 2
        self.reply(index([DEF], [PREVIEW] if ready else [], ready=ready, of=body["of"].rsplit(".", 1)[-1]))

    def reply(self, body):
        data = json.dumps(body, separators=(",", ":")).encode()   # 실제 데몬처럼 빈칸 없이 — 셸이 grep 으로 ready 를 읽는다
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


class Waiting(DaemonSeat):
    handler = SlowIndex

    def setUp(self):
        SlowIndex.asked = []
        super().setUp()

    def run_cli(self, *args):
        env = dict(os.environ, HOME=self.home, PREVUE_HOME=os.path.join(self.home, ".prevue"))
        return subprocess.run([str(ROOT / "bin/prevue"), "previews", *args], capture_output=True, text=True, cwd=self.tmp.name, env=env)

    def test_색인을_훑는_동안은_다시_묻고_준비되면_찾은_것을_낸다(self):
        p = self.run_cli("--of", "lib.Badge", self.file)
        self.assertEqual(p.returncode, 0, p.stdout + p.stderr)
        self.assertEqual(len(SlowIndex.asked), 3)
        self.assertEqual(SlowIndex.asked[0], {"of": "lib.Badge"})
        self.assertEqual(json.loads(p.stdout)["previews"][0]["fqn"], PREVIEW["fqn"])


    def test_파일_없이_불러도_지금_저장소에_데몬이_없으면_남의_데몬에게_묻지_않는다(self):
        other = Path(self.tmp.name, "other")
        other.mkdir()
        Path(other, "settings.gradle.kts").touch()
        gradlew = Path(other, "gradlew")
        gradlew.touch()
        gradlew.chmod(0o755)
        env = dict(os.environ, HOME=self.home, PREVUE_HOME=os.path.join(self.home, ".prevue"))
        p = subprocess.run([str(ROOT / "bin/prevue"), "previews", "--of", "Badge"], capture_output=True, text=True, cwd=other, env=env)
        self.assertEqual(p.returncode, 3, p.stdout + p.stderr)
        self.assertEqual(SlowIndex.asked, [])


class NoDaemon(DaemonSeat):
    """자리에 아무도 없다 — 기록만 지우면 된다."""
    handler = SlowIndex

    def test_데몬이_없으면_파일을_찾아_show_하라고_3_으로_답한다(self):
        self.server.shutdown()
        self.server.server_close()
        for f in Path(self.home, ".prevue", "daemons").iterdir():
            f.unlink()
        env = dict(os.environ, HOME=self.home, PREVUE_HOME=os.path.join(self.home, ".prevue"))
        p = subprocess.run([str(ROOT / "bin/prevue"), "previews", "--of", "Badge", self.file], capture_output=True, text=True,
                           cwd=self.tmp.name, env=env)
        self.assertEqual(p.returncode, 3, p.stdout + p.stderr)
        self.assertIn("prevue show <file>", json.loads(p.stdout)["error"])


if __name__ == "__main__":
    unittest.main()
