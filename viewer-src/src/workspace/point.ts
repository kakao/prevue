// 가리키기(FR-20·21) — 트리 평탄화 · 히트테스트 · 그림 위 표시 · 데몬에 보내기 · 후보 고르기 · 카드. 보드와 한 장이 함께 쓴다.
// 가리킨 결과는 그림 밖 옆에 뜬 카드가 말한다(D-162) — 캡슐은 오류 · 알림만. 카드 · 팝오버의 안은 React 의 PointOverlay · ChoicePopover 가 그린다.
import { fetchPreviewFiles, get, post } from '../../legacy/js/api.js';
import { applyReveal, cancelReveal, reveal, setCursor, trees } from '../../legacy/js/board.js';
import { flash } from '../../legacy/js/capsule.js';
import { cardOf, store } from '../../legacy/js/store.js';
import { daemonText, phrase } from '../../legacy/js/strings.js';
import { activeKey, type Message } from '../state';
import { boxOf, indexOf, originOf, previewsOf, treeOf, type PreviewFiles, type PreviewIndex, type TreeHit } from './card';
import { pointView, type CardModifier, type CardPreview, type CardRow, type PointCardData, type PointNode, type PointSay } from './view';

export type TreeNode = PointNode & { children?: TreeNode[]; modifiers?: CardModifier[] };
export type Hit = TreeHit & { area: number; chain: string[]; uchain: string[] };

const sameBox = (a: number[], b: number[]) => a.every((v, i) => v === b[i]);
/** 노드 자리의 modifier 체인 — 체인은 레이아웃 노드에 붙는다. 호출 노드(DrinkCard)는 같은 자리를 차지한 첫 레이아웃까지 내려가 그것을 쓴다. */
function chainAt(n: TreeNode): CardModifier[] | null {
  if (n.modifiers) return n.modifiers;
  for (const c of n.children || []) if (sameBox(c.bounds, n.bounds)) { const m = chainAt(c); if (m) return m; }
  return null;
}

/**
 * 크기 있는 노드를 트리 순서로 편다. id 는 그 순서라 같은 트리에서 다시 가리켜도 변하지 않고, ups 로 카드 트리를 다시 잇는다.
 * chain 은 이름 그대로 데몬에 간다(`selection`). uchain 은 툴팁에 보일 것 — 호출한 자리가 프로젝트 소스인 노드만.
 * 노드의 파일 · 라인은 부른 자리라, `Row`도 내 코드가 불렀으면 남고 `ReusableComposeNode` · `Layout`(Compose 안에서 불림)은 빠진다.
 */
export function flatten(roots: TreeNode[]): Hit[] {
  const mine = store.projectFiles.size ? (n: TreeNode) => store.projectFiles.has(n.fileName) : () => true;
  const out: Hit[] = [];
  const walk = (list: TreeNode[], chain: string[], uchain: string[], ups: number[]) => {
    for (const n of list) {
      const { children, modifiers: _, ...node } = n;
      const [l, t, r, b] = n.bounds, named = chain.concat(n.name ? [n.name] : []);
      const unamed = n.name && mine(n) ? uchain.concat([n.name]) : uchain;
      let below = ups;
      if (r > l && b > t && n.lineNumber > 0) {
        const id = out.length;
        out.push({ ...node, id, ups, mods: chainAt(n), area: (r - l) * (b - t), chain: named, uchain: unamed });
        below = ups.concat([id]);
      }
      walk(children || [], named, unamed, below);
    }
  };
  walk(roots, [], [], []);
  return out;
}
// 화면급 프리뷰는 클릭 대상의 85%가 Compose 내부 파일이다. 프로젝트 소스로만 좁히고, 색인을 못 받은 경우에만 전체로 폴백한다.
/**
 * 고를 차례 — 작은 것이 먼저, 넓이가 같으면 깊은 것이 먼저. 빈 자리를 누르면 화면 크기 노드가 여럿 겹치는데,
 * 같은 넓이에서 트리 순서로 고르면 테마의 `CompositionLocalProvider`(Theme.kt)가 잡혀 카드 전체가 칠해졌다. 깊은 쪽이 내 화면의 뿌리다.
 */
