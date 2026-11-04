// 가리키기(FR-20·21) — 트리 평탄화 · 히트테스트 · 박스 · 데몬에 보내기 · 후보 고르기. 보드와 한 장이 함께 쓴다.
// 가리킨 결과는 박스 꼬리표가 말한다 — 캡슐은 오류 · 알림만(D-101). 꼬리표 · 팝오버의 안은 React 의 PointOverlay · ChoicePopover 가 그린다.
import { get, post } from '../../legacy/js/api.js';
import { setCursor, trees } from '../../legacy/js/board.js';
import { flash } from '../../legacy/js/capsule.js';
import { cardOf, store } from '../../legacy/js/store.js';
import { daemonText, phrase } from '../../legacy/js/strings.js';
import type { Message } from '../state';
import { tagView, type PointNode, type TagSay } from './view';

export type TreeNode = PointNode & { children?: TreeNode[] };
export type Hit = PointNode & { area: number; chain: string[]; uchain: string[] };

/**
 * chain 은 이름 그대로 데몬에 간다(`selection`). uchain 은 꼬리표 툴팁에 보일 것 — 호출한 자리가 프로젝트 소스인 노드만.
 * 노드의 파일 · 라인은 부른 자리라, `Row`도 내 코드가 불렀으면 남고 `ReusableComposeNode` · `Layout`(Compose 안에서 불림)은 빠진다.
 */
