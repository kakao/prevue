// 보드(FR-17)의 브라우저 쪽 상태 — 키보드 커서 · 돌아온 카드 · 빠른 열기에서 고른 함수 · 카드 트리. 그리는 것은 React 의 PreviewBoard 다.
// 기존 모듈(main)과 React 의 빠른 열기가 그리로 알리므로 DOM 없는 저장소로 둔다. 카드를 찾을 때만 그려진 #cards 를 읽는다.
import { store } from "./store.js";
import { reduced } from "./motion.js";

const cardsEl = () => document.getElementById("cards");
function cardEl(i) { return cardsEl()?.querySelector(`.card[data-i="${i}"]`) || null; }
/** 지금 눈에 보이는 카드인가. */
function isShown(el) { return !!el.offsetParent; }

// 카드의 표시 — 커서와 돌아온 카드.
let marks = { cursor: null, returned: null };
const listeners = new Set();
function mark(next) {
  if (Object.keys(next).every(key => marks[key] === next[key])) return;
  marks = { ...marks, ...next };
  for (const listener of listeners) listener();
}
export const boardMarks = () => marks;
export function subscribeBoard(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// 카드별 ViewInfo 트리는 마우스가 들어온 카드만 받는다. 화면급 트리가 한 장에 8.6MB라 보드가 미리 받을 수 있는 크기가 아니다(NFR-10).
export const trees = new Map();
export function clearTrees() { trees.clear(); }

/*
 * 키보드 커서 — 다음에 열 카드. 데몬의 focus(라이브 태스크가 걸린 장)에서 시작하고, 데몬이 focus 를 옮기면 따라간다.
 * 링을 하나로 두려고 커서와 focus 를 합쳤다: 커서가 다른 데 있는 동안만 focus 가 이름 앞 점으로 남는다.
 * 커서는 뷰어 안의 것이라 데몬에 아무것도 보내지 않는다.
 */
let lastFocus = null, drawnFile = null;
/** 보드를 그릴 때마다 — 커서가 가리키던 카드가 없어졌거나 데몬이 focus 를 옮겼으면 focus 로 돌아간다. */
export function syncBoard(b) {
  drawnFile = b ? b.file : drawnFile;
  if (!b) return;
  const has = b.groups.some(g => g.cards.some(c => c.index === marks.cursor));
  if (b.focus !== lastFocus || !has) { lastFocus = b.focus; mark({ cursor: b.focus }); }
}
export function setCursor(i) { mark({ cursor: i }); }
/** 보이는 카드를 소스 순서로 d 칸 옮긴다. 끝에서는 멈춘다. */
export function moveCursor(d) {
  const root = cardsEl();
  const list = root ? [...root.querySelectorAll(".card")].filter(isShown).map(el => Number(el.dataset.i)) : [];
  if (!list.length) return;
  const at = list.indexOf(marks.cursor);
  const next = at < 0 ? list[0] : list[Math.max(0, Math.min(list.length - 1, at + d))];
  mark({ cursor: next });
  cardEl(next).scrollIntoView({ block: "nearest", behavior: reduced.matches ? "auto" : "smooth" });
}

/*
 * 빠른 열기에서 고른 함수(D-56 Q6) — 그 파일의 보드가 그려지면 그 묶음으로 가서 첫 카드에 커서를 둔다.
 * 함수 없이 파일만 골랐으면 보던 자리(탭의 스크롤)를 그대로 둔다. 다른 파일이면 탭이 열린 뒤에 적용되므로 기다렸다 건다.
 */
let pending = null, revealed = null, revealedAt = 0;
// 묶음 배율을 지금 폭으로 다시 잰다 — PreviewBoard 가 건다.
let relayout = () => {};
export function onRelayout(f) { relayout = f; }
export function reveal(file, fn) { pending = { file, fn }; }
export function cancelReveal() { pending = null; }
/** main 이 화면을 다 그린 뒤(스크롤 자리를 되살린 뒤) 부른다. */
export function applyReveal() {
  if (!pending || pending.file !== drawnFile || !store.st || store.st.screen !== "board") return;
  const { fn } = pending;
  pending = null;
  if (!fn) return;
  // 한 장뿐인 함수도 묶음이라(D-62) 함수 이름이 곧 묶음이다.
  const d = [...cardsEl().querySelectorAll(".group")].find(g => g.dataset.fn === fn);
  const first = d && d.querySelector(".card");
  if (!first) return;
  mark({ cursor: Number(first.dataset.i) });
  revealed = marks.cursor; revealedAt = performance.now();
  // 작업 공간에서 막 돌아왔으면 PreviewBoard 가 잰 폭은 작업 공간의 것이다(body.ws 를 걷기 전) — 먼저 다시 재야 잰 자리가 맞는다.
  relayout();
  // 묶음 머리가 헤더 아래 붙는다(sticky) — 머리째 보이게 그만큼 띄운다.
  pin(d);
}

/**
 * 묶음 머리를 헤더 바로 아래에 붙여 둔다 — 보드가 자리를 잡는 동안(최대 2초). 한 번 재고 스크롤하면 어긋난다:
 * 탭을 옮겨 막 지은 보드는 그림이 아직 안 와 짧아서 스크롤이 위에서 잘리고, 그림이 오며 아래로 늘어난다.
 * 그래서 보드의 크기가 바뀔 때마다 다시 건다. 사람이 스크롤하면 그 순간 놓는다.
 */
let unpin = () => {};
function pin(el) {
  unpin();
  const go = () => {
    const cs = getComputedStyle(document.body);
    const off = parseFloat(cs.getPropertyValue("--bar-h")) + 8;
    scrollTo(0, Math.max(0, el.getBoundingClientRect().top + scrollY - off));
  };
  const ro = new ResizeObserver(() => requestAnimationFrame(go));
  const stop = () => { ro.disconnect(); for (const t of ["wheel", "touchmove", "keydown"]) removeEventListener(t, stop); unpin = () => {}; };
  unpin = stop;
  go();
  ro.observe(cardsEl());
  for (const t of ["wheel", "touchmove", "keydown"]) addEventListener(t, stop, { passive: true });
  setTimeout(stop, 2000);
}

/** 들어가는 카드. */
export function cardAt(index) { const el = cardEl(index); return el && isShown(el) ? el : null; }
/** 작업 공간에서 돌아갈 카드 — 빠른 열기에서 함수를 골라 나왔으면 그 함수의 첫 카드. */
export function returnCard(index) {
  const r = performance.now() - revealedAt < 1000 ? revealed : null;
  revealed = null;
  const el = cardEl(r ?? index);
  return el && isShown(el) ? el : null;
}
/** 모프의 출발 · 도착 틀. 화면 안에 조금이라도 보일 때만 — 밖이면 날아갈 곳이 보이지 않는다. */
export function cardStage(el) {
  const s = el && el.querySelector(".cstage");
  if (!s) return null;
  const r = s.getBoundingClientRect(), cs = getComputedStyle(document.body);
  const top = parseFloat(cs.getPropertyValue("--bar-h"));
  return r.width && r.bottom > top && r.top < innerHeight && r.right > 0 && r.left < innerWidth ? s : null;
}
let returnTimer = null;
/** 돌아온 카드의 강조 — 화면 밖 카드로 돌아왔을 때. 잠깐 뒤 걷는다. */
export function ringCard(el) {
  if (!el) return;
  clearTimeout(returnTimer);
  // 클래스는 React 가 marks 로 그리지만 다음 렌더를 기다리면 모프가 끝난 뒤에 붙는다 — 여기서 바로 붙이고 강조를 처음부터 다시 튼다.
  el.classList.remove("returned");
  void el.offsetWidth;
  el.classList.add("returned");
  mark({ returned: Number(el.dataset.i) });
  returnTimer = setTimeout(() => mark({ returned: null }), 900);
}
