// 빠른 열기(D-56 · D-100) — 이 데몬이 열 수 있는 프리뷰 파일을 찾아 탭으로 연다.
// 레일 맨 아래 "파일 열기"(D-98) · / · ⌘K 로 열면 창 위 가운데에 팔레트가 뜨고, 그 맨 위 입력에 바로 칠 수 있다. 뒤에는 막이 깔린다. 목록은 데몬이 갖고(`/preview-files.json`), 매칭 · 순위 · 최근 연 파일은 브라우저의 일이다.
// 열린 탭이 없으면 같은 상자가 막 없이 본문 가운데의 시작 화면이 된다(D-63) — 팔레트의 상자를 그대로 옮겨 온다.
import { $, store } from "./store.js";
import { phrase, daemonText } from "./strings.js";
import { post, fetchPreviewFiles } from "./api.js";
import { matchFile } from "./match.js";
import { reveal, cancelReveal, applyReveal } from "./board.js";
import { flash } from "./capsule.js";

const openBtn = $("railOpen"), q = $("q");
const sheet = $("qoSheet"), col = sheet.querySelector(".qo-col"), inner = $("qoIn"), curtain = $("qoCurtain");
const startView = $("startView"), startLead = startView.querySelector(".start-lead");

const ROWS = 8, CHANGED = 5;          // 빈 상태 = 최근 바뀐 5 + 최근 연 3 — 결과와 줄 수가 같아 치기 시작해도 팔레트 높이가 거의 그대로다
let open = false, files = null, ready = false, items = [], sel = -1, closeOnDraw = 0, entering = false;
// docked — 상자가 시작 화면에 있다. returnTo — 키보드로 연 자리. 닫을 때 그리로 포커스를 돌려준다(마우스로 열었으면 없다).
let docked = false, returnTo = null;

// 옛 카드 거르기의 검색어(파일별) — 거르기가 없어졌으니 한 번 치운다.
try { for (const k of Object.keys(localStorage)) if (k.startsWith("prevue.search:")) localStorage.removeItem(k); } catch { /* 못 치워도 쓰이지 않는다 */ }

/* ---------- 최근 연 파일 — 저장소별로 브라우저에만 남는다(표시 취향, 데몬은 모른다) ---------- */
const recentSlot = () => "prevue.recent:" + ((store.st && store.st.header.repo) || "");
function recent() { try { return JSON.parse(localStorage.getItem(recentSlot()) || "[]"); } catch { return []; } }
function remember(path) {
  if (!path) return;
  const l = [path, ...recent().filter(p => p !== path)].slice(0, 20);
  try { localStorage.setItem(recentSlot(), JSON.stringify(l)); } catch { /* 기억 못 해도 열기는 된다 */ }
}

/* ---------- 열기 · 닫기 ---------- */
/** opener 는 키보드로 연 자리다 — 그냥 닫으면(Esc · 커튼) 그리로 포커스가 돌아간다. 마우스로 열었으면 null 이다(D-63). */
export function openQuickOpen(opener = null) {
  // 시작 화면이면 필드가 이미 본문에 있다 — 팔레트를 띄우지 않고 그 필드로 간다.
  if (docked) { q.focus({ preventScroll: true }); q.select(); return; }
  if (!open) {
    open = true; entering = true; sel = -1;
    returnTo = opener && opener !== document.body ? opener : null;
    openBtn.setAttribute("aria-expanded", "true");
    sheet.hidden = false; curtain.hidden = false; sheet.classList.remove("closing");   // 닫히는 중에 다시 열면 흐려 둔 팔레트를 되살린다
    render();
    requestAnimationFrame(() => { curtain.classList.add("on"); sheet.classList.add("on"); });
    load();
  }
  q.focus({ preventScroll: true }); q.select();
}

/**
 * 닫는다. instant 면 움직임 없이 — 화면 전환(탭 · 작업 공간 나가기)이 같은 프레임에 걷어 간다(D8).
 * back 이면 아무것도 고르지 않고 물러난 것이라 키보드로 연 자리에 포커스를 돌려준다 — 골라서 화면이 바뀌었으면 돌려주지 않는다
 * (돌려주면 다음 Enter 를 그 버튼이 가져가 패널이 다시 열린다).
 */
export function closeQuickOpen(instant = false, back = false) {
  closeOnDraw = 0;
  if (!open) return;
  open = false; entering = false;
  q.value = ""; q.blur();
  if (back && returnTo && returnTo.isConnected) returnTo.focus({ preventScroll: true });
  returnTo = null;
  openBtn.setAttribute("aria-expanded", "false");
  curtain.classList.remove("on"); sheet.classList.remove("on");
  if (instant) { sheet.hidden = true; curtain.hidden = true; return; }
  // 움직임 줄이기에서도 흐려지며 닫힌다 — 줄어드는 움직임만 없다(style.css).
  sheet.classList.add("closing");
  setTimeout(() => { if (!open) { sheet.hidden = true; curtain.hidden = true; sheet.classList.remove("closing"); } }, 220);
}
export const quickOpenOpen = () => open;

