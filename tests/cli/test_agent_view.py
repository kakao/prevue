"""에이전트가 받는 show · wait 응답의 크기(NFR-18 카드당 1KB). 실행: python3 -m unittest discover -s tests/cli

데몬 응답의 모양은 계약(contract/wait.json)의 예시를 그대로 쓴다 — 데몬이 카드에 키를 더하면 여기서 함께 잰다.
값만 실제 저장소 규모로 바꾼다: 긴 FQN · 사내 저장소 경로의 산출물 · 파라미터 프리뷰 · 단계별 시간.
"""

import copy
import json
import os
import unittest

from test_plan import P   # bin 을 경로에 넣는 것은 test_plan 이다

CONTRACT = os.path.join(os.path.dirname(__file__), "..", "..", "plugin", "contract", "wait.json")
CARD_MAX = 1000
REPO = "/Users/someone/Desktop/Company/ShopMall/worktree-feature-route-planner"
OUT = "/Users/someone/.prevue/projects/%s/daemon/out" % P.repo_key(REPO)
FILE = REPO + "/feature/route/planner/src/main/kotlin/com/acme/shop/feature/route/planner/ui/RoutePointEditor.kt"


def board(cards):
    with open(CONTRACT, encoding="utf-8") as f:
        d = copy.deepcopy(json.load(f)["example"])
    proto, d["cards"] = d["cards"][0], []
    d["file"] = FILE
    for i in range(cards):
        name = "RoutePointEditorWithLongDestinationNamePreview%d" % i
        pid = "com.acme.shop.feature.route.planner.ui.RoutePointEditorKt.%s" % name
        c = dict(proto, index=i, previewId=pid, fqn=pid, name=name, params={"name": "다크 · 폰트 1.3배 · 경유지 셋", "uiMode": 32},
                 paramIndex=i % 3, paramCount=3, image="%s/%s-0.png" % (OUT, pid), tree="%s/%s-0.viewinfo.json" % (OUT, pid),
                 imageUrl="/%s-0.png?t=1759550000000" % pid, treeUrl="/%s-0.viewinfo.json?t=1759550000000" % pid,
                 phases={k: 12 for k in ("disposeMs", "elementMs", "buildMs", "classifyMs", "copyMs", "treeMs", "pngMs", "jsonMs")})
        d["cards"].append(c)
    return d


class AgentView(unittest.TestCase):
    def test_five_card_board_fits_per_card_budget(self):
        out = json.dumps(P.agent_view(board(5), "http://127.0.0.1:8791/"), ensure_ascii=False).encode("utf-8")
        self.assertLessEqual(len(out) / 5, CARD_MAX, "에이전트 응답이 카드당 %dB — 줄이거나 기획 NFR-18부터 고친다:\n%s"
                             % (len(out) // 5, out.decode("utf-8")))

    def test_keeps_what_skills_read(self):
        d = board(2)
        d["cards"][1].update(ok=False, failure="EXCEPTION", message="렌더 예외", image=None)
        v = P.agent_view(d, "http://127.0.0.1:8791/")
        self.assertEqual("http://127.0.0.1:8791/", v["viewer"])
        self.assertNotIn("gen", v)
        ok, bad = v["cards"]
        self.assertEqual({"index", "name", "ok", "label", "paramIndex", "paramCount", "image", "tree"}, set(ok))
        self.assertEqual("EXCEPTION", bad["failure"])
        self.assertNotIn("image", bad)

    def test_show_carries_tab_move_from_show_response(self):
        # show 의 답은 wait 모양이지만 tab 은 연 탭인지 옮긴 탭인지다(D-54) — wait 의 tab(파일)은 file 과 겹친다.
        v = P.agent_view(board(1), "http://127.0.0.1:8791/", {"tab": "opened", "closedTab": "/r/Old.kt", "board": {}})
        self.assertEqual("opened", v["tab"])
        self.assertEqual("/r/Old.kt", v["closedTab"])
        self.assertEqual(FILE, v["file"])
        self.assertTrue(board(1)["tab"].endswith(".kt"))                        # wait 만이면 파일이다

    def test_cards_come_last_so_a_cut_keeps_the_verdict(self):
        # 에이전트는 긴 응답을 head -c 로 잘라 읽는다(실측 wait 48번 중 47번) — 판정 · 이유가 카드 뒤에 오면 잘린다
        d = board(25)
        d.update(ok=True, complete=False, interactive=5, message="카드 5가 인터랙티브라 나머지는 저장 전 그림이다")
        out = json.dumps(P.agent_view(d, "http://127.0.0.1:8791/"), ensure_ascii=False)
        self.assertEqual("cards", list(json.loads(out))[-1])
        head = out[:300]
        for k in ('"ok"', '"complete": false', '"interactive": 5', '"message"'):
            self.assertIn(k, head)

    def test_autostarted_show_says_so(self):
        v = P.agent_view(board(1), "http://127.0.0.1:8791/", {"tab": "opened", "started": True, "board": {}})
        self.assertTrue(v["started"])
        self.assertEqual("cards", list(v)[-1])
        self.assertNotIn("opened", v)
        # 샌드박스라 브라우저를 못 열었으면 그 사실이 남아야 에이전트가 주소를 링크로 건넨다
        v = P.agent_view(board(1), "", {"started": True, "opened": False, "board": {}})
        self.assertIs(False, v["opened"])

    def test_passes_through_responses_without_cards(self):
        self.assertEqual({"ok": False, "failure": "COMPILE"}, P.agent_view({"ok": False, "failure": "COMPILE"}))


if __name__ == "__main__":
    unittest.main()
