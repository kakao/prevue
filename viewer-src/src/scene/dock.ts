import { DEVICES, DEVICE_MENU } from "../runtime/devices";
import { phrase } from "../runtime/strings";
import { DP_MAX, DP_MIN, SL_KEY_SETTLE, clamp, devSel, dims, itemOf, lookOf, openDims, stepOf } from "./calc";
import { fit, relayout, request, resolve, setFrame, setLook, wake } from "./engine";
import type { Scene } from "./state";
import type { Axis, Dev, SceneDock, St } from "./types";

const ROW_SELS = ["original", "narrow", "foldable", "custom", ...DEVICE_MENU.flatMap(g => g.ids)];
const ROW_NAMES: Record<string, string> = { original: "@Preview", narrow: "320×640", foldable: "673×841" };
export const itemName = (sel: string) => DEVICES[sel] ? DEVICES[sel].short : sel === "custom" ? phrase("size.custom") : ROW_NAMES[sel] ?? sel;

export const orientationOpen = (S: Scene) => S.dock.get().orientMenu;
export function setOrientationOpen(S: Scene, on: boolean) {
  if (on) setOpen(S, false);
  S.dock.set({ orientMenu: on });
}
export const menuOpen = (S: Scene) => S.dock.get().menu;
export function setOpen(S: Scene, on: boolean) {
  if (on) setOrientationOpen(S, false);
  S.dock.set({ menu: on });
}
export const outside = (S: Scene, e: PointerEvent) => {
  const at = e.target instanceof Element ? e.target : null;
  if (menuOpen(S) && !at?.closest("#pnFold")) setOpen(S, false);
  if (orientationOpen(S) && !at?.closest("#dcOrientation")) setOrientationOpen(S, false);
};
function paintSum(S: Scene, key: string) {
  S.dock.set({ sumTitle: `${DEVICES[key] ? DEVICES[key].name : itemName(key)} · ${dims(S.cur!)}` });
}
// 방향키로 지나가는 것은 고르기만 한다 — 커서까지 옮기면 라디오 묶음에서 빠져나가 다음 칩에 못 간다.
function pick(S: Scene, sel: string, byKey?: boolean) {
  S.focusW = false;
  dropDraft(S);
  // 슬라이더에 초점이 남으면 커스텀 칸이 고른 채로 남는다 — 숫자 입력처럼 놓고 간다
  S.slFocus = false;
  dropRuler(S);
  if (sel === "custom") {
    const w = clamp(Math.round(S.cur!.w), DP_MIN, DP_MAX), h = clamp(Math.round(S.cur!.h), DP_MIN, DP_MAX);
    if (S.cur!.kind !== "custom") request(S, `custom:${w}x${h}`);
    if (!byKey) { S.focusW = true; wake(S); }
    return;
  }
  if (DEVICES[sel]) return request(S, `${sel}:open`);
  request(S, sel);
}
function dropRuler(S: Scene) {
  for (const el of [S.RL.w, S.RL.h]) if (document.activeElement === el) { el.dataset.cancel = "1"; el.blur(); }
}
export function paintBar(S: Scene, st: St, instant?: boolean) {
  const now = S.clock.t;
  if (instant) { S.roll.w.snap(st.w); S.roll.h.snap(st.h); } else { S.roll.w.to(st.w, 420, now); S.roll.h.to(st.h, 420, now); }
  if (st.kind === "device") {
    setLook(S, lookOf(st), instant);
    const orientFixed = !!DEVICES[st.dev][st.folded ? "cover" : "open"]!.fixed;
    S.dock.set({ foldable: !!DEVICES[st.dev].fold, folded: st.folded, orientFixed, orientation: st.orientation });
    if (orientFixed) setOrientationOpen(S, false);
  }
  paintPick(S);
}
export function paintPick(S: Scene) {
  const here = S.cur!, custom = S.editing || (S.slFocus && here.sel === S.slSent) || here.kind === "custom", key = custom ? "custom" : itemOf(here);
  const rows: Record<string, string> = {};
  for (const sel of ROW_SELS) {
    const preset = S.PRESETS.find(x => x.sel === sel);
    rows[sel] = sel === "custom" ? (custom ? dims(here) : `${DP_MIN}–${DP_MAX}`) : sel === "original" ? dims(S.ORIGINAL)
      : preset ? dims(preset) : sel === key ? dims(here) : openDims(DEVICES[sel]);
  }
  const before = S.dock.get().rows, same = ROW_SELS.every(sel => before[sel] === rows[sel]);
  const posture = !custom && here.kind === "device";
  S.RL.el.classList.toggle("custom", custom);
  S.RL.el.classList.toggle("device", posture);
  S.dock.set({ checked: key, rows: same ? before : rows, posture, sliders: custom });
  if (!posture) setOrientationOpen(S, false);
  paintSum(S, key);
  paintSlider(S);
}
function toggleHinge(S: Scene) {
  const here = S.cur!;
  if (here.kind !== "device" || !DEVICES[here.dev].fold) return;
  S.hingeLine = !S.hingeLine; S.dock.set({ hinge: S.hingeLine });
  S.hingeOp.to(S.hingeLine ? 1 : 0, 200, performance.now());
  wake(S);
}
// 접고 펼 때는 손에 든 회전(기본 방향에서 돈 각도)을 잇는다. 다른 화면에 그 각도가 없으면(거꾸로 선 세로) 세로로 간다.
const foldSel = (S: Scene, st: Dev) => ["portrait", "landscape-left", "landscape-right"].map(o => devSel(st, !st.folded, o))
  .find(sel => { const r = resolve(S, sel); return r?.kind === "device" && r.angle === st.angle; }) ?? devSel(st, !st.folded, "portrait");
