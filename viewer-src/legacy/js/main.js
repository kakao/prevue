// View(D-41). 데몬의 ViewerViewModel 이 보낸 상태를 그리고, 사람의 조작을 의도로 보낸다.
// 문장 · 이름표 · 모드 · 풀패스는 데몬이 정한다 — 여기 두면 `prevue status`를 읽는 에이전트에게는 안 간다.
import { $, store } from "./store.js";
import { phrase, daemonText } from "./strings.js";
import { connect, fetchProjectFiles } from "./api.js";
import { renderChoice, clearPick } from "./point.js";
import { clearTrees, applyReveal, cardAt, returnCard, cardStage, ringCard } from "./board.js";
import { renderFocus, renarrow, fitStage, focusImage, syncHistory, frameOf, morphIn, morphOut } from "./focus.js";
import { renderError, setStatus, flash } from "./capsule.js";
import { transition, transitioning } from "./motion.js";
const boardView = $("boardView"), focusView = $("focusView"), vacantView = $("vacantView"), vacantMsg = $("vacantMsg");


/*
 * 마우스로 누른 버튼은 포커스를 쥐지 않는다(D-63) — Chromium 은 누른 버튼에 포커스를 줘서, 다음 Enter(고른 카드 열기)를
 * 그 버튼이 가져갔다(도움말이 다시 열렸다). 레일의 줄 · 닫기 · 파일 열기도 같다. Safari 는 처음부터 주지 않는다. 키보드(Tab → Enter · Space)는 그대로다.
 * 빠른 열기 줄과 같은 수법이고, 글자를 고르는 자리(폴더 경로)는 버튼이 아니라 그대로 고를 수 있다.
 */
for (const host of [$("bar"), $("rail"), $("panel"), $("strip"), $("chooser")]) {
  host.addEventListener("mousedown", e => { if (e.button === 0 && e.target.closest("button, [role=button]")) e.preventDefault(); });
}

/**
 * 크기를 바꾸는 동안 툴바 알약을 그대로 둔다 — 새 크기의 스트림이 붙기 전까지 오는 상태(바쁨 · 옛 스트림)는 바뀌는 중의 것이다.
 * 알약은 React 의 StatusPill 이 그리고, 여기서는 그 상태를 그릴지만 정한다.
 */
let resizeStatus = null;
function statusHeld(s) {
  if (resizeStatus && !s.error && s.screen === "focus" && s.focus?.previewId === resizeStatus.id) {
    if (s.busy || !s.focus.streamUrl || (s.focus.streamUrl === resizeStatus.stream && s.focus.imageUrl === resizeStatus.image)) return true;
  }
  resizeStatus = null;
  return false;
}

/**
 * 보드 스크롤 자리 — 파일(탭)마다. 한 장에 갔다 오면 들어갔던 카드가 그 자리에 있어야 줄어드는 그림이 돌아갈 곳이 보이고,
 * 탭을 오가도 보던 자리가 남는다.
 */
const scrolls = new Map();
let boardFile = null, arrival = { wasBoard: false, arrive: false, file: null };

// 떠나는 보드의 자리는 무엇이든 그리기 전에 적는다 — React 가 먼저 레일을 접으면(--rail-w 0) 보드가 다시 흘러 scrollY 가 바뀐다.
function leaveBoard(s) {
  const wasBoard = !boardView.hidden;
  const file = s.board ? s.board.file : null;
  if (wasBoard && boardFile && (s.screen !== "board" || file !== boardFile)) scrolls.set(boardFile, scrollY);
  arrival = { wasBoard, arrive: s.screen === "board" && (!wasBoard || file !== boardFile), file };
  boardFile = file;
}