export function flatten(list: TreeNode[], ancestors: string[], out: Hit[], uancestors: string[] = []) {
  const mine = store.projectFiles.size ? (n: TreeNode) => store.projectFiles.has(n.fileName) : () => true;
  for (const n of list) {
    const [l, t, r, b] = n.bounds, chain = ancestors.concat(n.name ? [n.name] : []);
    const uchain = n.name && mine(n) ? uancestors.concat([n.name]) : uancestors;
    if (r > l && b > t && n.lineNumber > 0) out.push({ ...n, area: (r - l) * (b - t), chain, uchain });
    flatten(n.children || [], chain, out, uchain);
  }
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
export function drawBox(el: HTMLElement, n: PointNode, s: number) {
  const [l, t, r, b] = n.bounds;
  el.hidden = false; el.style.left = l * s + 'px'; el.style.top = t * s + 'px'; el.style.width = (r - l) * s + 'px'; el.style.height = (b - t) * s + 'px';
}

type Say = (msg: string | null, ref?: string, copied?: boolean, file?: string, again?: () => void) => void;
type PointReply = { ref?: string; file?: string; needChoice?: boolean; message?: Message };

/**
 * 가리킨 노드를 데몬에 보낸다. 풀패스는 데몬이 붙이고(베이스네임이 갈리면 state.choice 로 고르게 한다),
 * 클립보드는 브라우저만 만질 수 있어 돌아온 멘션을 여기서 넣는다 — 사람이 터미널에 붙여넣는다.
 */
export async function point(n: Hit, previewId: string, say: Say) {
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
 * say(문장, 멘션, 복사됐나, 풀패스, 다시 복사) — 꼬리표가 멘션과 복사 결과를 따로 그리고, 풀패스로 "탭으로 열기"를 단다.
 * 창에 포커스가 없거나(에이전트가 터미널을 쥐고 있을 때) 제스처가 만료되면 브라우저가 쓰기를 막는다. 그때는 "다시 복사"를
 * 건네 사람이 누르는 순간(제스처) 넣는다 — 저절로 다시 넣으면 그 사이 사람이 다른 데서 복사해 둔 것을 덮는다.
 */
function copy(ref: string, say: Say, file?: string) {
  const g = ++gen;
  const copied = () => { if (g === gen) say(phrase('point.copied', { ref }), ref, true, file); };
  const again = () => { write(ref).then(copied, () => { if (g === gen) say(phrase('point.copyBlocked', { ref }), ref, false, file); }); };
  write(ref).then(copied, () => { if (g === gen) say(phrase('point.copyRetry', { ref }), ref, false, file, again); });
}

/** 후보를 고른 뒤 결과를 알릴 곳. 마지막으로 가리킨 꼬리표가 정하고, 걷히면(clearPick) 캡슐의 알림으로 돌아간다. */
const noticeSay: Say = m => { if (m) flash(m); };
let lastSay: Say = noticeSay;
export function setSay(f: Say) { lastSay = f; }

/**
 * U7 — 가리킨 파일을 탭으로. 열 수 없는 까닭(프리뷰 없음 · 다른 앱)은 데몬이 답한다.
 * 탭은 state 가 연다. 다른 앱의 파일이면 이 뷰어의 데몬은 그 앱을 그릴 수 없어 터미널이나 에이전트에 붙여 넣을 명령을 건넨다.
 */
export async function openFile(file: string) {
  const r: { ok?: boolean; command?: string; message?: Message } = await post('/viewer/open', { file }).then(r => r.json())
    .catch(e => ({ ok: false, message: phrase('open.failed', { why: (e as Error).message }) }));
  if (r.ok) return;
  const message = daemonText(r.message ?? null);
  if (r.command) { const command = r.command; write(command).then(() => flash(message), () => flash(`${message.split(' — ')[0]} — ${command}`)); }
  else flash(message);
}

/**
 * 꼬리표의 누름이 아래 그림(가리키기 · 이동 · 터치)으로 새지 않게 한다. 마우스로 누른 단추는 포커스를 쥐지 않는다(D-63) —
 * 쥐면 다음 Enter(고른 카드 열기)를 단추가 가져간다.
 */
function wireTag(tag: HTMLElement) {
  if (tag.dataset.wired) return;
  tag.dataset.wired = '1';
  for (const type of ['mousedown', 'click', 'pointerdown', 'dblclick']) tag.addEventListener(type, e => e.stopPropagation());
  tag.addEventListener('mousedown', e => { if (e.button === 0 && (e.target as Element).closest('button')) e.preventDefault(); });
}

/** 꼬리표가 박스 밖에 서는 데 드는 높이 — 꼬리표 높이 + 간격(style.css 의 --tag-h · --space-4). */
function tagRoom() {
  const css = getComputedStyle(document.documentElement);
  return parseFloat(css.getPropertyValue('--tag-h')) + parseFloat(css.getPropertyValue('--space-4'));
}

/**
 * 박스 하나에 가리킨 결과를 단다(그린 박스 위에서 부른다). 다른 박스의 꼬리표는 걷는다 — 보드에서 옛 카드에 옛 결과가 남으면 틀린 말이다.
 * 꼬리표는 박스를 자르는 틀(보드 카드 · 한 장의 틀) 안에 선다 — 위가 좁으면 아래, 둘 다 좁으면(틀을 채운 노드) 박스 안 위 끝.
 * 틀 오른쪽이 좁으면 꼬리표가 줄어 파일명이 말줄임된다. 재는 것은 화면 px 이다 — 확대해도 꼬리표는 같은 크기다.
 */
export function sayOn(box: HTMLElement, n: Hit): Say {
  for (const b of document.querySelectorAll<HTMLElement>('.box.pick')) if (b !== box) b.hidden = true;
  const tag = box.querySelector<HTMLElement>('.tag')!;
  wireTag(tag);
  box.style.animation = 'none';              // 톡 치는 확대가 걸린 채로 재지 않게 먼저 멈춘다
  const r = box.getBoundingClientRect(), clip = box.parentElement!.closest('.cstage, .wrap');
  const c = clip ? clip.getBoundingClientRect() : { top: -Infinity, bottom: Infinity, right: Infinity };
  const room = tagRoom(), up = r.top - c.top >= room, down = c.bottom - r.bottom >= room;
  box.classList.toggle('below', !up && down);
  box.classList.toggle('inside', !up && !down);
  tag.style.maxWidth = Number.isFinite(c.right) ? `min(var(--tag-max-w), ${Math.max(0, Math.floor(c.right - r.left) - 4)}px)` : '';
  void box.offsetWidth; box.style.animation = '';
  const say: Say = (msg, ref, copied, file, again) => {
    const next: TagSay = { msg, ref, copied, file, again };
    tagView.set({ tag, node: n, say: next });
  };
  say(null, `${n.fileName}:${n.lineNumber}`);
  return say;
}

/** 가리킨 결과를 걷는다 — 화면이나 카드가 바뀌면 옛 카드의 결과는 틀린 말이다. 늦게 온 결과 · 후보 고르기는 캡슐의 알림으로 간다. */
export function clearPick() {
  for (const b of document.querySelectorAll<HTMLElement>('.box.pick')) b.hidden = true;
  tagView.set({ tag: null, node: null, say: null });
  lastSay = noticeSay; gen++;
}

/* ---------- 후보 고르기 ---------- */
/** 같은 베이스네임이 여러 곳에 있다(state.choice). 고르면 데몬이 기억해 한 데몬에서 두 번 묻지 않는다. */
export async function choose(path: string) {
  const r: { ref?: string; file?: string } = await post('/viewer/choose', { path }).then(r => r.json()).catch(() => ({}));
  if (r.ref) copy(r.ref, lastSay, r.file);
}
export function cancelChoice() { post('/viewer/cancel'); }

const GAP = 8, EDGE = 16;
/** 꼬리표 바로 아래 — 아래가 모자라면 위. 꼬리표가 없으면(새로 연 페이지) 헤더 아래 가운데. 창 밖으로 나가지 않게 당긴다. */
function placeChooser(chooser: HTMLElement) {
  const root = document.documentElement, cw = root.clientWidth, ch = root.clientHeight;
  const w = chooser.offsetWidth, h = chooser.offsetHeight;
  const anchor = tagView.get().tag;
  const a = anchor && anchor.isConnected && anchor.getClientRects().length ? anchor.getBoundingClientRect() : null;
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
/** 떠 있는 동안 프레임마다 꼬리표를 따라간다 — 상태가 온 뒤 보드가 다시 배치되거나 스크롤 · 창 크기가 바뀌어도 붙어 있다. */
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
export type CardParts = { stage: HTMLElement; img: HTMLImageElement; box: HTMLElement; pick: HTMLElement };
type TreeReply = { composeViewInfo?: TreeNode[] };
/** 카드가 자리(그림 · 박스)를 넘기면 이벤트를 단다. 트리는 마우스가 처음 들어올 때 받는다. */
export function pointCard(i: number, { stage, img, box, pick }: CardParts, signal: AbortSignal) {
  let list: Hit[] | null = null;
  const load = async () => {
    const c = store.st && store.st.board && cardOf(i);
    if (!c || !c.ok || !c.treeUrl) return null;
    const hit = trees.get(c.treeUrl) as Hit[] | undefined;
    if (hit) { list = hit; return list; }
    try {
      const d: TreeReply = await get(c.treeUrl).then(r => r.json());
      list = narrow(flatten(d.composeViewInfo || [], [], []).sort(byPick));
      trees.set(c.treeUrl, list);
    } catch { list = null; }
    return list;
  };
  stage.addEventListener('mouseenter', () => { list = null; load(); }, { signal });
  img.addEventListener('mousemove', e => {
    if (!list) return;
    const n = hitIn(list, ...posIn(e, img));
    if (n) drawBox(box, n, scaleOf(img)); else box.hidden = true;
  }, { signal });
  img.addEventListener('mouseleave', () => { box.hidden = true; }, { signal });
  img.addEventListener('click', async e => {
    setCursor(i);
    const l = list || await load();
    if (!l) return;
    const n = hitIn(l, ...posIn(e, img));
    if (!n) return;
    const c = cardOf(i)!;
    drawBox(pick, n, scaleOf(img));
    const say = sayOn(pick, n);
    setSay(say);
    point(n, c.previewId, say);
  }, { signal });
}