function toggleFold(S: Scene) { const here = S.cur!; if (here.kind === "device" && DEVICES[here.dev].fold) request(S, foldSel(S, here)); }
function applyRuler(S: Scene, axis: Axis, raw: string) {
  const v = /^\d+$/.test(raw.trim()) ? Number(raw) : NaN;
  if (!(v > 0)) return;
  const n = clamp(v, DP_MIN, DP_MAX), w0 = Math.round(S.cur!.w), h0 = Math.round(S.cur!.h);
  const w = axis === "w" ? n : w0, h = axis === "h" ? n : h0;
  if (w === w0 && h === h0) return;
  S.roll[axis].snap(n);
  request(S, sizeSel(S, w, h));
}
const sizeSel = (S: Scene, w: number, h: number) => S.PRESETS.find(x => x.w === w && x.h === h)?.sel || `custom:${w}x${h}`;
// 숫자를 고치기 시작하면 지금 크기 그대로 커스텀이 된다 — 기기를 고른 동안에도(D-99)
function toCustom(S: Scene, typing = false) {
  if (S.editing) return;   // 누름(pointerdown)과 초점(focus)이 함께 와도 한 번만 보낸다
  if (S.cur!.kind !== "custom") {
    const w = clamp(Math.round(S.cur!.w), DP_MIN, DP_MAX), h = clamp(Math.round(S.cur!.h), DP_MIN, DP_MAX);
    request(S, `custom:${w}x${h}`);
    // 초점을 받은 칸은 틀이 갱신하지 않는다 — 한계를 넘는 기기(1691dp)는 잘린 값을 바로 보인다(치는 중에는 덮지 않는다)
    if (!typing) for (const [axis, el, v] of [["w", S.RL.w, w], ["h", S.RL.h, h]] as [Axis, HTMLInputElement, number][]) { el.value = String(v); S.RL.shown[axis] = String(v); }
  }
  S.editing = true; paintPick(S);
}
const slValue = (S: Scene, axis: Axis) => S.draft ? S.draft[axis] : clamp(Math.round(S.cur![axis]), DP_MIN, DP_MAX);
function paintSlider(S: Scene) { S.dock.set({ slW: slValue(S, "w"), slH: slValue(S, "h") }); }
function slide(S: Scene, axis: Axis, v: number) {
  const n = clamp(Math.round(v), DP_MIN, DP_MAX);
  S.draft = { w: slValue(S, "w"), h: slValue(S, "h"), [axis]: n };
  paintSlider(S); wake(S);
}
function commit(S: Scene) {
  clearTimeout(S.keyTimer); S.keyTimer = 0;
  if (!S.draft || S.dragging) return;
  const { w, h } = S.draft;
  if (w === Math.round(S.cur!.w) && h === Math.round(S.cur!.h)) { dropDraft(S); return; }
  const sent = S.draft, sel = sizeSel(S, w, h);
  S.slSent = sel;
  request(S, sel).then(ok => { if (!ok && S.draft === sent) dropDraft(S); });
}
export function dropDraft(S: Scene) {
  clearTimeout(S.keyTimer); S.keyTimer = 0; S.dragging = null;
  if (!S.draft) return;
  S.draft = null;
  if (S.cur && !S.rig.on && !S.spin.on) setFrame(S, fit(S, S.cur));
  if (S.cur) { S.roll.w.snap(S.cur.w); S.roll.h.snap(S.cur.h); paintSlider(S); }
  wake(S);
}

