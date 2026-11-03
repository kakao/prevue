// 보드(FR-17) — 파일 하나의 프리뷰를 함수별로 묶은 카드. 카드는 정적 이미지이고 인터랙티브는 한 장에만 걸린다.
import { $, store, cardOf } from "./store.js";
import { phrase, daemonText } from "./strings.js";
import { get } from "./api.js";
import { flatten, byPick, narrow, hitIn, scaleOf, posIn, drawBox, point, setSay, sayOn } from "./point.js";
import { enterFocus } from "./focus.js";
import { swapImage, reduced } from "./motion.js";

const cardsEl = $("cards");
// 재생 — "크게 보기"(⤢)가 아니라 "살아 움직이게 한다"(Xcode 캔버스의 Live). 손가락은 "여기를 누르라"로 읽혀 버튼 자체를 가리켰다.
const GO = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 3.6v8.8a.8.8 0 0 0 1.2.68l7-4.4a.8.8 0 0 0 0-1.36l-7-4.4a.8.8 0 0 0-1.2.68z"/></svg>`;
// 카드별 ViewInfo 트리는 마우스가 들어온 카드만 받는다. 화면급 트리가 한 장에 8.6MB라 보드가 미리 받을 수 있는 크기가 아니다(NFR-10).
const trees = new Map();
export function clearTrees() { trees.clear(); }

function cardEl(i) { return cardsEl.querySelector(`.card[data-i="${i}"]`); }

/*
 * 키보드 커서 — 다음에 열 카드. 데몬의 focus(라이브 태스크가 걸린 장)에서 시작하고, 데몬이 focus 를 옮기면 따라간다.
 * 링을 하나로 두려고 커서와 focus 를 합쳤다: 커서가 다른 데 있는 동안만 focus 가 이름 앞 점으로 남는다.
 * 커서는 뷰어 안의 것이라 데몬에 아무것도 보내지 않는다.
 */
let cursor = null, lastFocus = null;
function markCursor() {
  for (const el of cardsEl.querySelectorAll(".card")) el.classList.toggle("cursor", Number(el.dataset.i) === cursor);
}
function syncCursor(b) {
  if (b.focus !== lastFocus || !cardEl(cursor)) { lastFocus = b.focus; cursor = b.focus; }
  markCursor();
}
/** 보이는 카드를 소스 순서로 d 칸 옮긴다. 끝에서는 멈춘다. */
export function moveCursor(d) {
  const list = [...cardsEl.querySelectorAll(".card")].filter(isShown).map(el => Number(el.dataset.i));
  if (!list.length) return;
  const at = list.indexOf(cursor);
  cursor = at < 0 ? list[0] : list[Math.max(0, Math.min(list.length - 1, at + d))];
  markCursor();
  cardEl(cursor).scrollIntoView({ block: "nearest", behavior: reduced.matches ? "auto" : "smooth" });
}
export function openCursor() { if (cursor != null) enterFocus(cursor); }
/** 지금 눈에 보이는 카드인가. */
function isShown(el) { return !!el.offsetParent; }

/**
 * 카드 DOM은 카드 구성이 바뀌었을 때만 새로 짓는다 — 다시 지으면 스크롤 위치와 받아 둔 트리가 날아간다.
 * 함수 하나가 묶음 하나다(D-62) — 한 장뿐인 함수도 머리를 가져, 배율 · 장 수가 늘 같은 자리에 온다.
 */
function buildCards(b) {
  const key = b ? b.file + "|" + b.groups.map(g => g.cards.map(c => c.previewId).join(",")).join("|") : "";
  if (cardsEl.dataset.key === key) return;
  cardsEl.dataset.key = key; cardsEl.innerHTML = ""; trees.clear();
  if (!b) return;
  for (const g of b.groups) {
    const d = document.createElement("section");
    d.className = "group"; d.dataset.fn = g.name;
    d.innerHTML = `<div class="ghead"><span class="gn"></span><span class="m"><span class="n"></span><span class="sc" hidden></span><span class="bad"></span></span></div><div class="gbody"><div class="board"></div></div>`;
    const gn = d.querySelector(".gn");
    gn.textContent = g.name; gn.title = g.name;
    cardsEl.appendChild(d);
    const row = d.querySelector(".board");
    for (const c of g.cards) {
      const el = document.createElement("article");
      el.className = "card"; el.dataset.i = c.index; el.dataset.fn = g.name;
      el.innerHTML = `<div class="cstage"><img alt="" hidden><div class="box" hidden></div><div class="box pick" hidden><span class="tag"></span></div><div class="ph">${phrase("card.waiting")}</div></div>
        <div class="label"><span class="fn"></span><button class="go" type="button" title="${phrase("card.go.tip")}">${GO}<span class="go-t">${phrase("card.go")}</span></button>
          <div class="sub"><span class="specs"></span><span class="meta"></span></div></div>`;
      el.querySelector(".go").addEventListener("click", () => { cursor = c.index; markCursor(); enterFocus(c.index); });
      wireCard(el, c.index);
      row.appendChild(el);
    }
  }
}

