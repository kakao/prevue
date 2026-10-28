import json
import io
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from unittest import mock
from urllib.parse import parse_qs, urlsplit
from urllib.error import HTTPError
from urllib.request import urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "plugin/bin"))
import prevue_plan as plan
import prevue_prepare as preparation


class Request(unittest.TestCase):
    def test_only_show_requests_extend_the_approved_command(self):
        response = {"ask": "빌드 설정을 읽을까요?", "next": "prevue setup", "then": "prevue warmup /repo/File.kt --resources-from :app"}
        expected = dict(response, then=response["then"] + " --show")
        self.assertEqual(plan.prepare_request(dict(response)), expected)
        self.assertEqual(plan.prepare_request(expected), expected)
        self.assertEqual(plan.prepare_request({"next": "prevue start --classpath /a"}), {"next": "prevue start --classpath /a"})

    def test_start_arguments_preserve_paths_and_chosen_resource_dump(self):
        self.assertEqual(preparation.start_args({"classpath": "/a b/cp.json", "resourcesClasspath": "/app d/res.json"}, "/p q/File.kt"),
                         ["start", "--classpath", "/a b/cp.json", "--resources-from", "/app d/res.json", "--show", "/p q/File.kt"])

    def test_fileless_request_does_not_open_a_module_name_as_a_file(self):
        self.assertEqual(preparation.target_file("warmup", ["--module", ":ui", "--project", "/repo", "--show"]), "")

    def test_handoff_keeps_request_identity_and_checks_the_checkout(self):
        state = {"phase": "environment", "daemon": "http://127.0.0.1:12345/", "id": "a" * 32, "file": "/a b/File.kt", "started": 100,
                 "status": "http://127.0.0.1:54321/preparation/" + "a" * 32}
        with mock.patch.object(preparation, "urlopen", return_value=io.StringIO(json.dumps({"root": str(preparation.ROOT)}))):
            query = parse_qs(urlsplit(preparation.handoff(state)).query)
        self.assertEqual(query["file"], [state["file"]])
        self.assertEqual(query["id"], [state["id"]])
        self.assertEqual(query["preparationStatus"], [state["status"]])
        with mock.patch.object(preparation, "urlopen", return_value=io.StringIO(json.dumps({"root": "/other-checkout"}))):
            self.assertIsNone(preparation.handoff(state))


