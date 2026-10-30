// 뷰어 탭(D-54) — 왼쪽 레일의 열린 파일 줄(D-98). 파일 보드가 있으면 하나여도 이 줄이 파일명을 말한다(H4). 열기 · 옮기기 · 닫기는 데몬이 정하고 여기는 그리고 의도만 보낸다.
// 지금 파일은 글자가 아니라 그 아래 떠 있는 바탕(glider)이 가리키고, 옮기면 바탕이 미끄러진다.
import { $ } from "./store.js";
import { post } from "./api.js";
import { phrase } from "./strings.js";
import { reduced, motionToken, motionMs } from "./motion.js";
import { robot, kmp, kindOf } from "./platform.js";

const rail = $("rail"), list = $("railList"), glider = $("railGlider"), empty = $("railEmpty");
let tabs = [], activeKey = null;

const X = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="m5 5 6 6M11 5l-6 6"/></svg>';
const FILE = '<svg class="rt-ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true"><path d="M4 2h5.5L12 4.5V14H4z"/></svg>';
// 파일 아이콘 자리 — Android 전용 모듈은 문서, KMP 모듈은 소스 세트에 따라 로봇 · KMP(platform.js).
const ICON = { file: FILE, android: robot("rt-ic"), kmp: kmp("rt-ic") };

function make(t) {
  const el = document.createElement("div");
  el.className = "rt"; el.dataset.key = t.key; el.setAttribute("role", "tab");
  const x = document.createElement("button");
  x.type = "button"; x.className = "rt-x"; x.tabIndex = -1; x.setAttribute("aria-label", phrase("tabs.close")); x.innerHTML = X;
  const name = document.createElement("span"); name.className = "rt-name";
  const mod = document.createElement("span"); mod.className = "rt-mod";
  el.innerHTML = FILE;
  el.dataset.ic = "file";
  el.append(name, mod, x);
  x.addEventListener("click", e => { e.stopPropagation(); close(el.dataset.key); });
  el.addEventListener("click", () => { if (el.dataset.key !== activeKey) post("/viewer/tab", { key: el.dataset.key }); });
  // 가운데 단추로 닫기 — 브라우저 탭과 같은 손버릇
  el.addEventListener("auxclick", e => { if (e.button === 1) { e.preventDefault(); close(el.dataset.key); } });
  return el;
}

/** 꼬리 — 뒤쪽 낱말(CamelCase) 몇 개. 형제 파일은 앞이 같고 뒤가 달라서, 뒤를 자르면 셋이 똑같이 `DrinkDetailSc…`가 됐다. */
function tailOf(name) {
  const words = name.match(/[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])|./g) || [name];
  let tail = "";
  for (let i = words.length - 1; i > 0; i--) {
    if (tail && (words[i] + tail).length > 12) break;
    tail = words[i] + tail;
  }
  return tail.length >= name.length - 2 ? "" : tail;
}