/*
 * 묶음마다 배율 하나(D-62). 상한은 300/360 — 360dp 카드가 300px, 48dp 버튼이 40px 다. 그 배율로 한 줄에 안 들어가는 묶음만
 * 한 줄에 맞게 줄이되 0.25 아래로는 내리지 않고, 거기서도 넘치면 줄을 바꾼다. 한 함수의 변형 · 기기 세트는 같은 축척으로
 * 나란히 놓여야 비교가 된다 — 카드마다 칸에 맞추면 폰은 0.73배 · 버튼은 2.6배로 한 보드 안에서 축척이 16배 넘게 갈렸다(리뷰 5).
 * 묶음끼리는 배율이 다를 수 있어 줄인 묶음만 머리에 적는다. 창 폭으로 여기서 정한다 — 데몬 상태 · CLI 에는 없다(D-22).
 */
const CAP = 300 / 360, FLOOR = .25;
// 칸의 최소 폭 — 이름표(name= · 인터랙티브 버튼)가 놓일 자리. 100 을 넘기면 ForYouScreen 기기 다섯 장이 1440 창에서
// 한 줄을 넘는다(0.25 × 411dp = 103px).
const COL_MIN = 100;
// 묶음의 최소 폭 — 머리(이름 · 배율 · 장 수)가 읽히는 폭. 이름은 말줄임이고 전체는 툴팁에 있다.
const GROUP_MIN = 160;
// 크기를 모르는 카드(그리기 전의 내용 크기 프리뷰)는 폰 한 장 자리다. 그림이 오면 데몬이 실은 크기로 다시 잰다.
const PH_W = 360, PH_H = 640, PH_MIN_H = 120;
const SCALE_TIP = phrase("zoom.tip.real");

/** 한 줄에 들어가는 가장 큰 배율. 줄 폭은 배율에 대해 단조 증가라 이분 탐색으로 찾는다. */
function fitScale(ws, W, gap) {
  const row = s => ws.reduce((a, w) => a + Math.max(w * s, COL_MIN), 0) + gap * (ws.length - 1);
  if (row(CAP) <= W) return { s: CAP, w: row(CAP), wrap: false };
  // 하한에서도 넘치면 줄을 바꾼다. 칸 최소 폭에 걸린 작은 장은 더 줄여도 칸이 그대로라 하한까지 줄일 까닭이 없다 —
  // 줄 폭이 하한일 때와 같은 데까지만 줄인다(좁은 창에서 48dp 버튼 다섯이 12px 이 되지 않게).
  if (row(FLOOR) > W) return { s: Math.min(CAP, ...ws.map(w => w * FLOOR >= COL_MIN ? FLOOR : COL_MIN / w)), w: W, wrap: true };
  let lo = FLOOR, hi = CAP;
  for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (row(m) <= W) lo = m; else hi = m; }
  return { s: lo, w: row(lo), wrap: false };
}

// 이 뷰어가 본 카드의 dp 크기 — 파일 · previewId 마다(previewId 는 함수 이름이라 파일끼리 겹친다).
const seenDp = new Map();
/**
 * 배율 셈에 넣을 카드의 dp 크기 — 데몬이 실은 크기, 없으면 그 장이 마지막으로 보인 크기, 실패한 장이면 같은 묶음에서 크기를 아는 장,
 * 그래도 없으면 폰 한 장. 실패한 렌더는 그림이 없어 크기를 잃는다 — 폰 한 장(360dp)으로 셈에 넣으면 묶음 배율이 떨어져
 * 멀쩡히 그린 형제가 함께 준다(48dp 버튼 40 → 15px). 한 함수의 변형(테마 · 글자 배율 · 로케일)은 대개 크기가 같아 형제의 것을 빌린다.
 * 형제를 빌리는 것은 실패한 장뿐이다 — 그리기 전의 장은 곧 그림이 와 다시 재므로 본 적이 없으면 폰 한 장 자리다(D-62).
 */
