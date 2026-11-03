// 가리키기(FR-20·21) — 트리 평탄화 · 히트테스트 · 박스 · 꼬리표 · 데몬에 보내기 · 후보 고르기. 보드와 한 장이 함께 쓴다.
// 가리킨 결과는 박스 꼬리표가 말한다 — 캡슐은 오류 · 알림만(D-101).
import { $, store } from "./store.js";
import { phrase, daemonText } from "./strings.js";
import { post } from "./api.js";
import { flash } from "./capsule.js";

/**
 * chain 은 이름 그대로 데몬에 간다(`selection`). uchain 은 꼬리표 툴팁에 보일 것 — 호출한 자리가 프로젝트 소스인 노드만.
 * 노드의 파일 · 라인은 부른 자리라, `Row`도 내 코드가 불렀으면 남고 `ReusableComposeNode` · `Layout`(Compose 안에서 불림)은 빠진다.
 */
export function flatten(list, ancestors, out, uancestors = []) {
  const mine = store.projectFiles.size ? n => store.projectFiles.has(n.fileName) : () => true;
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
export const byPick = (a, b) => a.area - b.area || b.chain.length - a.chain.length;
export function narrow(list) { return store.projectFiles.size ? list.filter(n => store.projectFiles.has(n.fileName)) : list; }
export function hitIn(list, x, y) { return list.find(n => { const [l, t, r, b] = n.bounds; return x >= l && x < r && y >= t && y < b; }); }
/** 표시 배율. 보드 카드는 폭을 잘라 보이므로 PNG 좌표와 화면 좌표가 다르다 — 가리키기·터치 둘 다 여기를 지난다. */
// 인터랙티브 스트림은 보이는 크기로 줄여 오므로 좌표의 기준은 원래 크기(data-full-w)다. 없으면 받은 그림의 크기.
const natW = img => +img.dataset.fullW || img.naturalWidth;
export function scaleOf(img) { return natW(img) ? img.getBoundingClientRect().width / natW(img) : 1; }
export function posIn(e, img) { const r = img.getBoundingClientRect(), s = scaleOf(img) || 1; return [Math.round((e.clientX - r.left) / s), Math.round((e.clientY - r.top) / s)]; }
export function drawBox(el, n, s) {
  const [l, t, r, b] = n.bounds;
  el.hidden = false; el.style.left = l * s + "px"; el.style.top = t * s + "px"; el.style.width = (r - l) * s + "px"; el.style.height = (b - t) * s + "px";
}

/**
 * 가리킨 노드를 데몬에 보낸다. 풀패스는 데몬이 붙이고(베이스네임이 갈리면 state.choice 로 고르게 한다),
 * 클립보드는 브라우저만 만질 수 있어 돌아온 멘션을 여기서 넣는다 — 사람이 터미널에 붙여넣는다.
 */
export async function point(n, previewId, say) {
  const g = ++gen;
  try {
    const r = await post("/viewer/point", { fileName: n.fileName, line: n.lineNumber, node: n.name || null, chain: n.chain || [], userChain: n.uchain || n.chain || [], bounds: n.bounds, previewId }).then(r => r.json());
    if (g !== gen) return;
    if (r.ref) copy(r.ref, say, r.file); else if (!r.needChoice) say(daemonText(r.message) || `${n.fileName}:${n.lineNumber}`);
  } catch (e) { if (g === gen) { say(phrase("point.failed", { why: e.message })); flash(phrase("point.failed", { why: e.message })); } }
}
// 가리키기 · 복사마다 올린다 — 늦게 끝난 앞의 것이 뒤의 결과를 덮지 않게.
let gen = 0;
const write = text => (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject(new Error(phrase("point.noClipboard"))));
/**
 * say(문장, 멘션, 복사됐나, 풀패스, 다시 복사) — 꼬리표가 멘션과 복사 결과를 따로 그리고, 풀패스로 "탭으로 열기"를 단다.
 * 창에 포커스가 없거나(에이전트가 터미널을 쥐고 있을 때) 제스처가 만료되면 브라우저가 쓰기를 막는다. 그때는 "다시 복사"를
 * 건네 사람이 누르는 순간(제스처) 넣는다 — 저절로 다시 넣으면 그 사이 사람이 다른 데서 복사해 둔 것을 덮는다.
 */
function copy(ref, say, file) {
  const g = ++gen;
  const copied = () => { if (g === gen) say(phrase("point.copied", { ref }), ref, true, file); };
  const again = () => write(ref).then(copied, () => { if (g === gen) say(phrase("point.copyBlocked", { ref }), ref, false, file); });
  write(ref).then(copied, () => { if (g === gen) say(phrase("point.copyRetry", { ref }), ref, false, file, again); });
}

/** 후보를 고른 뒤 결과를 알릴 곳. 마지막으로 가리킨 꼬리표가 정하고, 걷히면(clearPick) 캡슐의 알림으로 돌아간다. */
const noticeSay = m => flash(m);
let lastSay = noticeSay;
export function setSay(f) { lastSay = f; }

/* ---------- 꼬리표 ---------- */
/*
 * 가리킨 박스 위 꼬리표 — `파일명:라인 · ✓ 복사됨`. 막히면 끝에 "눌러서 복사", 그 뒤에 "탭으로 열기".
 * 디렉터리 · 노드 이름 · 조상 사슬은 툴팁에 둔다 — 꼬리표는 그림 위라 짧을수록 덜 가린다(D-105). 잘려도 툴팁에 전체가 있다.
 */
const TAB = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3.5" width="12" height="9.5" rx="2"/><path d="M2 6.5h5.5V3.5"/></svg>';

/** 멘션(`@절대경로#L라인`)이나 미리 보인 `파일명:라인`에서 꼬리표 글자를. */
function tagText(ref) {
  const m = /#L(\d+)$/.exec(ref);
  const path = ref.replace(/^@/, "").replace(/#L\d+$/, "");
  return m ? `${path.slice(path.lastIndexOf("/") + 1)}:${m[1]}` : path;
}
/** 저장소 기준 경로 — `src/main/kotlin/<패키지>` 는 파일명이 이미 말하는 것이라 …로 접는다. 후보 고르기도 같은 모양이다. */
function shortPath(path) {
  const repo = store.st && store.st.header && store.st.header.repo;
  const rel = repo && path.startsWith(repo + "/") ? path.slice(repo.length + 1) : path;
  const cut = rel.lastIndexOf("/") + 1, src = rel.indexOf("/src/");
  return (src > 0 && src < cut ? rel.slice(0, src) + "/…/" : rel.slice(0, cut)) + rel.slice(cut);
}

/**
 * U7 — 가리킨 파일을 탭으로. 지금 탭의 파일이면 달지 않고, 이미 열린 파일이면 "탭으로 가기"다.
 * 열 수 없는 까닭(프리뷰 없음 · 다른 앱)은 데몬이 답한다.
 */
function openButton(file) {
  const tabs = (store.st && store.st.tabs) || [];
  const tab = tabs.find(t => t.key === file);
  if (tab && tab.active) return null;
  if (!tabs.length && store.st && store.st.board && store.st.board.file === file) return null;
  const b = document.createElement("button");
  b.type = "button"; b.className = "tag-open";
  const label = tab ? phrase("point.tab.go") : phrase("point.tab.open");
  b.title = label + " — " + file.split("/").pop();
  b.setAttribute("aria-label", b.title);
  b.innerHTML = TAB;
  b.addEventListener("click", async () => {
    const r = await post("/viewer/open", { file }).then(r => r.json()).catch(e => ({ ok: false, message: phrase("open.failed", { why: e.message }) }));
    if (r.ok) return;                                  // 탭은 state 가 연다
    if (r.command) {
      // 다른 앱의 파일 — 이 뷰어의 데몬은 그 앱을 그릴 수 없다. 터미널이나 에이전트에 붙여 넣을 명령을 건넨다.
      const message = daemonText(r.message);
      write(r.command).then(() => flash(message), () => flash(`${message.split(" — ")[0]} — ${r.command}`));
    } else flash(daemonText(r.message));
  });
  return b;
}

function renderTag(tag, n, { msg, ref, copied, file, again }) {
  tag.replaceChildren();
  const where = (n.uchain || n.chain || []).slice(-6).join(" › ");
  if (!ref) {
    const t = document.createElement("span"); t.className = "tag-ref"; t.textContent = msg || "";
    tag.append(t); tag.title = [msg, where].filter(Boolean).join("\n"); return;
  }
  const t = document.createElement("span"); t.className = "tag-ref"; t.textContent = tagText(ref);
  tag.append(t);
  // 클립보드에 간 모양(`@절대경로#L라인`) 그대로 — 에이전트가 읽는 모양은 바꾸지 않는다.
  tag.title = [ref, n.name, where].filter(Boolean).join("\n");
  if (copied) { const m = document.createElement("span"); m.className = "tag-ok"; m.textContent = phrase("point.tag.copied"); tag.append(m); }
  else if (again) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "tag-again"; b.textContent = phrase("point.tag.retry");
    b.addEventListener("click", again);
    tag.append(b);
  } else if (copied === false) { const m = document.createElement("span"); m.className = "tag-ok wait"; m.textContent = phrase("point.tag.blocked"); tag.append(m); }
  const o = file && openButton(file);
  if (o) tag.append(o);
  if (chooser.classList.contains("on")) placeChooser();
}

/**
 * 꼬리표의 누름이 아래 그림(가리키기 · 이동 · 터치)으로 새지 않게 한다. 마우스로 누른 단추는 포커스를 쥐지 않는다(D-63) —
 * 쥐면 다음 Enter(고른 카드 열기)를 단추가 가져간다.
 */
function wireTag(tag) {
  if (tag.dataset.wired) return;
  tag.dataset.wired = "1";
  for (const type of ["mousedown", "click", "pointerdown", "dblclick"]) tag.addEventListener(type, e => e.stopPropagation());
  tag.addEventListener("mousedown", e => { if (e.button === 0 && e.target.closest("button")) e.preventDefault(); });
}

/** 마지막으로 가리킨 꼬리표 — 후보 고르기가 여기서 내려온다. */
let anchor = null;

/** 꼬리표가 박스 밖에 서는 데 드는 높이 — 꼬리표 높이 + 간격(style.css 의 --tag-h · --space-4). */
function tagRoom() {
  const css = getComputedStyle(document.documentElement);
  return parseFloat(css.getPropertyValue("--tag-h")) + parseFloat(css.getPropertyValue("--space-4"));
}

/**
 * 박스 하나에 가리킨 결과를 단다(그린 박스 위에서 부른다). 다른 박스의 꼬리표는 걷는다 — 보드에서 옛 카드에 옛 결과가 남으면 틀린 말이다.
 * 꼬리표는 박스를 자르는 틀(보드 카드 · 한 장의 틀) 안에 선다 — 위가 좁으면 아래, 둘 다 좁으면(틀을 채운 노드) 박스 안 위 끝.
 * 틀 오른쪽이 좁으면 꼬리표가 줄어 파일명이 말줄임된다. 재는 것은 화면 px 이다 — 확대해도 꼬리표는 같은 크기다.
 */
export function sayOn(box, n) {
  for (const b of document.querySelectorAll(".box.pick")) if (b !== box) b.hidden = true;
  const tag = box.querySelector(".tag");
  wireTag(tag);
  anchor = tag;
  box.style.animation = "none";              // 톡 치는 확대가 걸린 채로 재지 않게 먼저 멈춘다
  const r = box.getBoundingClientRect(), clip = box.parentElement.closest(".cstage, .wrap");
  const c = clip ? clip.getBoundingClientRect() : { top: -Infinity, bottom: Infinity, right: Infinity };
  const room = tagRoom(), up = r.top - c.top >= room, down = c.bottom - r.bottom >= room;
  box.classList.toggle("below", !up && down);
  box.classList.toggle("inside", !up && !down);
  tag.style.maxWidth = Number.isFinite(c.right) ? `min(var(--tag-max-w), ${Math.max(0, Math.floor(c.right - r.left) - 4)}px)` : "";
  void box.offsetWidth; box.style.animation = "";
  const say = (msg, ref, copied, file, again) => renderTag(tag, n, { msg, ref, copied, file, again });
  say(null, `${n.fileName}:${n.lineNumber}`);
  return say;
}

/** 가리킨 결과를 걷는다 — 화면이나 카드가 바뀌면 옛 카드의 결과는 틀린 말이다. 늦게 온 결과 · 후보 고르기는 캡슐의 알림으로 간다. */
export function clearPick() {
  for (const b of document.querySelectorAll(".box.pick")) b.hidden = true;
  anchor = null; lastSay = noticeSay; gen++;
}

/* ---------- 후보 고르기 ---------- */
/** 같은 베이스네임이 여러 곳에 있다(state.choice). 꼬리표에서 내려오는 팝오버이고, 고르면 데몬이 기억해 한 데몬에서 두 번 묻지 않는다. */
const chooser = $("chooser");
const GAP = 8, EDGE = 16;
/** 꼬리표 바로 아래 — 아래가 모자라면 위. 꼬리표가 없으면(새로 연 페이지) 헤더 아래 가운데. 창 밖으로 나가지 않게 당긴다. */
function placeChooser() {
  const root = document.documentElement, cw = root.clientWidth, ch = root.clientHeight;
  const w = chooser.offsetWidth, h = chooser.offsetHeight;
  const a = anchor && anchor.isConnected && anchor.getClientRects().length ? anchor.getBoundingClientRect() : null;
  let left, top, up = false;
  if (a) {
    left = a.left; top = a.bottom + GAP;
    if (top + h > ch - EDGE && a.top - GAP - h >= EDGE) { top = a.top - GAP - h; up = true; }
  } else {
    left = (cw - w) / 2; top = $("bar").getBoundingClientRect().bottom + EDGE;
  }
  left = Math.max(EDGE, Math.min(left, cw - w - EDGE));
  top = Math.max(EDGE, Math.min(top, ch - h - EDGE));
  const l = Math.round(left) + "px", t = Math.round(top) + "px";
  if (chooser.style.left !== l) chooser.style.left = l;
  if (chooser.style.top !== t) chooser.style.top = t;
  chooser.classList.toggle("up", up);
}
/** 떠 있는 동안 프레임마다 꼬리표를 따라간다 — 상태가 온 뒤 보드가 다시 배치되거나 스크롤 · 창 크기가 바뀌어도 붙어 있다. */
let following = false;
function follow() {
  if (!chooser.classList.contains("on")) { following = false; return; }
  placeChooser();
  requestAnimationFrame(follow);
}

export function renderChoice(c) {
  chooser.classList.toggle("on", !!c);
  chooser.setAttribute("aria-hidden", String(!c));
  if (!c) { if (chooser.contains(document.activeElement)) document.activeElement.blur(); return; }
  if (chooser.dataset.key !== c.fileName + c.line) {
    chooser.dataset.key = c.fileName + c.line;
    chooser.replaceChildren();
    const h = document.createElement("h2");
    h.textContent = phrase("choose.title", { file: c.fileName, n: c.candidates.length });
    const sub = document.createElement("p");
    sub.textContent = phrase("choose.sub");
    chooser.append(h, sub);
    for (const p of c.candidates) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "opt"; b.title = p;
      b.textContent = shortPath(p.startsWith(c.repoRoot + "/") ? p.slice(c.repoRoot.length + 1) : p);
      b.addEventListener("click", async () => {
        const r = await post("/viewer/choose", { path: p }).then(r => r.json()).catch(() => ({}));
        if (r.ref) copy(r.ref, lastSay, r.file);
      });
      chooser.appendChild(b);
    }
    const x = document.createElement("button");
    x.type = "button"; x.className = "cancel"; x.textContent = phrase("choose.cancel");
    x.addEventListener("click", () => post("/viewer/cancel"));
    chooser.appendChild(x);
  }
  placeChooser();
  if (!following) { following = true; requestAnimationFrame(follow); }
}