const ctx = document.createElement("canvas").getContext("2d");
const measure = (s, font) => { ctx.font = font; return ctx.measureText(s).width; };
const fontOf = el => { const cs = getComputedStyle(el); return `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; };

/** room 안에 드는 이름 — 넘치면 머리를 줄이고 꼬리는 남긴다(`Drink…OptionsHeader`). CSS 줄임은 끝만 자르고 글자 사이에 빈칸을 남긴다. */
function fit(name, room, font) {
  if (measure(name, font) <= room) return name;
  // 좁으면 꼬리를 낱말 단위로 줄인다(`Dri…DetailScreen` → `Drink…Screen`) — 글자 단위로 깎으면 `P…ilScreen`가 된다.
  const full = tailOf(name);
  const words = full.match(/[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])|./g) || [];
  const tails = words.map((_, i) => words.slice(i).join(""));
  for (const [tail, least] of [...tails.map(t => [t, 3]), [tails[tails.length - 1] || "", 1]]) {
    for (let k = name.length - tail.length - 1; k >= least; k--) {
      const s = name.slice(0, k) + "…" + tail;
      if (measure(s, font) <= room) return s;
    }
  }
  const tail = full;
  for (let j = 1; j < tail.length; j++) {
    const s = name[0] + "…" + tail.slice(j);
    if (measure(s, font) <= room) return s;
  }
  return name[0] + "…";
}

// 레일의 줄임 — 폭은 레일이 정하고(200px) 줄마다 같다. 이름이 먼저다: 모듈 · 함수 표시는 이름이 남긴 칸을 갖되 MOD_MIN 까지는 지키고
// 끝을 자른다. 이름은 남은 칸에서 꼬리를 남기고 가운데를 줄인다. 탭 줄의 폭 나누기(88~240 · 긴 탭부터 깎기 · 120 아래 가로 스크롤)는
// 세로 목록에서 뜻이 없다. 상태가 올 때마다 불리므로 이름 · 표시 · 칸이 그대로인 줄은 건너뛴다.
const MOD_MIN = 56;
function layout(force = false) {
  const els = [...list.querySelectorAll(".rt:not(.leaving)")];
  if (!els.length || rail.hidden) return;
  const nf = fontOf(els[0].querySelector(".rt-name")), mf = fontOf(els[0].querySelector(".rt-mod"));
  const gap = parseFloat(getComputedStyle(els[0]).columnGap) || 0;
  const dirty = els.filter(el => force || el.dataset.fitted !== el.dataset.name + "|" + el.querySelector(".rt-mod").textContent + "|" + rail.clientWidth);
  if (!dirty.length) return;
  // 모듈 칸을 0 으로 접고 재면 이름 칸 + 간격이 둘이 나눌 폭이다 — 읽기를 한 번에 몰아 줄마다 레이아웃을 다시 하지 않는다.
  for (const el of dirty) el.querySelector(".rt-mod").style.maxWidth = "0px";
  const totals = dirty.map(el => { const mod = el.querySelector(".rt-mod"); return el.querySelector(".rt-name").clientWidth + (mod.textContent ? gap : 0); });
  dirty.forEach((el, i) => {
    const name = el.querySelector(".rt-name"), mod = el.querySelector(".rt-mod"), total = totals[i];
    let room = total;
    if (mod.textContent) {
      const m = Math.min(Math.ceil(measure(mod.textContent, mf)), Math.max(total - gap - Math.ceil(measure(el.dataset.name, nf)), MOD_MIN));
      mod.style.maxWidth = m + "px";
      room = total - gap - m;
    } else mod.style.maxWidth = "";
    name.textContent = fit(el.dataset.name, room, nf);
    el.dataset.fitted = el.dataset.name + "|" + mod.textContent + "|" + rail.clientWidth;
  });
}

function fill(el, t) {
  el.dataset.name = t.name;
  const ic = kindOf(t.sourceSet);
  if (el.dataset.ic !== ic) {
    const tpl = document.createElement("template");
    tpl.innerHTML = ICON[ic];
    el.querySelector(".rt-ic").replaceWith(tpl.content.firstChild);
    el.dataset.ic = ic;
  }
  el.querySelector(".rt-mod").textContent = ((t.dim || "") + (t.module ? " · " + t.module : "")).replace(/^\s*·\s*/, "");
  el.title = t.title;
  el.classList.toggle("active", t.active);
  el.classList.toggle("stale", t.stale);
  el.setAttribute("aria-selected", String(t.active));
}

function close(key) { post("/viewer/close", { key }); }

/** 새 줄은 높이 0에서 자란다. 아래 줄은 그만큼 밀린다 — 둘 다 같은 전환이라 따로 FLIP 할 것이 없다. */
function enter(el) {
  if (reduced.matches || document.hidden) return;
  el.classList.add("entering");
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("entering")));
}

function leave(el) {
  el.classList.add("leaving");
  if (reduced.matches || document.hidden) { ro.unobserve(el); el.remove(); return; }
  const drop = () => { ro.unobserve(el); el.remove(); };
  el.addEventListener("transitionend", e => { if (e.target === el) drop(); });
  setTimeout(drop, 500);   // 탭이 뒤에 있으면 전환이 멈춘다
}

/**
 * 바탕을 지금 줄 밑으로. 줄을 옮긴 때만 미끄러지고, 높이가 바뀌는 동안(열고 닫기)은 그대로 따라간다.
 * 늘어나거나 출렁이지 않는다 — 시간 · 이징은 tokens.css 의 것을 읽는다.
 */
let gy = 0, stretch = null, sliding = false;
function glide(slide) {
  const el = list.querySelector(".rt.active:not(.leaving)");
  glider.hidden = !el;
  if (!el) return;
  const y = el.offsetTop;
  glider.classList.add("instant");
  if (slide && !reduced.matches && y !== gy) {
    if (stretch) stretch.cancel();
    sliding = true;
    stretch = glider.animate([{ transform: `translateY(${gy}px)` }, { transform: `translateY(${y}px)` }],
      { duration: motionMs("--duration-medium2"), easing: motionToken("--easing-standard") });
    stretch.finished.then(() => { stretch = null; sliding = false; }, () => {});
  } else if (stretch && !slide) { stretch.cancel(); stretch = null; sliding = false; }
  gy = y;
  glider.style.transform = `translateY(${y}px)`;
}

// 줄 높이가 움직이는 동안(열고 닫기) 바탕이 따라간다. 미끄러지는 중이면 그 전환을 끊지 않고 새 자리로 다시 겨눈다.
const ro = new ResizeObserver(() => glide(sliding));
document.fonts?.ready.then(() => layout(true));

export function renderTabs(s) {
  const was = !rail.hidden;
  const next = s.tabs || [];
  // 작업 공간(D-57 · D-99)에서는 레일이 접힌다 — 헤더가 한 줄 내비게이션 바가 되고, 돌아갈 탭은 뒤로 버튼이 이름으로 갖는다.
  // 접고 펴는 것은 단번에 한다 — 화면 전환이 새 화면을 찍는 순간 레이아웃이 끝나 있어야 커지는 그림의 목적지가 움직이지 않는다.
  const on = s.screen !== "focus";
  rail.hidden = !on;
  document.body.classList.toggle("rail-on", on);
  empty.hidden = next.length > 0;
  const have = new Map([...list.querySelectorAll(".rt:not(.leaving)")].map(el => [el.dataset.key, el]));
  const keys = new Set(next.map(t => t.key));
  for (const [k, el] of have) if (!keys.has(k)) leave(el);
  let prev = glider;
  for (const t of next) {
    let el = have.get(t.key);
    if (!el) { el = make(t); if (was && on) enter(el); }
    if (prev.nextElementSibling !== el) prev.after(el);
    fill(el, t);
    ro.observe(el);
    prev = el;
  }
  layout();
  tabs = next;
  const key = (next.find(t => t.active) || {}).key || null;
  const moved = was && on && key !== activeKey && activeKey !== null;
  activeKey = key;
  glide(moved);
}

/** `⇧←` `⇧→` — 이웃 탭. 끝에서 멈춘다(돌지 않는다). */
export function stepTab(d) {
  const i = tabs.findIndex(t => t.active);
  const t = tabs[Math.max(0, Math.min(tabs.length - 1, i + d))];
  if (t && !t.active) post("/viewer/tab", { key: t.key });
}

/** `1`~`9` — 그 번째 탭. */
export function jumpTab(n) {
  const t = tabs[n - 1];
  if (t && !t.active) post("/viewer/tab", { key: t.key });
}

export const tabCount = () => tabs.length;