export const byPick = (a: Hit, b: Hit) => a.area - b.area || b.chain.length - a.chain.length;
export function narrow(list: Hit[]) { return store.projectFiles.size ? list.filter(n => store.projectFiles.has(n.fileName)) : list; }
export function hitIn(list: Hit[], x: number, y: number) { return list.find(n => { const [l, t, r, b] = n.bounds; return x >= l && x < r && y >= t && y < b; }); }
/** 표시 배율. 보드 카드는 폭을 잘라 보이므로 PNG 좌표와 화면 좌표가 다르다 — 가리키기·터치 둘 다 여기를 지난다. */
// 인터랙티브 스트림은 보이는 크기로 줄여 오므로 좌표의 기준은 원래 크기(data-full-w)다. 없으면 받은 그림의 크기.
const natW = (img: HTMLImageElement) => +(img.dataset.fullW ?? 0) || img.naturalWidth;
export function scaleOf(img: HTMLImageElement) { return natW(img) ? img.getBoundingClientRect().width / natW(img) : 1; }
export function posIn(e: MouseEvent, img: HTMLImageElement): [number, number] {
  const r = img.getBoundingClientRect(), s = scaleOf(img) || 1;
  return [Math.round((e.clientX - r.left) / s), Math.round((e.clientY - r.top) / s)];
}
function place(el: HTMLElement, n: PointNode, s: number) {
  const [l, t, r, b] = n.bounds;
  el.style.left = l * s + 'px'; el.style.top = t * s + 'px'; el.style.width = (r - l) * s + 'px'; el.style.height = (b - t) * s + 'px';
}
export function drawBox(el: HTMLElement, n: PointNode, s: number) { el.hidden = false; place(el, n, s); }

/**
 * 손 아래 노드의 옅은 바탕 — 붙였다 떼면 깜빡여서 늘 그려 두고 투명도(on)와 자리만 옮긴다. 그래서 자리를 옮길 때 미끄러진다.
 * n 이 없으면 걷는다.
 */
export function hover(el: HTMLElement, n: PointNode | null, s: number) {
  if (!n) { el.classList.remove('on'); return; }
  place(el, n, s);
  el.classList.add('on');
}
/**
 * 마우스가 그림을 떠났다 — 손 아래 바탕과 구조 테두리를 걷는다. 카드 트리 줄로 옮겨 간 것이면(peek) 그 줄의 바탕은 남긴다 —
 * React 의 onMouseEnter 는 옛 요소의 mouseout 에서 돌아, 그림의 mouseleave 보다 먼저 온다.
 */
export function leave(box: HTMLElement, marks: HTMLElement) {
  marks.classList.remove('over');
  if (!marks.classList.contains('peek')) hover(box, null, 1);
}

/**
 * 구조 테두리 — 고를 수 있는 노드마다 옅은 선 하나. 그림 위에 마우스가 있을 때만 보인다(over · peek 클래스, style.css).
 * 색인이 없으면 Compose 내부까지 수천 개라 그리지 않는다. 같은 목록 · 배율이면 다시 짓지 않는다.
 */
const drawn = new WeakMap<HTMLElement, { list: Hit[]; s: number }>();
export function outline(marks: HTMLElement, list: Hit[], s: number) {
  const last = drawn.get(marks);
  if (last && last.list === list && last.s === s) return;
  drawn.set(marks, { list, s });
  if (!store.projectFiles.size) { marks.replaceChildren(); return; }
  marks.replaceChildren(...list.map(n => { const d = document.createElement('div'); d.className = 'ol'; place(d, n, s); return d; }));
}

type Say = (msg: string | null, ref?: string, copied?: boolean, file?: string, again?: () => void) => void;
type PointReply = { ref?: string; file?: string; needChoice?: boolean; message?: Message };

/**
 * 가리킨 노드를 데몬에 보낸다. 풀패스는 데몬이 붙이고(베이스네임이 갈리면 state.choice 로 고르게 한다),
 * 클립보드는 브라우저만 만질 수 있어 돌아온 멘션을 여기서 넣는다 — 사람이 터미널에 붙여넣는다.
 */