class PreparationProcess(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="prevue-prepare-")
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name) / "checkout with spaces"
        (self.root / "bin").mkdir(parents=True)
        (self.root / "viewer/js").mkdir(parents=True)
        (self.root / "viewer/prepare.html").write_text("<h1>준비</h1>")
        (self.root / "viewer/strings").mkdir()
        for dictionary in ("en.json", "ko.json"):
            shutil.copyfile(Path(preparation.__file__).parent.parent / "viewer/strings" / dictionary, self.root / "viewer/strings" / dictionary)
        self.script = self.root / "bin/prevue_prepare.py"
        shutil.copyfile(preparation.__file__, self.script)
        self.home = Path(self.tmp.name) / "prevue"
        self.env = dict(os.environ, PREVUE_HOME=str(self.home), NO_OPEN="1")
        self.log = Path(self.tmp.name) / "calls.jsonl"
        self.env["PREPARATION_TEST_LOG"] = str(self.log)
        cli = self.root / "bin/prevue"
        cli.write_text("#!" + sys.executable + "\n" + '''
import json, os, pathlib, subprocess, sys, time
with open(os.environ['PREPARATION_TEST_LOG'], 'a') as out:
    out.write(json.dumps(sys.argv[1:]) + '\\n')
if sys.argv[1] == 'warmup':
    time.sleep(float(os.environ.get('PREPARATION_TEST_DELAY', '.15')))
    if os.environ.get('PREPARATION_TEST_FAIL'):
        print(json.dumps({'ok':False, 'error':'Gradle compile failed'}));sys.exit(1)
    print(json.dumps({'ok':True, 'classpath':'/dump with space.json', 'resourcesClasspath':'/app dump.json', 'module':':ui', 'variant':'debug'}))
else:
    subprocess.check_call([sys.executable, str(pathlib.Path(__file__).with_name('prevue_prepare.py')), 'stage', os.environ['PREVUE_PREPARATION'], 'http://127.0.0.1:1/'])
    result={'viewer':'http://127.0.0.1:1/', 'opened':False}
    if not os.environ.get('PREPARATION_TEST_STATUS_ONLY'): result['ok']=True
    print(json.dumps(result))
''')
        cli.chmod(0o755)
        self.addCleanup(self.stop_servers)

    def stop_servers(self):
        for file in self.home.glob("preparations/*/server.json"):
            try:
                os.kill(json.loads(file.read_text())["pid"], signal.SIGTERM)
            except ProcessLookupError:
                pass

    def launch(self, *args, **env):
        process = subprocess.Popen([sys.executable, str(self.script), "run", "warmup", "8791", *args],
                                   env=dict(self.env, **env), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.addCleanup(lambda: process.poll() is None and process.kill())
        return process

    def wait_state(self):
        end = time.monotonic() + 5
        while time.monotonic() < end:
            files = list(self.home.glob("preparations/*/server.json"))
            if files:
                self.directory = files[0].parent
                state = preparation.read_state(self.directory)
                port = json.loads(files[0].read_text())["port"]
                return state, "http://127.0.0.1:%s/preparation/%s" % (port, state["id"])
            time.sleep(.02)
        self.fail("preparation server did not start")

    def test_warmup_is_visible_before_completion_then_opens_the_chosen_file(self):
        file = str(self.root / "Preview File.kt")
        process = self.launch(file, "--show", "--no-open", PREPARATION_TEST_DELAY=".6")
        _, url = self.wait_state()
        with urlopen(url, timeout=2) as response:
            self.assertEqual(json.load(response)["phase"], "project")
        output, error = process.communicate(timeout=5)
        self.assertEqual(process.returncode, 0, error)
        result = json.loads(output)
        self.assertTrue(result["ok"])
        self.assertFalse(result["opened"])
        calls = [json.loads(line) for line in self.log.read_text().splitlines()]
        self.assertEqual(calls[0], ["warmup", file])
        self.assertEqual(calls[1][:5], ["start", "--classpath", "/dump with space.json", "--resources-from", "/app dump.json"])
        self.assertEqual(calls[1][-3:], ["--show", str(Path(file).resolve()), "--no-open"])
        with urlopen(url, timeout=2) as response:
            self.assertEqual(json.load(response)["phase"], "environment")

    def test_failure_keeps_the_reason_and_does_not_start_a_preview(self):
        process = self.launch("--module", ":ui", "--show", PREPARATION_TEST_FAIL="1")
        _, url = self.wait_state()
        process.communicate(timeout=5)
        self.assertEqual(process.returncode, 1)
        with urlopen(url, timeout=2) as response:
            state = json.load(response)
        self.assertEqual((state["phase"], state["error"]), ("failure", "Gradle compile failed"))
        self.assertEqual(len(self.log.read_text().splitlines()), 1)

    def test_interrupt_does_not_start_a_preview_and_is_visible_in_the_browser(self):
        process = self.launch("--module", ":ui", "--show", PREPARATION_TEST_DELAY="30")
        _, url = self.wait_state()
        end = time.monotonic() + 3
        while not self.log.exists() and time.monotonic() < end:
            time.sleep(.02)
        process.send_signal(signal.SIGTERM)
        process.communicate(timeout=5)
        self.assertEqual(process.returncode, 130)
        with urlopen(url, timeout=2) as response:
            state = json.load(response)
        self.assertEqual(state["phase"], "failure")
        self.assertIn("interrupted", state["error"])
        self.assertEqual(state["errorKey"], "prep.stopped")
        self.assertEqual(len(self.log.read_text().splitlines()), 1)

    def test_private_state_and_parent_paths_are_not_static_files(self):
        process = self.launch("--module", ":ui", "--show")
        state, url = self.wait_state()
        base = url.split("/preparation/")[0]
        for path in ("/state.json", "/js/preparation/../../bin/prevue_prepare.py", "/preparation/wrong-request"):
            with self.assertRaises(HTTPError) as error:
                urlopen(base + path, timeout=2)
            self.assertEqual(error.exception.code, 404)
            error.exception.close()
        process.communicate(timeout=5)

    def test_fileless_start_accepts_the_existing_status_response_and_limits_cors(self):
        process = self.launch("--module", ":ui", "--show", PREPARATION_TEST_STATUS_ONLY="1")
        _, url = self.wait_state()
        output, error = process.communicate(timeout=5)
        self.assertEqual(process.returncode, 0, error)
        self.assertNotIn("ok", json.loads(output))
        self.assertEqual(preparation.read_state(self.directory)["phase"], "environment")
        from urllib.request import Request
        with urlopen(Request(url, headers={"Origin": "http://127.0.0.1:1"}), timeout=2) as response:
            self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "http://127.0.0.1:1")
        with urlopen(Request(url, headers={"Origin": "http://127.0.0.1:2"}), timeout=2) as response:
            self.assertIsNone(response.headers.get("Access-Control-Allow-Origin"))


class Reattach(unittest.TestCase):
    """다시 띄울 때 보던 탭이 있으면 새 탭(준비 화면)을 열지 않는다(D-112)."""

    def setUp(self):
        self.home = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.home)
        patch = mock.patch.dict(os.environ, {"PREVUE_HOME": self.home})
        patch.start(); self.addCleanup(patch.stop)
        self.marker = Path(self.home) / "daemons" / "reattach-8828"
        self.marker.parent.mkdir()

    def test_start_takes_the_fresh_mark_once(self):
        self.marker.write_text(str(time.time()))
        self.assertTrue(preparation.reattaching("start", "8828"))
        self.assertFalse(self.marker.exists())
        self.assertFalse(preparation.reattaching("start", "8828"))

    def test_old_or_missing_mark_opens_as_before(self):
        self.assertFalse(preparation.reattaching("start", "8828"))
        self.marker.write_text(str(time.time() - 121))
        self.assertFalse(preparation.reattaching("start", "8828"))

    def test_warmup_asks_the_running_daemon_for_viewers(self):
        for viewers, expected in ((2, True), (0, False)):
            with mock.patch.object(preparation, "urlopen", return_value=io.StringIO(json.dumps({"viewers": viewers}))):
                self.assertEqual(preparation.reattaching("warmup", "8828"), expected)
        self.assertFalse(preparation.reattaching("warmup", "1"))

    def test_reattach_is_confirmed_by_the_new_daemon_viewers(self):
        with mock.patch.object(preparation, "urlopen", return_value=io.StringIO(json.dumps({"viewers": 1}))):
            self.assertTrue(preparation.reattached("http://127.0.0.1:8828/"))
        with mock.patch.object(preparation, "urlopen", side_effect=lambda *a, **k: io.StringIO(json.dumps({"viewers": 0}))):
            self.assertFalse(preparation.reattached("http://127.0.0.1:8828/", wait=.5))
        self.assertFalse(preparation.reattached(None))


if __name__ == "__main__":
    unittest.main()