export function installDock(S: Scene): SceneDock {
  for (const [axis, el] of [["w", S.RL.w], ["h", S.RL.h]] as [Axis, HTMLInputElement][]) {
    // 프리셋 · @Preview 는 초점만으로 커스텀이 된다. 기기는 누르거나 고칠 때만 — Tab 으로 지나가며 기기 몸체 · 자세를 잃지 않게
    el.addEventListener("focus", () => { el.select(); if (S.cur!.kind !== "device") toCustom(S); });
    el.addEventListener("pointerdown", () => toCustom(S));
    el.addEventListener("input", () => toCustom(S, true));
    el.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); el.blur(); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); el.dataset.cancel = "1"; el.blur(); }
      else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault(); toCustom(S);
        const d = (e.key === "ArrowUp" ? 1 : -1) * stepOf(e);
        el.value = String(clamp((parseInt(el.value, 10) || 0) + d, DP_MIN, DP_MAX));
      }
    });
    el.addEventListener("blur", e => {
      if (el.dataset.cancel) delete el.dataset.cancel;
      else applyRuler(S, axis, el.value);
      S.RL.shown[axis] = "";
      if (e.relatedTarget === S.RL.w || e.relatedTarget === S.RL.h) return;
      S.editing = false;
      paintPick(S);
      wake(S);
    });
  }
  // 높이 자 배지의 폭이 바뀌면(글꼴 · 스타일) 양옆 비움이 달라진다 — 숨겨 폭이 0일 때는 지난 값을 둔다
  new ResizeObserver(() => { const w = S.RL.h.offsetWidth; if (w && w !== S.badge.w) { S.badge.w = w; relayout(S); } }).observe(S.RL.h, { box: "border-box" });
  const live = () => !!S.cur && !S.dock.get().locked;
  return {
    view: S.dock,
    setMenu: on => setOpen(S, on),
    setOrientMenu: on => setOrientationOpen(S, on),
    pick: (sel, byKey) => { if (S.cur) pick(S, sel, byKey); },
    orient(orientation) {
      const here = S.cur;
      if (here?.kind === "device") request(S, devSel(here, here.folded, orientation));
      setOrientationOpen(S, false);
    },
    fold: () => { if (S.cur) toggleFold(S); },
    hinge: () => { if (S.cur) toggleHinge(S); },
    cancelRuler() { for (const el of [S.RL.w, S.RL.h]) if (document.activeElement === el) el.dataset.cancel = "1"; },
    grab(axis, v) { if (!live()) return; S.dragging = axis; slide(S, axis, v); },
    drag(axis, v) { if (S.dragging === axis) slide(S, axis, v); },
    release(axis) { if (S.dragging !== axis) return; S.dragging = null; commit(S); },
    step(axis, v) {
      if (!live()) return;
      slide(S, axis, v);
      clearTimeout(S.keyTimer); S.keyTimer = window.setTimeout(() => commit(S), SL_KEY_SETTLE);
    },
    sliderFocus(on) {
      if (on) { S.slFocus = true; return; }
      if (S.keyTimer) commit(S);
      S.slFocus = false;
      if (S.cur) paintPick(S);
    },
    lock(on) { S.dock.set({ locked: on }); if (on) dropDraft(S); },
  };
}