async function point(n: Hit, previewId: string, say: Say) {
  const g = ++gen;
  try {
    const r: PointReply = await post('/viewer/point', { fileName: n.fileName, line: n.lineNumber, node: n.name || null, chain: n.chain || [], userChain: n.uchain || n.chain || [], bounds: n.bounds, previewId }).then(r => r.json());
    if (g !== gen) return;
    if (r.ref) copy(r.ref, say, r.file); else if (!r.needChoice) say(daemonText(r.message ?? null) || `${n.fileName}:${n.lineNumber}`);
  } catch (e) { if (g === gen) { const why = (e as Error).message; say(phrase('point.failed', { why })); flash(phrase('point.failed', { why })); } }
}
// 가리키기 · 복사마다 올린다 — 늦게 끝난 앞의 것이 뒤의 결과를 덮지 않게.
let gen = 0;
const write = (text: string) => (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject(new Error(phrase('point.noClipboard'))));
/**
 * say(문장, 멘션, 복사됐나, 풀패스, 다시 복사) — 카드는 멘션을 그리고 복사가 막혔을 때만 글자 버튼을 단다.
 * 창에 포커스가 없거나(에이전트가 터미널을 쥐고 있을 때) 제스처가 만료되면 브라우저가 쓰기를 막는다. 그때는 "다시 복사"를
 * 건네 사람이 누르는 순간(제스처) 넣는다 — 저절로 다시 넣으면 그 사이 사람이 다른 데서 복사해 둔 것을 덮는다.
 */
function copy(ref: string, say: Say, file?: string) {
  const g = ++gen;
  const copied = () => { if (g === gen) say(phrase('point.copied', { ref }), ref, true, file); };
  const again = () => { write(ref).then(copied, () => { if (g === gen) say(phrase('point.copyBlocked', { ref }), ref, false, file); }); };
  write(ref).then(copied, () => { if (g === gen) say(phrase('point.copyRetry', { ref }), ref, false, file, again); });
}

/** 후보를 고른 뒤 결과를 알릴 곳. 떠 있는 카드가 정하고, 걷히면(clearPick) 캡슐의 알림으로 돌아간다. */
const noticeSay: Say = m => { if (m) flash(m); };
let lastSay: Say = noticeSay;

/* ---------- Preview 색인 — 카드의 출처 칩과 Preview 점프(PR 127) ---------- */
// 빠른 열기와 같은 `/preview-files.json` 이다. 목록이 바뀌었다는 알림(previewFiles)이 오면 버리고 다음 가리키기에 다시 받는다.
let previewIndex: PreviewIndex | null = null, asked: Promise<PreviewIndex | null> | null = null, indexGen = 0;
export function forgetPreviewIndex() { previewIndex = null; asked = null; indexGen++; }
function loadPreviewIndex() {
  if (previewIndex) return Promise.resolve(previewIndex);
  const g = indexGen;
  return asked ??= fetchPreviewFiles().then((d: PreviewFiles) => {
    if (g !== indexGen) return null;
    asked = null;
    return d.ready ? (previewIndex = indexOf(d)) : null;
  }, () => { if (g === indexGen) asked = null; return null; });
}

/* ---------- 카드 — 가리킨 그림 하나의 세션 ---------- */
/**
 * 가리킨 그림 하나. list 는 그 그림에서 고를 수 있는 노드(카드 트리와 같다), hover · pick · marks 는 그림 위 표시, host 는 카드가 서는 영역이다.
 * seen 은 지금 보는 Preview — 카드의 점프 목록에서 뺀다. dpPerPx 를 모르면 크기를 px 로 보인다.
 */
export type PointSpot = {
  list: Hit[]; img: HTMLImageElement; hover: HTMLElement; pick: HTMLElement; marks: HTMLElement; host: HTMLElement;
  scale(): number; previewId: string; dpPerPx: number | null; seen: { file: string | null; fn: string | null };
};
let spot: (PointSpot & { hit: Hit; shot: () => DOMRect | null }) | null = null;
export const cardOpen = () => !!spot;
export const pointedImage = () => spot?.img ?? null;

/** 노드 하나를 가리킨다 — 그림 클릭과 카드 트리 줄이 같은 길이다. 박스 · 카드 · 데몬의 선택 · 클립보드가 함께 바뀐다. */
export function pointAt(s: PointSpot, n: Hit) {
  for (const b of document.querySelectorAll<HTMLElement>('.box.pick')) if (b !== s.pick) b.hidden = true;
  if (spot && spot.hover !== s.hover) hover(spot.hover, null, 1);
  drawBox(s.pick, n, s.scale());
  s.pick.style.animation = 'none'; void s.pick.offsetWidth; s.pick.style.animation = '';   // 누름 바탕을 처음부터 다시 튼다
  const shot = spot?.img === s.img ? spot.shot : () => (s.img.isConnected ? s.img.getBoundingClientRect() : null);
  spot = { ...s, hit: n, shot };
  const say = showCard(n);
  lastSay = say;
  point(n, s.previewId, say);
}