export function drawLegacy(s) {
  const { wasBoard, arrive, file } = arrival;
  // 보드(#boardView)는 React 의 PreviewBoard 가 이미 그렸다 — 그 효과가 먼저 돈다.
  // 빈 화면은 React 의 시작 화면이 갖는다 — 한 장의 틀을 보이면 src 없는 그림이 깨진 상자로 남았다. 팔레트도 React 가 이미 걷었다.
  focusView.hidden = s.screen !== "focus";
  vacantView.hidden = s.screen !== "vacant";
  vacantMsg.textContent = daemonText(s.vacant);
  renderFocus(s.screen === "focus" ? s.focus : null);
  syncHistory(s);
  renderError(daemonText(s.error));
  renderChoice(s.choice);
  fitStage();
  if (arrive) scrollTo(0, scrolls.get(file) || 0);
  else if (wasBoard && s.screen !== "board") scrollTo(0, 0);
  applyReveal();                             // 빠른 열기에서 고른 함수 — 되살린 스크롤 위에서 그 묶음으로 간다
}

let draw = s => drawLegacy(s);

const tabOf = st => { const t = (st.tabs || []).find(t => t.active); return t ? t.key : null; };
/** 옛 레일에서 본 방향 — 아래면 1. 새로 연 탭은 맨 아래에 붙고, 닫혀서 옮긴 것도 옛 레일의 자리로 견준다. */
function tabDir(prev, from, to) {
  const at = k => { const i = prev.tabs.findIndex(t => t.key === k); return i < 0 ? prev.tabs.length : i; };
  return Math.sign(at(to) - at(from));
}

/** 상태 하나를 그린다. 같은 version 이거나 옛것이면 버린다. 화면 전환 중에 온 것은 전환이 끝나면 마지막 것만 그린다. */
let held = false;
function apply(s) {
  if (store.st && s.version <= store.st.version) return;
  const prev = store.st;
  if (prev?.focus?.interactive && s.focus?.interactive && prev.focus.previewId === s.focus.previewId && JSON.stringify(prev.focus.size) !== JSON.stringify(s.focus.size)) {
    resizeStatus = { id: s.focus.previewId, stream: prev.focus.streamUrl, image: prev.focus.imageUrl };
  }
  store.st = s;
  if (transitioning()) { held = true; return; }
  const from = prev && prev.screen, to = s.screen;
  const tabMoved = prev && tabOf(prev) && tabOf(s) && tabOf(prev) !== tabOf(s);
  if (prev && (tabMoved || from !== to || (prev.board && s.board && prev.board.focus !== s.board.focus && to === "focus"))) clearPick();
  const release = () => { if (held) { held = false; draw(store.st); } };
  // 탭을 옮겼다 — 보드가 레일의 바탕이 미끄러지는 쪽(위 · 아래)으로 10px 밀리며 엇갈려 바뀐다. 화면 높이만큼의 슬라이드가 아니라 "그쪽으로 넘어갔다"는 암시다.
  // 위의 탭과 아래 내용이 같은 시간 · 이징으로 한 몸처럼 움직인다. 한 장에서 옮겨도 그 탭의 보드로 간다.
  if (tabMoved) {
    const root = document.documentElement;
    root.style.setProperty("--tab-dir", String(tabDir(prev, tabOf(prev), tabOf(s))));
    root.classList.add("vt-tab");
    transition(() => draw(store.st), release);
    setTimeout(() => root.classList.remove("vt-tab"), 500);
  }
  // 작업 공간 여닫기 — 카드 틀이 캔버스로 커지고 캔버스 틀이 카드로 줄어든다(focus.js 틀 모프). 그 카드가 화면 밖이면 페이드와 강조.
  else if (from === "board" && to === "focus") {
    const src = s.board ? frameOf(cardStage(cardAt(s.board.focus))) : null;
    transition(() => { draw(store.st); morphIn(src); }, release, { workspace: true });
  }
  else if (from === "focus" && to === "board") {
    let card = null;
    morphOut(() => draw(store.st), release, () => cardStage(card = store.st.screen === "board" ? returnCard(store.st.board.focus) : null), () => ringCard(card),
      () => store.st.screen === "board");
  }
  // 단건의 보기 ↔ 조작도 같은 틀 모프다 — 보기 캔버스와 조작 캔버스 사이를 옮긴다.
  else if (from === "focus" && to === "focus" && prev.focus?.interactive !== s.focus?.interactive) {
    if (prev.focus?.interactive) morphOut(() => draw(store.st), release, () => focusImage().parentElement, undefined,
      () => store.st.screen === "focus" && !store.st.focus?.interactive);
    else { const src = frameOf(focusImage().parentElement); transition(() => { draw(store.st); morphIn(src); }, release, { workspace: true }); }
  }
  else if (from === "focus" && to === "focus" && prev.board && s.board && prev.board.focus !== s.board.focus) transition(() => draw(store.st), release, { workspace: true });
  else draw(s);
}