/*
 * 시작 화면(D-63 · D-100) — 열린 탭이 없으면(모두 닫았거나 파일 없이 띄웠다) 팔레트의 상자(입력 + 목록 + 안내 줄)를 본문 가운데로 옮긴다.
 * 막 · 떠오르는 움직임 · Esc 닫기는 없고 줄 · 매칭 · 고르기는 팔레트와 한 벌이다. 고른 파일의 탭이 열리면 상자를 팔레트로 되돌린다 —
 * 상자가 팔레트 자리로 날아가는 모션은 만들지 않는다.
 * 썸네일 · 미리 렌더는 붙이지 않는다(D-08 — 카탈로그가 된다).
 */
function dock() {
  if (docked) return;
  closeQuickOpen(true);
  docked = true; entering = true; sel = -1; q.value = "";
  startLead.after(col);
  startView.hidden = false;
  render();
  load();
}
function undock() {
  if (!docked) return;
  docked = false;
  if (document.activeElement === q) q.blur();
  q.value = ""; sel = -1;
  sheet.append(col);
  startView.hidden = true;
  startView.classList.remove("enter");
}
/** 데몬과 끊겼다 — 끊김은 오류로 남고 시작 화면이 덮지 않는다. 다시 붙으면 state 가 되살린다. */
export function quickOpenOffline() { undock(); closeQuickOpen(true); }

async function load() {
  try {
    const d = await fetchPreviewFiles();
    ready = d.ready;
    files = d.files.map(f => ({ ...f, name: f.rel.split("/").pop() }));
  } catch { files = []; ready = true; }
  if (open || docked) render();
}

/* ---------- 목록 ---------- */
const words = () => q.value.trim().split(/\s+/).filter(Boolean);
/** 지금 보일 줄들 — 빈 상태면 두 섹션, 치면 점수 순 상위 8줄. */
function compute() {
  const w = words();
  if (!files) return { sections: [], more: 0, empty: !w.length, loading: true };
  if (!w.length) {
    const byPath = new Map(files.map(f => [f.path, f]));
    const changed = files.slice(0, CHANGED);
    const seen = new Set(changed.map(f => f.path));
    const opened = recent().map(p => byPath.get(p)).filter(f => f && !seen.has(f.path));
    // 연 파일이 모자라면 바뀐 파일로 채운다 — 8줄 높이를 지킨다.
    const room = ROWS - changed.length;
    const more = opened.length < room ? files.slice(CHANGED).filter(f => !opened.includes(f)).slice(0, room - opened.length) : [];
    const sections = [{ title: phrase("quickopen.changed"), rows: [...changed, ...more].map(f => ({ f })) }];
    if (opened.length) sections.push({ title: phrase("quickopen.opened"), rows: opened.slice(0, room).map(f => ({ f })) });
    return { sections, more: 0, empty: true };
  }
  const hits = [];
  for (const f of files) { const m = matchFile(w, f); if (m) hits.push({ f, m }); }
  hits.sort((a, b) => b.m.score - a.m.score || b.f.mtime - a.f.mtime);
  return { sections: hits.length ? [{ rows: hits.slice(0, ROWS) }] : [], more: Math.max(0, hits.length - ROWS), empty: false };
}

/** 맞은 글자만 굵게 — 색을 쓰면 줄마다 색이 흩어진다(D6). */
function marked(text, idx) {
  const frag = document.createDocumentFragment();
  if (!idx || !idx.size) { frag.append(text); return frag; }
  let run = "", on = false;
  const flush = () => { if (!run) return; if (on) { const b = document.createElement("b"); b.textContent = run; frag.append(b); } else frag.append(run); run = ""; };
  [...text].forEach((c, i) => { const hit = idx.has(i); if (hit !== on) { flush(); on = hit; } run += c; });
  flush();
  return frag;
}

