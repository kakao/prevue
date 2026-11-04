// 보드 카드 위의 가리키기(FR-20) — 카드는 React 의 PreviewCard 가 그리고, 박스 · 꼬리표는 아직 point.js 가 그린다.
// 그래서 카드가 자리(그림 · 박스)를 넘기면 여기서 이벤트를 단다. 트리는 마우스가 처음 들어올 때 받는다.
import { store, cardOf } from "./store.js";
import { get } from "./api.js";
import { flatten, byPick, narrow, hitIn, scaleOf, posIn, drawBox, point, setSay, sayOn } from "./point.js";
import { trees, setCursor } from "./board.js";

export function pointCard(i, { stage, img, box, pick }, signal) {
  let list = null;
  const load = async () => {
    const c = store.st && store.st.board && cardOf(i);
    if (!c || !c.ok || !c.treeUrl) return null;
    const hit = trees.get(c.treeUrl);
    if (hit) { list = hit; return list; }
    try {
      const d = await get(c.treeUrl).then(r => r.json());
      list = narrow(flatten(d.composeViewInfo || [], [], []).sort(byPick));
      trees.set(c.treeUrl, list);
    } catch { list = null; }
    return list;
  };
  stage.addEventListener("mouseenter", () => { list = null; load(); }, { signal });
  img.addEventListener("mousemove", e => {
    if (!list) return;
    const n = hitIn(list, ...posIn(e, img));
    if (n) drawBox(box, n, scaleOf(img)); else box.hidden = true;
  }, { signal });
  img.addEventListener("mouseleave", () => { box.hidden = true; }, { signal });
  img.addEventListener("click", async e => {
    setCursor(i);
    const l = list || await load();
    if (!l) return;
    const n = hitIn(l, ...posIn(e, img));
    if (!n) return;
    const c = cardOf(i);
    drawBox(pick, n, scaleOf(img));
    const say = sayOn(pick, n);
    setSay(say);
    point(n, c.previewId, say);
  }, { signal });
}