// 색인은 거르기에만 쓴다. 데몬이 다시 뜨면 저장소가 바뀌었을 수 있고, 떠 있는 동안 파일이 생기거나 없어지면 데몬이 알린다.
// 겹친 요청은 마지막 것만 받는다 — 늦게 온 옛 응답이 새 색인을 덮지 않게.
let filesAsked = 0;
const loadProjectFiles = () => {
  const n = ++filesAsked;
  fetchProjectFiles().then(d => {
    if (n !== filesAsked) return;
    store.projectFiles = new Map(Object.entries(d.files || {})); clearTrees(); renarrow();
  }).catch(() => {});
};

// 끊겼다 다시 붙으면 이전 화면을 살리지 않고 페이지를 새로 연다 — 화면은 데몬 상태가 처음부터 그린다.
let lost = false;
let connection = () => {}, preparation = null;
const lostView = () => { preparation?.fail(phrase("prep.lost")); setStatus(phrase("status.lost"), "error"); connection("lost"); store.st = null; };

// 데몬이 다시 뜬다(warmup · 스스로 다시 띄움, D-112). 끊김이 아니라 다시 시작이다 — 보던 화면을 그대로 두고,
// 같은 자리에 뜬 새 데몬이 그림을 다 그리면 그때 새로 연다. 새 데몬은 상태 번호가 아니라 boot 로 알아본다 — 번호는 데몬마다 0부터 센다.
const RESTART_WAIT_MS = 60000;
let restarting = false, restartTimer = 0, reattachTimer = 0, boot = null;
const settled = s => !s.busy && !(s.board?.groups || []).some(g => g.cards.some(c => !c.rendered));
function restart() {
  restarting = true;
  connection("restarting");
  clearTimeout(restartTimer);
  restartTimer = setTimeout(lostView, RESTART_WAIT_MS);
}
function receive(s) {
  if (restarting) {
    if (s.boot === boot) return;
    // 새 데몬이 붙었다 — 다 그리면 새로 연다. 끝내 다 그리지 못해도 기다림은 한 번 더까지만, 그 뒤엔 그대로 연다
    if (!reattachTimer) { clearTimeout(restartTimer); reattachTimer = setTimeout(() => location.reload(), RESTART_WAIT_MS); }
    if (settled(s)) location.reload();
    return;
  }
  if (boot && s.boot !== boot) { location.reload(); return; }   // 숨어 있던 사이 데몬이 바뀌었다
  boot = s.boot;
  apply(s);
}

/**
 * render 는 상태와 알약을 그대로 둘지를 받는다. connection 은 데몬 상태 밖의 연결 사건(다시 시작 · 끊김)을 받는다.
 * previewFiles 는 빠른 열기의 목록이 바뀌었다는 데몬의 알림을 받는다.
 * prepared 는 준비 화면이 이어받은 요청이다 — 있으면 끊김을 그 화면의 실패로 알리고, 다시 시작 알림은 받지 않는다.
 */
export function startViewer(render, onConnection, onPreviewFiles, prepared = null) {
  draw = s => { leaveBoard(s); render(s, statusHeld(s)); };
  connection = onConnection;
  preparation = prepared;
  connect({
    open: () => { if (lost && !restarting) location.reload(); else if (!lost) loadProjectFiles(); },
    state: receive,
    ui: ev => {
      if (ev.kind === "flash") flash(daemonText(ev.text));
      else if (ev.kind === "previewFiles") onPreviewFiles();
      else if (ev.kind === "projectFiles") loadProjectFiles();
      else if (ev.kind === "restart" && !preparation) restart();
    },
    // 끊김은 오류다 — 시작 화면이 덮지 않는다(탭 0개와 가른다, D-63). 다시 시작 중이면 기다린다.
    error: () => { lost = true; if (!restarting) lostView(); },
  });
}