function showCard(n: Hit): Say {
  const s = spot!;
  const tree = store.projectFiles.size ? treeOf(s.list, n) : null;
  let said: PointSay = { msg: null, ref: `${n.fileName}:${n.lineNumber}` };
  const card = (): PointCardData => ({
    node: n, say: said, box: boxOf(n, s.dpPerPx), tree, modifiers: n.mods,
    previews: previewsOf(n.name, previewIndex, s.seen), origin: originOf(n.name, previewIndex), repo: store.st?.header?.repo ?? null,
  });
  const draw = () => { if (spot?.hit === n) pointView.set({ host: s.host, shot: s.shot, card: card() }); };
  draw();
  if (!previewIndex) loadPreviewIndex().then(i => { if (i) draw(); });
  return (msg, ref, copied, file, again) => { said = { msg, ref, copied, file, again }; draw(); };
}

/** 트리 줄을 누르면 그 노드를 그림에서 누른 것과 같다. */
export function pickRow(row: CardRow) {
  const n = spot?.list.find(h => String(h.id) === row.id);
  if (spot && n) pointAt(spot, n);
}
/** 트리 줄에 올리면 그림 위에 그 노드의 옅은 바탕과 구조 테두리를 보인다. 벗어나면(null) 걷는다. */
export function peekRow(row: CardRow | null) {
  if (!spot) return;
  const n = row ? spot.list.find(h => String(h.id) === row.id) ?? null : null;
  hover(spot.hover, n, spot.scale());
  if (n) outline(spot.marks, spot.list, spot.scale());
  spot.marks.classList.toggle('peek', !!n);
}

/**
 * Preview 로 건너간다 — 그 파일의 보드에서 그 함수 묶음으로 스크롤하고 첫 카드에 커서를 둔다(빠른 열기의 함수 고르기와 같다).
 * 지금 탭이면 데몬에 묻지 않는다 — `/viewer/open` 의 `{ok:true}`는 지금 탭이었는지 말하지 않아, 새 보드를 기다리면 오지 않는다. 한 장이면 나가며 간다.
 */
export async function jump(p: CardPreview) {
  clearPick();
  const st = store.st;
  reveal(p.file, p.fn);
  if (p.file === activeKey(st)) {
    if (st?.screen === 'focus' && st.focus) post('/viewer/exit');
    else applyReveal();
    return;
  }
  const r: { ok?: boolean; message?: Message } = await post('/viewer/open', { file: p.file, fn: p.fn }).then(r => r.json())
    .catch(e => ({ ok: false, message: phrase('open.failed', { why: (e as Error).message }) }));
  if (r.ok) return;
  cancelReveal();
  flash(daemonText(r.message ?? null) || phrase('open.cannot'));
}

/** 가리킨 결과를 걷는다 — 화면 · 카드 · 트리가 바뀌거나 Esc · 닫기 · 빈 곳. 데몬의 선택과 클립보드는 남는다. 늦게 온 결과 · 후보 고르기는 캡슐의 알림으로 간다. */
export function clearPick() {
  for (const b of document.querySelectorAll<HTMLElement>('.box.pick')) b.hidden = true;
  if (spot) { hover(spot.hover, null, 1); spot.marks.classList.remove('peek'); }
  spot = null;
  pointView.set({ host: null, shot: null, card: null });
  lastSay = noticeSay; gen++;
}
/** Esc 층 — 카드가 떠 있으면 걷고 true. */
export function closeCard() { if (!spot) return false; clearPick(); return true; }

/**
 * 빈 곳을 누르면 걷는다 — 본문(main) 안에서 카드 · 그림 밖. 그림 위는 가리키기(보드)거나 조작(한 장)이라 건드리지 않는다 —
 * 한 장의 빈 곳은 ⌥+클릭이 노드에 닿지 않을 때다(focus.ts).
 */
export function watchBlankClicks() {
  addEventListener('pointerdown', e => {
    if (!spot || e.button !== 0) return;
    const t = e.target as Element | null;
    if (!t?.closest || !t.closest('main') || t.closest('.point-card, .cstage, #stage')) return;
    clearPick();
  }, true);
}

/* ---------- 후보 고르기 ---------- */
/** 같은 베이스네임이 여러 곳에 있다(state.choice). 고르면 데몬이 기억해 한 데몬에서 두 번 묻지 않는다. */
export async function choose(path: string) {
  const r: { ref?: string; file?: string } = await post('/viewer/choose', { path }).then(r => r.json()).catch(() => ({}));
  if (r.ref) copy(r.ref, lastSay, r.file);
}
export function cancelChoice() { post('/viewer/cancel'); }

