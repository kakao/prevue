"""스킬 원본(skills-src)의 ```json 예시가 지금 CLI 가 내는 응답과 맞는가. 실행: python3 -m unittest discover -s tests/cli

예시는 사람이 줄여 쓴 것이라 생성하지 않는다. 대신 같은 상황을 가짜 저장소로 만들어 진짜 응답을 내고,
예시가 그 응답에 없는 키를 쓰거나 판정(missing · 변형 근거 · next)이 다르면 실패한다.
"""

import glob
import json
import os
import re
import time
import unittest

from test_plan import P, Case   # bin 을 경로에 넣는 것은 test_plan 이다

SKILLS = os.path.join(os.path.dirname(__file__), "..", "..", "skills-src")


def examples():
    """(파일, 줄, 예시) 전부. 인용(>) 안의 블록도 잡는다."""
    out = []
    for f in sorted(glob.glob(os.path.join(SKILLS, "*", "SKILL.md"))):
        with open(f, encoding="utf-8") as fh:
            t = fh.read()
        for m in re.finditer(r"^(>?[ \t]*)```json\n(.*?)^\1```", t, re.S | re.M):
            body = "\n".join(l[len(m.group(1)):] for l in m.group(2).splitlines())
            out.append((os.path.relpath(f, SKILLS), t[:m.start()].count("\n") + 1, json.loads(body)))
    return out


class SkillExamples(Case):
    def doctor_response(self, file_name):
        """예시의 상황 — 라이브러리 모듈을 처음 보고, 최근에 구운 변형은 있는데 덤프가 없고, 리소스는 하나뿐인 앱에서 빌린다."""
        r = self.repo(":app", ":feature:foryou:impl")
        f = r.src(":feature:foryou:impl", file_name)
        r.built(":feature:foryou:impl", "demoDebug", time.time())
        r.apk(":app", "demoDebug")
        out, rc = P.doctor(*r.plan(":feature:foryou:impl", f), False, "", f, "", False, "", False, {"HOME": self.tmp.name})
        return out, f

    def test_예시가_있다(self):
        self.assertTrue(examples(), "skills-src 에서 json 예시를 못 찾았다 — 정규식이 원본 모양을 놓쳤다")

    def test_doctor_응답_예시(self):
        for path, line, ex in examples():
            with self.subTest(at="%s:%d" % (path, line)):
                self.assertIn("missing", ex, "doctor 응답이 아닌 예시다 — 이 테스트에 그 응답을 만드는 상황을 더한다")
                out, f = self.doctor_response(os.path.basename(ex["next"].split()[2]))
                self.assertLessEqual(set(ex), set(out), "CLI 가 내지 않는 키: %s" % sorted(set(ex) - set(out)))
                for k in ("ok", "missing", "variantChosenBy", "toolchain", "daemon", "classpath", "resourcesFrom", "ask"):
                    if k in ex:
                        self.assertEqual(ex[k], out[k], k)
                # 경로는 예시가 줄여 적는다 — 명령과 인자의 모양만 견준다
                self.assertEqual(re.sub(r"\S*/", "", ex["next"]), re.sub(r"\S*/", "", out["next"]))


if __name__ == "__main__":
    unittest.main()
