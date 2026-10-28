"""뷰어 사전 두 벌(viewer/strings/*.json) — 키와 {자리}가 같아야 언어를 바꿔도 빈 키나 채우지 못한 자리가 뜨지 않는다(D-109)."""
import json
import re
from pathlib import Path
import unittest


STRINGS = Path(__file__).resolve().parent.parent.parent / "plugin/viewer/strings"
SLOTS = re.compile(r"\{(\w+)\}")


# <키>.one 은 하나일 때 꼴이 바뀌는 언어만 두는 덧꼴이다 — 짝이 없어도 되지만 바탕 키는 있어야 한다.
def mismatches(base, other):
    keys = sorted(k for k in set(base) ^ set(other) if not (k.endswith(".one") and k[:-4] in base and k[:-4] in other))
    slots = sorted(k for k in set(base) & set(other) if sorted(SLOTS.findall(base[k])) != sorted(SLOTS.findall(other[k])))
    return keys, slots


class Dictionaries(unittest.TestCase):
    def test_every_language_has_the_same_keys_and_slots_as_english(self):
        english = json.loads((STRINGS / "en.json").read_text(encoding="utf-8"))
        others = sorted(p for p in STRINGS.glob("*.json") if p.name != "en.json")
        self.assertTrue(others)
        for path in others:
            with self.subTest(path.name):
                keys, slots = mismatches(english, json.loads(path.read_text(encoding="utf-8")))
                self.assertEqual((keys, slots), ([], []))

    def test_a_singular_form_fills_the_same_slots_as_its_key(self):
        for path in STRINGS.glob("*.json"):
            words = json.loads(path.read_text(encoding="utf-8"))
            for key in (k for k in words if k.endswith(".one")):
                with self.subTest(path.name, key=key):
                    self.assertIn("n", SLOTS.findall(words[key[:-4]]))
                    self.assertEqual(sorted(SLOTS.findall(words[key])), sorted(SLOTS.findall(words[key[:-4]])))

    def test_the_check_catches_a_missing_key_and_a_renamed_slot(self):
        self.assertEqual(mismatches({"a": "x", "b": "{n} y"}, {"b": "{m} y"}), (["a"], ["b"]))
        self.assertEqual(mismatches({"b": "{n} y", "b.one": "{n} z", "c.one": "w"}, {"b": "{n} y"}), (["c.one"], []))

    def test_the_viewer_falls_back_to_english(self):
        source = (STRINGS.parent / "js/strings.js").read_text(encoding="utf-8")
        languages = re.search(r"const LANGUAGES = \[([^\]]*)\]", source)
        self.assertEqual(sorted(re.findall(r'"(\w+)"', languages.group(1))), sorted(p.stem for p in STRINGS.glob("*.json")))
        self.assertIn(': "en";', source)


if __name__ == "__main__":
    unittest.main()
