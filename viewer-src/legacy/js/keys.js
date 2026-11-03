// 단축키 — 표 하나가 디스패치와 `?` 도움말을 함께 갖는다. 같은 키가 화면마다 다른 일을 하므로 화면을 먼저 본다.
import { $, store } from "./store.js";
import { phrase } from "./strings.js";
import { post } from "./api.js";
import { moveCursor, openCursor } from "./board.js";
import { openQuickOpen } from "./quickopen.js";
import { closeDirPop } from "./header.js";
import { exitFocus, toggleInteractive, zoomIn, zoomOut, zoomFit, closeZoomMenu } from "./focus.js";
import { stepTab, jumpTab, tabCount } from "./tabs.js";

const help = $("help"), helpBtn = $("helpBtn");
// 끊겼으면 화면이 없다 — 탭이 0개인 빈 화면(시작 화면)과 가른다(D-63). 끊김은 오류로 남고 단축키가 시작 화면으로 가지 않는다.
const screen = () => (store.st ? store.st.screen : "offline");
const fromBoard = () => !!(store.st && store.st.focus && store.st.focus.fromBoard);

/*
 * keys 는 KeyboardEvent.key, cap 은 도움말에 그릴 키캡. run 이 없는 줄은 마우스 동작이라 도움말에만 있다.
 * when 이 false 면 그 화면에서 그 키는 아무 일도 하지 않는다 — 다음 줄로 넘어가지 않는다.
 */
const TABLE = [
  { group: phrase("keys.group.board"), rows: [
    { keys: ["ArrowLeft", "ArrowRight"], cap: ["←", "→"], label: phrase("keys.card.pick"), when: () => screen() === "board",
      run: e => moveCursor(e.key === "ArrowLeft" ? -1 : 1) },
    { keys: ["Enter", "i"], cap: ["↩", "I"], label: phrase("keys.card.open"), when: () => screen() === "board", run: openCursor },
  ] },
  { group: phrase("keys.group.single"), rows: [
    // ← → 는 비워 둔다 — 이웃 장으로 넘기지 않는다(W3). 나오면 그 카드에 커서가 있어 → ↩ 로 이웃에 든다.
    { keys: ["Escape"], cap: ["esc"], label: phrase("keys.single.back"), when: () => screen() === "focus" && fromBoard(), run: exitFocus },
    { keys: ["i"], cap: ["I"], label: phrase("keys.single.mode"), when: () => screen() === "focus", run: toggleInteractive },
    { keys: ["+", "-"], cap: ["+", "−"], label: phrase("keys.single.zoom"), when: () => screen() === "focus",
      run: e => (keyOf(e) === "+" ? zoomIn : zoomOut)() },
    { keys: ["0"], cap: ["0"], label: phrase("keys.single.fit"), when: () => screen() === "focus", run: zoomFit },
    { cap: [phrase("keys.cap.twoFingers"), phrase("keys.cap.scroll")], label: phrase("keys.single.scroll") },
    { cap: ["Space", phrase("keys.cap.drag")], combo: true, label: phrase("keys.single.pan") },
    { cap: ["⌥", phrase("keys.cap.click")], combo: true, label: phrase("keys.single.point") },
  ] },
  // 열린 파일이 둘 이상일 때만. 카드 이동(← →)에 Shift 를 더한 "한 단계 큰 이동"이다 — ⌘1~9 · ⌃Tab 은 브라우저가 가져간다. 키로는 닫지 않는다.
  { group: phrase("keys.group.tabs"), rows: [
    { keys: ["⇧ArrowLeft", "⇧ArrowRight"], cap: ["⇧←", "⇧→"], label: phrase("keys.tabs.step"), when: () => tabCount() > 1,
      run: e => stepTab(e.key === "ArrowLeft" ? -1 : 1) },
    { keys: ["1", "2", "3", "4", "5", "6", "7", "8", "9"], cap: ["1", "…", "9"], label: phrase("keys.tabs.jump"), when: () => tabCount() > 1,
      run: e => jumpTab(Number(keyOf(e))) },
    { cap: ["×"], label: phrase("keys.tabs.close") },
  ] },
  { group: phrase("keys.group.anywhere"), rows: [
    // 파일을 여는 것은 화면과 무관하다 — 보드에서도 작업 공간에서도 같은 패널이다(D-56).
    // 시작 화면(탭 0개)이면 본문의 필드로 간다(D-63).
    { keys: ["/"], cap: ["/", "⌘K"], label: phrase("keys.any.open"), when: () => screen() !== "offline", run: () => openQuickOpen(document.activeElement) },
    { cap: [phrase("keys.cap.click")], label: phrase("keys.any.point") },
    { keys: ["?"], cap: ["?"], label: phrase("keys.any.help"), when: () => true, run: () => toggleHelp(!helpOpen, true) },
  ] },
];

