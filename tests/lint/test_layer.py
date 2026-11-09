"""층 규칙(detekt, D-150)의 includes 가 본체 파일을 고르는지 — 못 고르는 glob 은 그 규칙이 말없이 통과한다."""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "tools", "lint"))
import lint  # noqa: E402

PATHS = [
    "plugin/daemon/application/src/main/kotlin/prevue/application/service/Tabs.kt",
    "plugin/daemon/infrastructure/src/main/kotlin/prevue/infrastructure/controller/http/Server.kt",
]
CONFIG = """style:
  ForbiddenImport/application:
    includes: ['**/prevue/application/**']
  ForbiddenImport/technology:
    includes: ['**/prevue/infrastructure/controller/**',
               "**/prevue/infrastructure/render/**"]
    excludes: ['**/prevue/domain/**']
    forbiddenImports:
      - { value: 'java.awt.*', reason: 'x' }
  ForbiddenImport/block:
    includes:
      - '**/prevue/application/**'
  ForbiddenImport/relative:
    includes: ['plugin/daemon/application/**', '**/prevue/{application,infrastructure}/**']
"""


class EmptyIncludes(unittest.TestCase):
    def test_파일을_못_고르는_glob_만_잡는다(self):
        found = lint.empty_includes(CONFIG, PATHS)
        self.assertEqual([f.line for f in found], [6, 7, 11, 14, 14])
        self.assertIn("render", found[0].advice)
        self.assertIn("[...]", found[2].advice)
        self.assertIn("**/", found[3].advice)

    def test_별_하나는_폴더를_넘지_않는다(self):
        self.assertFalse(lint.glob_regex("plugin/*/Tabs.kt").fullmatch(PATHS[0]))
        self.assertTrue(lint.glob_regex("**/service/*.kt").fullmatch(PATHS[0]))

    def test_지금_설정은_모든_glob_이_파일을_고른다(self):
        root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
        cwd = os.getcwd()
        os.chdir(root)
        try:
            with open(lint.DETEKT_CONFIG, encoding="utf-8") as f:
                config = f.read()
            self.assertGreater(len(lint.path_globs(config)), 10)
            self.assertEqual([], [(f.line, f.advice) for f in lint.empty_includes(config, lint.sources())])
        finally:
            os.chdir(cwd)


ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")


class LayerSeeds(unittest.TestCase):
    """심은 위반(tests/lint/layer)과 detekt 결과를 견주는 쪽 — detekt 실행은 lint.py 가 하고, 여기는 견주는 규칙만 본다."""

    def setUp(self):
        self.cwd = os.getcwd()
        os.chdir(ROOT)

    def tearDown(self):
        os.chdir(self.cwd)

    def test_줄_끝_표시만_기대로_읽는다(self):
        expected = lint.seed_expectations()
        self.assertIn(("tests/lint/layer/prevue/infrastructure/controller/http/Seed.kt", 5, "ForbiddenImport/http"), expected)
        self.assertIn(("tests/lint/layer/prevue/application/service/Seed.kt", 13, "ForbiddenMethodCall/application"), expected)
        self.assertFalse(any(path.endswith("bindings/Seed.kt") for path, _, _ in expected))
        json = [rule for path, n, rule in expected if path.endswith("json/Seed.kt") and n == 6]
        self.assertEqual(json, ["ForbiddenImport/json", "ForbiddenImport/technology"])

    def test_갈래마다_심은_위반이_있다(self):
        with open(lint.DETEKT_CONFIG, encoding="utf-8") as f:
            branches = lint.layer_branches(f.read())
        self.assertGreater(len(branches), 10)
        self.assertEqual(set(), branches - {rule for _, _, rule in lint.seed_expectations()})

    def test_못_잡은_것과_더_잡은_것을_가른다(self):
        expected = {("a.kt", 3, "ForbiddenImport/http"), ("a.kt", 4, "ForbiddenImport/http")}
        seeded = [lint.Finding("a.kt", 3, "layer/http", "", source="ForbiddenImport/http"),
                  lint.Finding("a.kt", 3, "layer/technology", "", source="ForbiddenImport/technology")]
        missed, extra = lint.seed_mismatch(expected, seeded)
        self.assertEqual(missed, [("a.kt", 4, "ForbiddenImport/http")])
        self.assertEqual(extra, [("a.kt", 3, "ForbiddenImport/technology")])

    def test_같은_줄을_두_번_잡아도_어긋난다(self):
        twice = [lint.Finding("a.kt", 3, "layer/http", "", source="ForbiddenImport/http")] * 2
        self.assertEqual(lint.seed_mismatch([("a.kt", 3, "ForbiddenImport/http")], twice),
                         ([], [("a.kt", 3, "ForbiddenImport/http")]))

    def test_하나도_실리지_않으면_따로_짚는다(self):
        expected = lint.seed_expectations()
        with self.assertRaisesRegex(lint.Unrunnable, "하나도 실리지 않았다"):
            lint.check_seeds(expected, [])

    def test_본_태스크에_심은_위반이_섞이면_멈춘다(self):
        stray = [lint.Finding("tests/lint/layer/prevue/daemon/Seed.kt", 3, "layer/daemon", "", source="ForbiddenImport/daemon")]
        with self.assertRaisesRegex(lint.Unrunnable, "전용 태스크"):
            lint.check_no_stray_seeds(stray)
        lint.check_no_stray_seeds([lint.Finding("plugin/daemon/application/src/main/kotlin/A.kt", 1, "detekt/X", "")])

    def test_심은_위반_보고서는_본_보고서와_따로다(self):
        self.assertNotIn(lint.SEED_REPORT, lint.DETEKT_REPORTS)
        self.assertTrue(lint.SEED_REPORT.startswith("plugin/daemon/build/lint/application/"))


class LayerRule(unittest.TestCase):
    def test_갈래_이름으로_묶는다(self):
        self.assertEqual(lint.layer_rule("ForbiddenImport/controller"), "layer/controller")
        self.assertIsNone(lint.layer_rule("LongMethod"))
        self.assertIsNone(lint.layer_rule("LongMethod/strict"))


if __name__ == "__main__":
    unittest.main()