function dimsOf(file, g) {
  const own = g.cards.map(c => {
    const k = file + "|" + c.previewId, seen = seenDp.get(k);
    if (c.widthDp && c.heightDp) seenDp.set(k, [c.widthDp, c.heightDp]);
    return [c.widthDp || (seen && seen[0]), c.heightDp || (seen && seen[1])];
  });
  const sib = own.filter(([w, h]) => w && h).sort((a, b) => b[0] - a[0])[0];
  return own.map(([w, h], i) => {
    const lend = g.cards[i].failure && sib;
    return [w || (lend ? sib[0] : PH_W), h || (lend ? sib[1] : PH_H)];
  });
}

/** 묶음의 배율을 재고 카드 · 그림 · 자리표시의 폭을 정한다. 상태가 올 때마다 · 창 폭이 바뀔 때마다 — 싸다(25장에 수십 µs). */
let laidW = 0;
function layoutGroups(b = restingBoard || store.st?.board) {
  const W = cardsEl.clientWidth;
  if (!b || !W) return;                      // 보드가 숨어 있으면 폭이 0 — 다시 보일 때 잰다
  laidW = W;
  const els = cardsEl.querySelectorAll(":scope > .group");
  const inner = els[0] && els[0].querySelector(".board");
  const gap = (inner && parseFloat(getComputedStyle(inner).columnGap)) || 24;
  b.groups.forEach((g, gi) => {
    const d = els[gi];
    if (!d) return;
    const dims = dimsOf(b.file, g);
    const { s, w, wrap } = fitScale(dims.map(x => x[0]), W, gap);
    d.style.width = wrap ? "100%" : Math.max(GROUP_MIN, w) + "px";
    d.querySelector(".board").classList.toggle("spill", wrap);
    // 줄였을 때만 적는다 — 상한 그대로면 숫자가 읽을 것을 늘리지 않는다. 밀도를 모르는 기기가 섞이면 짐작이라 ≈.
    const sc = d.querySelector(".sc"), cut = s < CAP - 1e-6, guess = g.cards.some(c => c.dpGuess);
    sc.hidden = !cut;
    sc.textContent = cut ? (guess ? "≈" : "") + Math.round(s * 100) + "%" : "";
    sc.title = SCALE_TIP + (guess ? " · " + phrase("board.scale.guess") : "");
    g.cards.forEach((c, i) => {
      const el = cardEl(c.index);
      if (!el) return;
      const [dw, dh] = dims[i], col = Math.max(dw * s, COL_MIN);
      el.style.width = col + "px";
      // 폭만 준다 — 높이는 그림의 비로 따라와야 가리키기의 배율(scaleOf)이 가로세로 하나다. 비는 그림이 오기 전의 자리용.
      const img = el.querySelector(".cstage img");
      img.style.width = dw * s + "px"; img.style.aspectRatio = `auto ${dw} / ${dh}`;
      const ph = el.querySelector(".ph"), h = Math.max(PH_MIN_H, dh * s);
      ph.style.width = col + "px"; ph.style.height = h + "px";
      // 실패 문장은 판에 드는 줄까지만 — 머리 "렌더 실패" 한 줄과 안쪽 여백을 뺀 높이를 줄 높이로 나눈다. 전체는 툴팁에 있다.
      ph.style.setProperty("--lines", Math.max(1, Math.floor((h - 55) / 16.7)));
    });
  });
}
// 폭이 바뀔 때만 다시 잰다 — 그림이 와서 높이만 바뀔 때마다 돌 이유가 없다.
new ResizeObserver(() => { const W = cardsEl.clientWidth; if (W && W !== laidW) layoutGroups(); }).observe(cardsEl);

/** 묶음 머리에 장 수와 실패 수를 적는다. */
function countGroups(b) {
  const els = cardsEl.querySelectorAll(":scope > .group");
  b.groups.forEach((g, gi) => {
    const d = els[gi];
    if (!d) return;
    d.querySelector(".n").textContent = phrase("board.count", { n: g.cards.length });
    d.querySelector(".ghead .bad").textContent = g.failed ? `· ${phrase("board.failed", { n: g.failed })}` : "";
  });
}