/** 입력 중이면 단축키는 죽는다 — 검색창에 `i`를 치면 글자가 들어가야 한다. */
function typing(t) { return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); }

/** 한글 입력 상태면 `i`가 `ㅑ`로 온다. 글자 키는 물리 키(code)로 읽는다. */
function keyOf(e) {
  if (e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) return "⇧" + e.key;
  if (/^Digit[1-9]$/.test(e.code) && !e.shiftKey) return e.code.slice(5);
  if (e.code === "KeyI") return "i";
  if (e.code === "Slash" && e.shiftKey) return "?";
  if (e.code === "Equal") return "+";        // = 와 + 를 가리지 않는다(Shift 를 누르든 말든)
  if (e.code === "Minus") return "-";
  if (e.code === "Digit0") return "0";
  return e.key;
}

addEventListener("keydown", e => {
  // ⌘K(Ctrl+K) — 웹 앱 검색의 관용 키. 브라우저의 주소창 검색보다 먼저 받는다. ⌘P(인쇄)는 잡지 않는다.
  if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.code === "KeyK" && screen() !== "offline") { e.preventDefault(); openQuickOpen(document.activeElement); return; }
  if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return;
  const key = keyOf(e);
  // 버튼의 Enter 는 그 버튼이 받는다 — 키보드로 간 버튼(:focus-visible)만. 마우스로 누른 뒤 남은 포커스가 고른 카드 열기를 가져가면 안 된다(D-63).
  const btn = key === "Enter" && e.target.closest && e.target.closest("button, [role=button]");
  if (btn && btn.matches(":focus-visible")) return;
  // 떠 있는 층이 먼저 Esc 를 먹는다 — 도움말, 그다음 후보 고르기.
  if (key === "Escape" && helpOpen) { e.preventDefault(); toggleHelp(false); return; }
  if (key === "Escape" && $("chooser").classList.contains("on")) { e.preventDefault(); post("/viewer/cancel"); return; }
  if (key === "Escape" && closeZoomMenu()) { e.preventDefault(); return; }
  if (key === "Escape" && closeDirPop()) { e.preventDefault(); return; }
  if (helpOpen && key !== "?") return;
  for (const g of TABLE) for (const r of g.rows) {
    if (!r.run || !r.keys.includes(key) || !r.when()) continue;
    e.preventDefault();
    r.run(e);
    return;
  }
});

/* ---------- 도움말 ---------- */
function buildHelp() {
  const card = help.querySelector(".sheet-body");
  for (const g of TABLE) {
    const h = document.createElement("h3"); h.textContent = g.group;
    const dl = document.createElement("dl");
    for (const r of g.rows) {
      const dt = document.createElement("dt");
      // 같이 누르는 키는 + 로 잇고, 둘 중 하나인 키는 나란히 둔다.
      r.cap.forEach((c, i) => {
        if (i && r.combo) { const p = document.createElement("span"); p.className = "plus"; p.textContent = "+"; dt.append(p); }
        const k = document.createElement("kbd"); k.textContent = c; dt.append(k);
      });
      const dd = document.createElement("dd"); dd.textContent = r.label;
      dl.append(dt, dd);
    }
    card.append(h, dl);
  }
}
buildHelp();

// 열림은 이 값 하나가 정한다. hidden · .on 은 전환 때문에 늦게 바뀌어(뒤에 있는 탭은 타이머가 더 늦다) 판정에 쓰지 않는다.
let lastFocus = null, helpOpen = false;
/**
 * byKey 면 키보드로 연 것이라 닫을 때 연 자리로 포커스를 돌려준다. 마우스로 열었으면 돌려주지 않는다 —
 * 돌려주면 `?` 버튼이 포커스를 쥐고, 다음 Enter(고른 카드 열기)가 도움말을 다시 열었다(D-63).
 */
export function toggleHelp(on = !helpOpen, byKey = false) {
  if (on && !helpOpen) lastFocus = byKey && document.activeElement !== document.body ? document.activeElement : null;
  helpOpen = on;
  if (on) {
    help.hidden = false;
    requestAnimationFrame(() => { if (helpOpen) { help.classList.add("on"); help.querySelector(".sheet").focus({ preventScroll: true }); } });
  } else {
    help.classList.remove("on");
    // 사라지는 전환이 끝난 뒤 뺀다 — hidden 을 바로 걸면 페이드가 없다.
    setTimeout(() => { if (!helpOpen) help.hidden = true; }, 220);
    if (help.contains(document.activeElement)) document.activeElement.blur();
    if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
  }
  helpBtn.setAttribute("aria-expanded", String(on));
}
// e.detail 이 0 이면 키보드로 누른 것이다(Enter · Space).
helpBtn.addEventListener("click", e => toggleHelp(!helpOpen, e.detail === 0));
help.addEventListener("click", e => { if (e.target === help) toggleHelp(false); });
