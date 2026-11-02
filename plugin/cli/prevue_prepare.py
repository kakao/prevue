import functools
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import uuid
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlencode, urlsplit
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parent.parent


# 준비 서버가 내는 실패 이유는 뷰어 영어 사전(viewer/strings/en.json)에서 읽는다 — CLI 출력에도 실려 CLI 문장처럼 영어 한 벌이다(D-106).
# 오류를 알리는 길에서 불리므로 사전을 못 읽어도 원래 실패를 가리지 않게 키를 그대로 돌려준다.
@functools.cache
def dictionary():
    try:
        return json.loads((ROOT / "viewer/strings/en.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def say(key):
    return dictionary().get(key, key)


# 실패 이유가 준비 서버 사전 문장이면 그 키도 싣는다 — 준비 화면은 키로 제 언어 문장을 채운다(D-109). 다른 실패 이유는 CLI 오류라 영어 그대로 보인다.
def failure(directory, error):
    key = next((k for k in ("prep.stopped", "prep.render.cannot", "prep.result.unreadable") if say(k) == error), None)
    return update_state(directory, phase="failure", error=error, errorKey=key, finished=time.time())


# 뷰어 언어(D-110) — bin/prevue 가 --lang 을 PREVUE_LANG 으로 넘긴다. 준비 화면과 넘겨받는 뷰어 주소에 싣는다.
def language():
    return {"lang": os.environ["PREVUE_LANG"]} if os.environ.get("PREVUE_LANG") else {}


def read_state(directory):
    return json.loads((Path(directory) / "state.json").read_text(encoding="utf-8"))


def update_state(directory, **changes):
    directory = Path(directory)
    state = dict(read_state(directory), **changes)
    temporary = directory / (uuid.uuid4().hex + ".tmp")
    temporary.write_text(json.dumps(state, ensure_ascii=False), encoding="utf-8")
    temporary.replace(directory / "state.json")
    return state


def handoff(state):
    base = state.get("daemon", "")
    if state["phase"] == "failure" or not re.fullmatch(r"http://127\.0\.0\.1:\d+/", base):
        return None
    try:
        with urlopen(base + "identity", timeout=.2) as response:
            status = json.load(response)
        if status.get("root") != str(ROOT):
            return None
    except (OSError, ValueError):
        return None
    query = {key: state[key] for key in ("file", "started", "id")}
    if state.get("status"):
        query["preparationStatus"] = state["status"]
    return base + "?" + urlencode(dict(query, prepare="1", **language()))


def serve(directory):
    directory = Path(directory)
    state = read_state(directory)
    deadline = time.monotonic() + 1800
    acknowledged = None

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(ROOT / "viewer"), **kwargs)

        def log_message(self, *_):
            pass

        def end_headers(self):
            self.send_header("Cache-Control", "no-store")
            origin = self.headers.get("Origin")
            daemon = read_state(directory).get("daemon", "").rstrip("/")
            if origin and origin == daemon:
                self.send_header("Access-Control-Allow-Origin", origin)
            super().end_headers()

        def do_GET(self):
            nonlocal acknowledged
            path = urlsplit(self.path).path
            if path == "/preparation/" + state["id"]:
                current = read_state(directory)
                if not current.get("finished") and not process_alive(current["owner"]):
                    current = failure(directory, say("prep.stopped"))
                current["status"] = "http://127.0.0.1:%d/preparation/%s" % (self.server.server_port, state["id"])
                destination = handoff(current)
                if destination:
                    current["viewer"] = destination
                    acknowledged = time.monotonic()
                payload = json.dumps(current, ensure_ascii=False).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
            elif path == "/" or path == "/prepare.html" or path in ("/tokens.css", "/preparation.css", "/js/strings.js") or path.startswith(("/js/preparation", "/strings/")):
                requested = (ROOT / "viewer" / path.lstrip("/")).resolve()
                if not requested.is_relative_to(ROOT / "viewer"):
                    self.send_error(404)
                    return
                if path == "/":
                    self.path = "/prepare.html"
                super().do_GET()
            else:
                self.send_error(404)

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    server.timeout = .5
    server.daemon_threads = True
    (directory / "server.json").write_text(json.dumps({"port": server.server_port, "pid": os.getpid()}))
    try:
        while time.monotonic() < deadline:
            server.handle_request()
            current = read_state(directory)
            if current.get("finished") and acknowledged is not None and time.monotonic() - acknowledged > 10:
                break
            if current.get("finished") and time.time() - current["finished"] > 600:
                break
    finally:
        server.server_close()
        shutil.rmtree(directory)


def process_alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False


def argument(args, name, default=""):
    return args[args.index(name) + 1] if name in args else default


def target_file(mode, args):
    if mode == "start":
        file = argument(args, "--show").split("#")[0]
        return str(Path(file).resolve()) if file and Path(file).exists() else file
    options = {"--variant", "--module", "--project", "--resources-from", "--out", "--port"}
    remaining = iter(args)
    file = ""
    for arg in remaining:
        if arg in options:
            next(remaining, None)
        elif not arg.startswith("-"):
            file = arg
    return str(Path(file).resolve()) if file else ""


def open_browser(url, disabled):
    if disabled or os.environ.get("CODEX_SANDBOX") == "seatbelt":
        return False
    command = shutil.which("open") or shutil.which("xdg-open")
    if not command:
        return False
    try:
        return subprocess.run([command, url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
    except OSError:
        return False


def result_of(output):
    for line in reversed(output.splitlines()):
        try:
            value = json.loads(line)
            if isinstance(value, dict):
                return value
        except ValueError:
            pass
    return {"ok": False, "error": say("prep.result.unreadable")}


def stop_servers():
    home = Path(os.environ.get("PREVUE_HOME", str(Path.home() / ".prevue")))
    for directory in (home / "preparations").glob("request-*"):
        try:
            if read_state(directory).get("root") != str(ROOT):
                continue
            info = json.loads((directory / "server.json").read_text())
            process = subprocess.run(["ps", "-p", str(info["pid"]), "-o", "args="], capture_output=True, text=True).stdout
            if str(Path(__file__).resolve()) not in process or " serve " not in process or str(directory) not in process:
                continue
            os.kill(info["pid"], signal.SIGTERM)
            shutil.rmtree(directory)
        except (OSError, ValueError):
            pass


# 다시 띄우는 동안 보던 탭이 같은 자리의 새 데몬에 다시 붙는다 — 새 탭(준비 화면)을 겹쳐 열지 않는다.
# start 는 warmup 이 데몬을 내리며 남긴 표시로, warmup --show 는 아직 떠 있는 데몬에 붙은 뷰어로 안다.
def reattaching(mode, port):
    marker = Path(os.environ.get("PREVUE_HOME", str(Path.home() / ".prevue"))) / "daemons" / ("reattach-" + port)
    if mode == "start":
        try:
            fresh = time.time() - float(marker.read_text().strip()) < 120
        except (OSError, ValueError):
            return False
        marker.unlink(missing_ok=True)
        return fresh
    try:
        with urlopen("http://127.0.0.1:%s/status" % port, timeout=2) as response:
            return (json.load(response).get("viewers") or 0) > 0
    except (OSError, ValueError):
        return False


def reattached(viewer, wait=8):
    viewer = (viewer or "").split("?")[0]
    if not viewer or not re.fullmatch(r"http://127\.0\.0\.1:\d+/", viewer):
        return False
    deadline = time.monotonic() + wait
    while time.monotonic() < deadline:
        try:
            with urlopen(viewer + "status", timeout=2) as response:
                if (json.load(response).get("viewers") or 0) > 0:
                    return True
        except (OSError, ValueError):
            pass
        time.sleep(.25)
    return False


def start_args(result, file):
    args = ["start", "--classpath", result["classpath"]]
    if result.get("resourcesClasspath"):
        args += ["--resources-from", result["resourcesClasspath"]]
    if file:
        args += ["--show", file]
    return args


def run(mode, port, args):
    home = Path(os.environ.get("PREVUE_HOME", str(Path.home() / ".prevue")))
    parent = home / "preparations"
    parent.mkdir(parents=True, exist_ok=True)
    directory = Path(tempfile.mkdtemp(prefix="request-", dir=parent))
    file = target_file(mode, args)
    state = {"id": uuid.uuid4().hex, "started": round(time.time() * 1000), "file": file,
             "phase": "project" if mode == "warmup" else "environment", "owner": os.getpid(), "root": str(ROOT)}
    (directory / "state.json").write_text(json.dumps(state, ensure_ascii=False), encoding="utf-8")
    server = subprocess.Popen([sys.executable, __file__, "serve", str(directory)], start_new_session=True,
                              stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    child = None
    opened = False
    url = ""
    interrupted = False

    def stop(signum, _):
        nonlocal interrupted
        interrupted = True
        if child and child.poll() is None:
            os.killpg(child.pid, signal.SIGTERM)

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        for _ in range(100):
            if (directory / "server.json").exists():
                break
            if server.poll() is not None:
                raise RuntimeError("Couldn't start the preparation screen server.")
            time.sleep(.02)
        info = json.loads((directory / "server.json").read_text())
        url = "http://127.0.0.1:%d/?%s" % (info["port"], urlencode(dict(id=state["id"], **language())))
        no_open = "--no-open" in args or os.environ.get("NO_OPEN") == "1"
        reattach = reattaching(mode, port)
        opened = reattach or open_browser(url, no_open)
        print("prevue: " + ("the open viewer reattaches to the new daemon" if reattach else "preparation screen " + url), file=sys.stderr, flush=True)
        env = dict(os.environ, PREVUE_PREPARATION=str(directory))

        def invoke(arguments):
            nonlocal child
            if interrupted:
                raise InterruptedError(say("prep.stopped"))
            child = subprocess.Popen([str(ROOT / "bin/prevue"), *arguments], env=env, stdout=subprocess.PIPE,
                                     text=True, start_new_session=True)
            output, _ = child.communicate()
            if interrupted:
                raise InterruptedError(say("prep.stopped"))
            return result_of(output), child.returncode

        arguments = [arg for arg in args if arg not in ("--show", "--no-open")] if mode == "warmup" else args
        result, code = invoke([mode, *arguments, *( ["--port", port] if mode == "start" else [])])
        if mode == "warmup" and code == 0 and result.get("ok"):
            update_state(directory, phase="environment")
            warmup = result
            result, code = invoke(start_args(warmup, file) + ["--no-open"])
            reattaching("start", port)
            result["preparation"] = {key: warmup[key] for key in ("classpath", "module", "variant", "gradle") if key in warmup}
        code = code or (1 if result.get("ok") is False else 0)
        # 이어받기는 짐작이다 — 실패했거나 보던 탭이 새 데몬에 다시 붙지 않았으면(닫혔다 · 숨었다 · 다른 자리) 지금 연다
        if reattach and (code or not reattached(result.get("viewer"))):
            reattach = False
            opened = open_browser(url if code else result.get("viewer") or url, no_open)
        if code:
            failure(directory, result.get("error") or result.get("message") or say("prep.render.cannot"))
        else:
            update_state(directory, finished=time.time())
        if not opened:
            result["opened"] = False
        elif result.get("opened") is False:
            result.pop("opened")
        if reattach:
            result["reattached"] = True
        else:
            result["preparationViewer"] = url
        print(json.dumps(result, ensure_ascii=False, separators=(",", ":")))
        return code
    except (OSError, RuntimeError, ValueError) as error:
        failure(directory, str(error))
        print(json.dumps({"ok": False, "error": str(error), "viewer": url, "opened": opened}, ensure_ascii=False))
        return 130 if interrupted else 1


if __name__ == "__main__":
    command = sys.argv[1]
    if command == "serve":
        serve(sys.argv[2])
    elif command == "stage":
        update_state(sys.argv[2], phase="environment", daemon=sys.argv[3])
    elif command == "run":
        sys.exit(run(sys.argv[2], sys.argv[3], sys.argv[4:]))
    elif command == "stop":
        stop_servers()