const GAP = 8, EDGE = 16;
/** 카드 머리 바로 아래 — 아래가 모자라면 위. 카드가 없으면(새로 연 페이지) 헤더 아래 가운데. 창 밖으로 나가지 않게 당긴다. */
function placeChooser(chooser: HTMLElement) {
  const root = document.documentElement, cw = root.clientWidth, ch = root.clientHeight;
  const w = chooser.offsetWidth, h = chooser.offsetHeight;
  const anchor = document.querySelector<HTMLElement>('.point-card .pc-head');
  const a = anchor && anchor.getClientRects().length ? anchor.getBoundingClientRect() : null;
  let left: number, top: number, up = false;
  if (a) {
    left = a.left; top = a.bottom + GAP;
    if (top + h > ch - EDGE && a.top - GAP - h >= EDGE) { top = a.top - GAP - h; up = true; }
  } else {
    left = (cw - w) / 2; top = document.getElementById('bar')!.getBoundingClientRect().bottom + EDGE;
  }
  left = Math.max(EDGE, Math.min(left, cw - w - EDGE));
  top = Math.max(EDGE, Math.min(top, ch - h - EDGE));
  const l = Math.round(left) + 'px', t = Math.round(top) + 'px';
  if (chooser.style.left !== l) chooser.style.left = l;
  if (chooser.style.top !== t) chooser.style.top = t;
  chooser.classList.toggle('up', up);
}
/** 떠 있는 동안 프레임마다 카드 머리를 따라간다 — 상태가 온 뒤 보드가 다시 배치되거나 스크롤 · 창 크기가 바뀌어도 붙어 있다. */
let following = false;
export function followChooser(chooser: HTMLElement) {
  placeChooser(chooser);
  if (following) return;
  following = true;
  const follow = () => {
    if (!chooser.classList.contains('on')) { following = false; return; }
    placeChooser(chooser);
    requestAnimationFrame(follow);
  };
  requestAnimationFrame(follow);
}

/* ---------- 보드 카드 위의 가리키기 ---------- */
export type CardParts = { stage: HTMLElement; img: HTMLImageElement; box: HTMLElement; pick: HTMLElement; marks: HTMLElement };
type TreeReply = { composeViewInfo?: TreeNode[] };
/**
 * 카드가 자리(그림 · 표시)를 넘기면 이벤트를 단다. 트리는 마우스가 처음 들어올 때 받는다.
 * 그림이 새로 오면(저장 · 다시 그리기) 트리도 새것이라 그 그림의 카드를 걷는다 — 같은 노드를 추정해 다시 찾지 않는다.
 */
export function pointCard(i: number, { stage, img, box, pick, marks }: CardParts, signal: AbortSignal) {
  let list: Hit[] | null = null, over = false;
  const load = async () => {
    const c = store.st && store.st.board && cardOf(i);
    if (!c || !c.ok || !c.treeUrl) return null;
    const hit = trees.get(c.treeUrl) as Hit[] | undefined;
    if (hit) { list = hit; return list; }
    try {
      const d: TreeReply = await get(c.treeUrl).then(r => r.json());
      list = narrow(flatten(d.composeViewInfo || []).sort(byPick));
      trees.set(c.treeUrl, list);
    } catch { list = null; }
    return list;
  };
  stage.addEventListener('mouseenter', () => {
    list = null; over = true; marks.classList.add('over');
    load().then(l => { if (l && over) outline(marks, l, scaleOf(img)); });
  }, { signal });
  stage.addEventListener('mouseleave', () => { over = false; leave(box, marks); }, { signal });
  img.addEventListener('mousemove', e => { if (list) hover(box, hitIn(list, ...posIn(e, img)) ?? null, scaleOf(img)); }, { signal });
  img.addEventListener('load', () => { if (spot?.img === img) clearPick(); }, { signal });
  signal.addEventListener('abort', () => { if (spot?.img === img) clearPick(); });
  img.addEventListener('click', async e => {
    setCursor(i);
    const l = list || await load();
    if (!l) return;
    const n = hitIn(l, ...posIn(e, img));
    if (!n) return;
    const c = cardOf(i)!, full = natW(img);
    pointAt({
      list: l, img, hover: box, pick, marks, host: document.getElementById('boardView')!, scale: () => scaleOf(img), previewId: c.previewId,
      dpPerPx: c.widthDp && full ? c.widthDp / full : null, seen: { file: store.st?.board?.file ?? null, fn: stage.closest<HTMLElement>('.card')?.dataset.fn ?? null },
    }, n);
  }, { signal });
}