// 줄의 시작 — apple.com 빠른 링크의 화살표. 고른 줄에서만 진해진다(R5).
const ARROW = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>`;
const moduleOf = m => (m || "").replace(/^:/, "").replace(/:/g, "/");

/** 검색어가 맞은 함수 중 가장 많이 맞은 것 — 줄에는 이것 하나만 글자로 붙는다(R1). 파일명으로 맞았으면 없다. */
function bestFn(m) {
  if (!m || !m.fns.size) return null;
  let best = null;
  for (const [fn, idx] of m.fns) if (!best || idx.size > best[1].size) best = [fn, idx];
  return { fn: best[0], idx: best[1], more: m.fns.size - 1 };
}

/** 한 줄 — `→ 파일명 › 맞은 함수  모듈`. 썸네일 · 칩 · 시각 · 열림은 없다(디자인 리뷰 2차: 쉬고 있을 때는 조용하게). */
function row(it, i) {
  const { f, m } = it;
  const el = document.createElement("div");
  el.className = "qo-row"; el.setAttribute("role", "option"); el.dataset.i = i; el.style.setProperty("--i", i);
  el.title = f.rel;
  const arrow = document.createElement("span"); arrow.className = "qo-arrow"; arrow.innerHTML = ARROW;
  const name = document.createElement("span"); name.className = "qo-name"; name.append(marked(f.name, m && m.name));
  el.append(arrow, name);
  const b = it.fn = bestFn(m);
  if (b) {
    const fn = document.createElement("span"); fn.className = "qo-fn";
    fn.append("› ", marked(b.fn, b.idx));
    if (b.more) { const n = document.createElement("span"); n.className = "qo-fn-more"; n.textContent = ` +${b.more}`; fn.append(n); }
    el.append(fn);
  }
  const mod = document.createElement("span"); mod.className = "qo-mod"; mod.textContent = moduleOf(f.module);
  el.append(mod);
  el.addEventListener("mousedown", e => e.preventDefault());       // 필드의 포커스를 지킨다
  el.addEventListener("mousemove", () => { if (moved() && sel !== i) { sel = i; mark(); } });
  el.addEventListener("click", () => pick(it));
  return el;
}

// 줄이 다시 그려지면 가만히 있는 포인터 밑에서도 mousemove 가 온다 — 그걸 받으면 치는 동안 고른 줄을 마우스가 빼앗는다. 실제로 움직였을 때만.
// 좌표는 페이지 어디서든 늘 적어 둔다 — 그래야 패널을 연 직후의 가짜 mousemove 도 "안 움직였다"로 읽힌다.
let px = -1, py = -1, real = false;
addEventListener("mousemove", e => { real = e.screenX !== px || e.screenY !== py; px = e.screenX; py = e.screenY; }, true);
const moved = () => real;

function render() {
  const { sections, more, empty, loading } = compute();
  items = sections.flatMap(s => s.rows);
  if (sel >= items.length) sel = items.length - 1;
  const parts = [];
  let i = 0;
  if (loading || (!ready && !items.length)) parts.push(note(phrase("quickopen.loading")));
  else if (!items.length) {
    if (empty) parts.push(note(phrase("quickopen.none")));
    else {
      const n = note(phrase("quickopen.noMatch", { q: q.value.trim() }));
      const why = document.createElement("div"); why.className = "qo-why"; why.textContent = phrase("quickopen.noMatch.why");
      n.append(why); parts.push(n);
    }
  }
  for (const s of sections) {
    if (s.title) { const h = document.createElement("div"); h.className = "qo-h"; h.textContent = s.title; parts.push(h); }
    for (const it of s.rows) parts.push(row(it, i++));
  }
  if (more) { const m = document.createElement("div"); m.className = "qo-foot"; m.textContent = phrase("quickopen.more", { n: more }); parts.push(m); }
  // 움직임 줄이기면 계단 대신 페이드다(style.css).
  (docked ? startView : sheet).classList.toggle("enter", entering);
  inner.replaceChildren(...parts);
  entering = false;
  mark();
}
function note(text) { const d = document.createElement("div"); d.className = "qo-none"; d.textContent = text; return d; }

/**
 * 고른 줄 — 쉬는 동안(막 열었고 아무것도 안 했다)은 없다(sel = -1). ↓ · 입력 · 포인터가 움직이면 생긴다(R5).
 * 그래도 Enter 의 기본값은 첫 줄이다 — 보이지 않을 뿐이다.
 */
function mark() {
  inner.querySelectorAll(".qo-row").forEach(el => {
    const on = Number(el.dataset.i) === sel;
    el.classList.toggle("sel", on);
    el.setAttribute("aria-selected", String(on));
  });
  const el = sel >= 0 && inner.querySelector(`.qo-row[data-i="${sel}"]`);
  if (el) el.scrollIntoView({ block: "nearest" });
}

/* ---------- 고르기 ---------- */
const activeKey = () => { const t = ((store.st && store.st.tabs) || []).find(t => t.active); return t ? t.key : store.st && store.st.board && store.st.board.file; };

/**
 * 연다. 검색어가 함수에 맞은 줄이면 그 함수 묶음의 첫 카드로 간다(R2 — Tab 은 없다, 다른 함수는 더 쳐서 찾는다).
 * 지금 보는 파일이면 그 자리에서 가고(작업 공간이면 나가며 그 카드로 줄어든다), 다른 파일이면 탭으로 연다 —
 * 팔레트는 새 화면을 그리는 그 프레임에 걷힌다(D8).
 */
async function pick(it) {
  const f = it.f, st = store.st, fn = it.fn ? it.fn.fn : null;
  remember(f.path);
  if (f.path === activeKey()) {
    reveal(f.path, fn);
    if (st.screen === "focus" && st.focus && st.focus.fromBoard) { arm(); post("/viewer/exit"); }
    else { closeQuickOpen(); applyReveal(); }
    return;
  }
  reveal(f.path, fn);
  arm();
  const r = await post("/viewer/open", { file: f.path }).then(r => r.json()).catch(e => ({ ok: false, message: phrase("open.failed", { why: e.message }) }));
  if (r.ok) return;
  closeOnDraw = 0; cancelReveal();
  flash(daemonText(r.message) || phrase("open.cannot"));
}
/** 다음 화면 전환이 팔레트를 걷어 가게 한다. 전환이 오지 않으면(데몬이 답만 하고 끝) 잠시 뒤 스스로 닫는다. */
function arm() {
  const t = closeOnDraw = performance.now();
  setTimeout(() => { if (closeOnDraw === t) closeQuickOpen(); }, 1500);
}

/** 상태를 그릴 때마다 — 시작 화면을 펼지, 팔레트를 걷을지, 지금 탭을 최근 연 파일에 적을지. */
let lastActive = null;
export function renderQuickOpen(s) {
  const a = activeKey();
  if (a && a !== lastActive) { lastActive = a; remember(a); }
  // 최근 연 파일이 저장소별이라 저장소를 안 뒤에 편다 — 데몬이 막 떴을 때의 첫 상태는 저장소가 비어 있다.
  if (s.screen === "empty") { if (s.header.repo) dock(); }
  else undock();
  // 시작 화면에서 고른 파일은 탭이 열린 상태에서 걷힌다 — 그 사이에 온 빈 화면 상태로는 걷지 않는다.
  if (closeOnDraw && s.screen !== "empty") closeQuickOpen(true);
  else if (open || docked) render();
}

/** 목록이 바뀌었다(데몬의 `previewFiles`). 펼쳐져 있으면 다시 받는다 — 닫혀 있으면 다음에 열 때 받는다. */
export function previewFilesChanged() { if (open || docked) load(); }
// 시작 화면은 계속 떠 있다 — 저장마다 다시 받지 않고(mtime만 바뀐 저장은 조용하다) 창에 돌아올 때 받는다.
document.addEventListener("visibilitychange", () => { if (docked && !document.hidden) load(); });

/* ---------- 입력 ---------- */
// e.detail 이 0 이면 키보드로 누른 것이다(Enter · Space) — 그때만 닫을 때 그 버튼으로 돌아온다.
openBtn.addEventListener("click", e => (open ? closeQuickOpen(false, true) : openQuickOpen(e.detail === 0 ? openBtn : null)));
q.addEventListener("input", () => { sel = q.value.trim() ? 0 : -1; render(); });
q.addEventListener("keydown", e => {
  // 입력 중에는 단축키가 죽으므로(keys.js) 패널의 키는 여기서 받는다.
  if (e.isComposing) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    if (!items.length) return;
    const d = e.key === "ArrowDown" ? 1 : -1;
    sel = sel < 0 ? (d > 0 ? 0 : items.length - 1) : (sel + d + items.length) % items.length;
    mark();
  } else if (e.key === "Enter") {
    e.preventDefault();
    const row = items[Math.max(0, sel)];
    if (row) pick(row);
  } else if (e.key === "Escape") {
    e.preventDefault();
    // 시작 화면은 닫을 것이 없다 — 지우고, 빈 필드면 필드를 떠난다.
    if (q.value) { q.value = ""; sel = -1; render(); } else if (docked) q.blur(); else closeQuickOpen(false, true);
  }
});
curtain.addEventListener("click", () => closeQuickOpen(false, true));
// 막이 덮지 않는 헤더 · 레일을 눌러도 닫는다 — 바깥 누름이다. 누른 것(레일 탭 등)은 그대로 제 일을 한다.
document.addEventListener("pointerdown", e => {
  if (open && !sheet.contains(e.target) && !curtain.contains(e.target) && !openBtn.contains(e.target)) closeQuickOpen();
}, true);
// 키보드로 팔레트 밖에 나가도 닫는다 — 막이 레일 · 헤더를 덮지 않아 Tab 으로 닿는다. 입구 단추로 가는 것은 그 단추가 닫는다.
q.addEventListener("focusout", e => {
  const to = e.relatedTarget;
  if (open && to && !sheet.contains(to) && to !== openBtn) closeQuickOpen();
});
// 상자의 빈 곳(머리말 · 안내 줄)을 눌러도 입력이 포커스를 지킨다 — 그래야 Esc 가 닫는다.
col.addEventListener("mousedown", e => { if (e.target !== q) e.preventDefault(); });
