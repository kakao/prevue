import json
import os
from pathlib import Path
import shutil
import subprocess

from test_plan import Case, P

ROOT = Path(__file__).resolve().parents[2]


class EvalResponses(Case):
    def setUp(self):
        super().setUp()
        self.plugin = Path(self.tmp.name) / "plugin"
        (self.plugin / "bin").mkdir(parents=True)
        self.cli = self.plugin / "bin/prevue"
        shutil.copy(ROOT / "tests/evals/prevue", self.cli)
        shutil.copytree(ROOT / "plugin/bin/help", self.plugin / "bin/help")

    def invoke(self, scenario, command, file, *args):
        result = subprocess.run(
            [str(self.cli), command, file, *args], capture_output=True, text=True,
            cwd=self.tmp.name,
            env=dict(os.environ, EVAL_PREVUE_SCENARIO=scenario, EVAL_PREVUE_PERMITTED="1", TMPDIR=self.tmp.name),
        )
        return json.loads(result.stdout), result.returncode

    def test_preparation_commands_and_questions_match_the_real_cli(self):
        for scenario in ("unready", "first-install", "choose-app"):
            with self.subTest(scenario=scenario):
                choosing = scenario == "choose-app"
                repo = self.repo(":app", ":wear", ":core:ui") if choosing else self.repo(":app")
                module = ":core:ui" if choosing else ":app"
                file = repo.src(module)
                repo.built(module, "debug")
                repo.apk(":app", "debug")
                if choosing:
                    repo.apk(":wear", "debug")
                response, _ = P.health(*repo.plan(module, file, toolchain=scenario != "first-install"),
                                       False, "", file, "", False, "", False, os.environ)
                for command in ("show", "health", "wait"):
                    expected = P.prepare_request(dict(response)) if command == "show" else response
                    actual, code = self.invoke(scenario, command, file)
                    self.assertEqual(code, 3)
                    for key in ("ask", "next", "then", "options"):
                        self.assertEqual(actual.get(key), expected.get(key), (scenario, command, key))

    def test_warmup_show_completes_the_preview_without_another_start(self):
        for scenario in ("unready", "first-install", "choose-app"):
            with self.subTest(scenario=scenario):
                file = str(Path(self.tmp.name) / (scenario + ".kt"))
                response, code = self.invoke(scenario, "warmup", file, "--show", "--no-open")
                self.assertEqual(code, 0)
                self.assertTrue(response["ok"])
                self.assertEqual(response["file"], file)
                self.assertTrue(response["complete"])
                self.assertEqual(len(response["cards"]), 4)
                self.assertIn("viewer", response)
                self.assertIn("preparationViewer", response)
                self.assertFalse(response["opened"])
                self.assertEqual(response["preparation"]["module"], ":app")
                self.assertNotIn("next", response)
                ready, code = self.invoke(scenario, "show", file)
                self.assertEqual(code, 0)
                self.assertTrue(ready["complete"])

    def test_standalone_warmup_still_returns_the_next_start_command(self):
        response, code = self.invoke("unready", "warmup", "/repo/Standalone.kt")
        self.assertEqual(code, 0)
        self.assertTrue(response["next"].startswith("prevue start "))
        self.assertNotIn("preparationViewer", response)
        self.assertNotIn("cards", response)
