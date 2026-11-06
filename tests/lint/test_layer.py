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


class LayerRule(unittest.TestCase):
    def test_갈래_이름으로_묶는다(self):
        self.assertEqual(lint.layer_rule("ForbiddenImport/controller"), "layer/controller")
        self.assertIsNone(lint.layer_rule("LongMethod"))
        self.assertIsNone(lint.layer_rule("LongMethod/strict"))


if __name__ == "__main__":
    unittest.main()