/** 카드 위의 가리키기. 트리는 마우스가 처음 들어올 때 받는다. */
function wireCard(el, i) {
  const img = el.querySelector("img"), bx = el.querySelector(".box"), pbx = el.querySelector(".box.pick");
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
  el.querySelector(".cstage").addEventListener("mouseenter", () => { list = null; load(); });
  img.addEventListener("mousemove", e => {
    if (!list) return;
    const n = hitIn(list, ...posIn(e, img));
    if (n) drawBox(bx, n, scaleOf(img)); else bx.hidden = true;
  });
  img.addEventListener("mouseleave", () => { bx.hidden = true; });
  img.addEventListener("click", async e => {
    cursor = i; markCursor();
    const l = list || await load();
    if (!l) return;
    const n = hitIn(l, ...posIn(e, img));
    if (!n) return;
    const c = cardOf(i);
    drawBox(pbx, n, scaleOf(img));
    const say = sayOn(pbx, n);
    setSay(say);
    point(n, c.previewId, say);
  });
}

/* 이름표 아래 칸의 아이콘 — SF Symbols 처럼 가는 선 하나. 뜻은 데몬이 kind 로 정하고 여기서는 모양만 고른다. */
const svg = d => `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const GLYPH = {
  portrait: svg('<rect x="3.25" y="1.25" width="5.5" height="9.5" rx="1.2"/><path d="M5.25 9h1.5"/>'),
  landscape: svg('<rect x="1.25" y="3" width="9.5" height="6" rx="1.2"/>'),
  device: svg('<rect x="3.25" y="1.25" width="5.5" height="9.5" rx="1.2"/><path d="M5.25 9h1.5"/>'),
  dark: svg('<path d="M9.9 7.6A4.25 4.25 0 0 1 4.4 2.1a4.25 4.25 0 1 0 5.5 5.5Z"/>'),
  font: `<span class="aa">Aa</span>`,
  locale: svg('<circle cx="6" cy="6" r="4.75"/><path d="M1.25 6h9.5M6 1.25c1.4 1.4 2 3 2 4.75s-.6 3.35-2 4.75M6 1.25C4.6 2.65 4 4.25 4 6s.6 3.35 2 4.75"/>'),
  api: svg('<path d="M3.5 2.5 1.25 6 3.5 9.5M8.5 2.5 10.75 6 8.5 9.5"/>'),
  systemUi: svg('<rect x="3.25" y="1.25" width="5.5" height="9.5" rx="1.2"/><path d="M3.5 3.25h5"/>'),
};
/** 인자 칸. 원래 인자(소스 표기)는 툴팁에만 둔다. 칸이 바뀌었을 때만 다시 짓는다. */
function renderSpecs(box, c) {
  box.title = c.args;
  const key = JSON.stringify(c.specs);
  if (box.dataset.key === key) return;
  box.dataset.key = key;
  box.replaceChildren(...c.specs.map(sp => {
    const e = document.createElement("span"); e.className = "spec";
    const text = daemonText(sp.text);
    const [w, h] = sp.kind === "size" ? text.split("×").map(Number) : [];
    const g = sp.kind === "size" ? (w > h ? "landscape" : "portrait") : sp.kind;
    e.innerHTML = GLYPH[g] || "";
    const t = document.createElement("span"); t.textContent = text;
    if (sp.kind === "size") { const u = document.createElement("span"); u.className = "unit"; u.textContent = "dp"; t.append(u); }
    e.append(t);
    return e;
  }));
}

function paint(c) {
  const el = cardEl(c.index);
  if (!el) return;
  el.classList.toggle("focus", c.isFocus);
  el.classList.toggle("stale", c.stale);
  // 이름(name=)이 없으면 크기 칸이 첫 줄에 선다 — 함수 이름은 묶음 머리가 갖는다(D-62).
  el.classList.toggle("noname", !c.label);
  el.querySelector(".fn").textContent = c.label;
  // 좁은 칸에서 이름이 말줄임되므로 툴팁 첫 줄에 이름 전체를 둔다.
  el.querySelector(".fn").title = c.label ? c.label + "\n" + c.title : c.title;
  renderSpecs(el.querySelector(".specs"), c);
  const img = el.querySelector("img"), ph = el.querySelector(".ph"), meta = el.querySelector(".meta"), bx = el.querySelector(".box"), pbx = el.querySelector(".box.pick");
  if (c.ok && c.imageUrl) {
    if (img.dataset.url !== c.imageUrl) { swapImage(img, c.imageUrl); bx.hidden = true; pbx.hidden = true; }
    img.hidden = false; ph.hidden = true;
    meta.textContent = daemonText(c.meta);
  } else if (c.failure) {
    // 판에 드는 줄까지만 보인다(layoutGroups 의 --lines) — 실패 문장은 400자까지라 작은 판을 넘친다.
    img.hidden = true; ph.hidden = false; ph.className = "ph bad"; meta.textContent = "";
    const failure = daemonText(c.failure);
    if (ph.title !== failure || !ph.firstElementChild) {
      const why = document.createElement("span"); why.className = "why"; why.textContent = failure;
      ph.replaceChildren(why); ph.title = failure;
    }
  } else {
    img.hidden = true; ph.hidden = false; ph.className = "ph"; ph.title = ""; ph.textContent = phrase("card.waiting"); meta.textContent = "";
  }
}

let boardFile = null, restingBoard = null, liveImage = null;
export function renderBoard(s) {
  if (s.screen === "focus" && s.board) {
    liveImage = s.board.groups.flatMap(g => g.cards).find(c => c.index === s.board.focus)?.imageUrl;
    return;
  }
  // 복귀 직후의 상태에는 아직 조작한 그림이 남아 있다. 원래 그림이 오기까지 보던 보드의 배치를 보존한다.
  let b = s.board;
  const current = b?.groups.flatMap(g => g.cards).find(c => c.index === b.focus);
  if (restingBoard?.file === b?.file && liveImage && current?.imageUrl === liveImage) b = { ...restingBoard, focus: b.focus };
  else { restingBoard = b; liveImage = null; }
  if (s.board) boardFile = s.board.file;
  if (b) { buildCards(b); for (const g of b.groups) for (const c of g.cards) paint(c); countGroups(b); layoutGroups(b); syncCursor(b); }
  else buildCards(null);
}

/*
 * 빠른 열기에서 고른 함수(D-56 Q6) — 그 파일의 보드가 그려지면 그 묶음으로 가서 첫 카드에 커서를 둔다.
 * 함수 없이 파일만 골랐으면 보던 자리(탭의 스크롤)를 그대로 둔다. 다른 파일이면 탭이 열린 뒤에 적용되므로 기다렸다 건다.
 */
let pending = null, revealed = null, revealedAt = 0;
export function reveal(file, fn) { pending = { file, fn }; }
export function cancelReveal() { pending = null; }
/** main 이 화면을 다 그린 뒤(스크롤 자리를 되살린 뒤) 부른다. */
export function applyReveal() {
  if (!pending || pending.file !== boardFile || !store.st || store.st.screen !== "board") return;
  const { fn } = pending;
  pending = null;
  if (!fn) return;
  // 한 장뿐인 함수도 묶음이라(D-62) 함수 이름이 곧 묶음이다.
  const d = [...cardsEl.querySelectorAll(".group")].find(g => g.dataset.fn === fn);
  const first = d && d.querySelector(".card");
  if (!first) return;
  cursor = Number(first.dataset.i); markCursor();
  revealed = cursor; revealedAt = performance.now();
  // 보드가 막 다시 보였으면 묶음 배율 · 줄이 아직 옛 폭의 것이다(ResizeObserver 가 나중에 고친다) — 먼저 다시 재야 잰 자리가 맞는다.
  layoutGroups();
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
  ro.observe(cardsEl);
  for (const t of ["wheel", "touchmove", "keydown"]) addEventListener(t, stop, { passive: true });
  setTimeout(stop, 2000);
}
let returnTimer = null, returnedCard = null;
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
export function ringCard(el) {
  if (!el) return;
  clearTimeout(returnTimer);
  returnedCard?.classList.remove("returned");
  returnedCard = el;
  el.classList.remove("returned");
  void el.offsetWidth;
  el.classList.add("returned");
  returnTimer = setTimeout(() => { el.classList.remove("returned"); returnedCard = null; }, 900);
}
