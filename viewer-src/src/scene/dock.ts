import { DEVICES } from "../../legacy/js/devices.js";
import { phrase } from "../runtime/strings";
import { DP_MAX, DP_MIN, SL_KEY_SETTLE, clamp, devSel, dims, itemOf, lookOf, openDims, silOf, slAt, stepOf } from "./calc";
import { fit, relayout, request, resolve, setFrame, setLook, wake } from "./engine";
import type { Scene } from "./state";
import type { Axis, Dev, St } from "./types";

export const orientationOpen = (S: Scene) => S.CTL.rot.getAttribute("aria-expanded") === "true";
export function setOrientationOpen(S: Scene, on: boolean, focus = true) {
  if (on) setOpen(S, false);
  if (!on && S.ORIENT.menu.contains(document.activeElement)) S.CTL.rot.focus({ preventScroll: true });
  S.CTL.rot.setAttribute("aria-expanded", String(on));
  S.ORIENT.menu.classList.toggle("on", on);
  S.ORIENT.menu.inert = !on;
  if (on && focus) (S.directions.find(b => b.getAttribute("aria-checked") === "true") || S.directions[0]).focus();
}
export const menuOpen = (S: Scene) => S.PN.sum.getAttribute("aria-expanded") === "true";
export function setOpen(S: Scene, on: boolean) {
  if (on) setOrientationOpen(S, false);
  if (!on && S.PN.body.contains(document.activeElement)) S.PN.sum.focus({ preventScroll: true });
  S.PN.sum.setAttribute("aria-expanded", String(on));
  S.PN.fold.classList.toggle("open", on);
  S.PN.body.inert = !on;
}
// 바깥 누름은 창에서 받는다 — 장면이 켜진 동안만 걸고 끌 때 뗀다(Storybook 은 스토리마다 장면을 새로 만든다).
export const outside = (S: Scene, e: PointerEvent) => {
  if (menuOpen(S) && !S.PN.fold.contains(e.target as Node)) setOpen(S, false);
  if (orientationOpen(S) && !S.ORIENT.el.contains(e.target as Node)) setOrientationOpen(S, false);
};
// 이름은 목록의 칸 이름 그대로다(기기는 짧은 이름). 치수 · 자세는 치수선과 자세 버튼이 말한다.
export function paintSum(S: Scene, key: string) {
  const here = S.cur!, dev = here.kind === "device" && key === here.dev ? DEVICES[key] : null, row = S.ROWS.find(b => b.dataset.sel === key)!;
  if (S.SUM.dev !== dev) { S.SUM.dev = dev; S.SUM.sil.innerHTML = dev ? silOf(dev) : ""; }
  S.SUM.nm.textContent = row.querySelector(".nm")!.textContent;
  S.PN.sum.classList.toggle("mono", row.classList.contains("mono"));
  S.PN.sum.title = `${dev ? dev.name : S.SUM.nm.textContent} · ${dims(here)}`;
}
// 방향키로 지나가는 것은 고르기만 한다 — 커서까지 옮기면 라디오 묶음에서 빠져나가 다음 칩에 못 간다.
export function pick(S: Scene, sel: string, byKey?: boolean) {
  S.focusW = false;
  dropDraft(S);
  // 슬라이더에 초점이 남으면 커스텀 칸이 고른 채로 남는다 — 숫자 입력처럼 놓고 간다
  S.slFocus = false;
  for (const el of [S.SL.w.thumb, S.SL.h.thumb]) if (document.activeElement === el) el.blur();
  // 숫자를 고치던 중이면 그 입력은 버린다 — 칩을 고르며 빠지는 blur 가 옛 숫자를 새 크기 위에 덧입혀 320×841 같은 커스텀이 됐다
  for (const el of [S.RL.w, S.RL.h]) if (document.activeElement === el) { el.dataset.cancel = "1"; el.blur(); }
  if (sel === "custom") {
    const w = clamp(Math.round(S.cur!.w), DP_MIN, DP_MAX), h = clamp(Math.round(S.cur!.h), DP_MIN, DP_MAX);
    if (S.cur!.kind !== "custom") request(S, `custom:${w}x${h}`);
    if (!byKey) { S.focusW = true; wake(S); }
    return;
  }
  if (DEVICES[sel]) return request(S, `${sel}:open`);
  request(S, sel);
}
export function paintBar(S: Scene, st: St, instant?: boolean) {
  const now = S.clock.t;
  if (instant) { S.roll.w.snap(st.w); S.roll.h.snap(st.h); } else { S.roll.w.to(st.w, 420, now); S.roll.h.to(st.h, 420, now); }
  if (st.kind === "device") {
    setLook(S, lookOf(st), instant);
    S.CTL.fold.hidden = S.CTL.hinge.hidden = !DEVICES[st.dev].fold;
    // 측정한 자세가 하나뿐인 화면(Flip8 커버)은 돌릴 곳이 없다.
    S.ORIENT.el.hidden = !!DEVICES[st.dev][st.folded ? "cover" : "open"]!.fixed;
    if (S.ORIENT.el.hidden) setOrientationOpen(S, false, false);
    // 버튼은 아이콘만이다 — 그림은 data-* 로 상태를 따라가고(style.css), 이름은 툴팁 · aria-label 이 갖는다.
    const foldName = st.folded ? phrase("posture.unfold") : phrase("posture.fold");
    S.CTL.fold.dataset.folded = String(st.folded);
    S.CTL.fold.title = foldName;
    S.CTL.fold.setAttribute("aria-label", foldName);
    const turn = phrase("posture.orientation.tip", { orientation: phrase(`posture.${st.orientation}`) });
    S.CTL.rot.dataset.orientation = st.orientation;
    S.CTL.rot.title = turn;
    S.CTL.rot.setAttribute("aria-label", turn);
    for (const button of S.directions) button.setAttribute("aria-checked", String(button.dataset.orientation === st.orientation));
  }
  paintPick(S);
}
// 고른 칸의 dp 는 지금 크기다 — 접거나 돌린 기기 · 커스텀은 그 크기를, 나머지 기기는 펼친 크기를 적는다.
export function paintPick(S: Scene) {
  const here = S.cur!, custom = S.editing || (S.slFocus && here.sel === S.slSent) || here.kind === "custom", key = custom ? "custom" : itemOf(here);
  for (const b of S.ROWS) {
    const sel = b.dataset.sel!, on = sel === key, d = DEVICES[sel];
    b.setAttribute("aria-checked", String(on));
    const preset = S.PRESETS.find(x => x.sel === sel);
    b.lastElementChild!.textContent = sel === "custom" ? (custom ? dims(here) : `${DP_MIN}–${DP_MAX}`) : sel === "original" ? dims(S.ORIGINAL)
      : preset ? dims(preset) : on ? dims(here) : openDims(d);
  }
  S.RL.el.classList.toggle("custom", custom);
  S.RL.el.classList.toggle("device", !custom && here.kind === "device");
  S.CTL.el.hidden = custom || here.kind !== "device";
  if (S.CTL.el.hidden) setOrientationOpen(S, false);
  S.SL.el.hidden = !custom;
  paintSum(S, key);
  paintSlider(S);
}
export function paintHinge(S: Scene) { S.CTL.hinge.setAttribute("aria-pressed", String(S.hingeLine)); S.CTL.hinge.title = S.hingeLine ? phrase("posture.hinge.hide") : phrase("posture.hinge.show"); }
export function toggleHinge(S: Scene) {
  const here = S.cur!;
  if (here.kind !== "device" || !DEVICES[here.dev].fold) return;
  S.hingeLine = !S.hingeLine; paintHinge(S);
  S.hingeOp.to(S.hingeLine ? 1 : 0, 200, performance.now());
  wake(S);
}
// 접고 펼 때는 손에 든 회전(기본 방향에서 돈 각도)을 잇는다. 다른 화면에 그 각도가 없으면(거꾸로 선 세로) 세로로 간다.
export const foldSel = (S: Scene, st: Dev) => ["portrait", "landscape-left", "landscape-right"].map(o => devSel(st, !st.folded, o))
  .find(sel => { const r = resolve(S, sel); return r?.kind === "device" && r.angle === st.angle; }) ?? devSel(st, !st.folded, "portrait");
export function toggleFold(S: Scene) { const here = S.cur!; if (here.kind === "device" && DEVICES[here.dev].fold) request(S, foldSel(S, here)); }
export function applyRuler(S: Scene, axis: Axis, raw: string) {
  const v = /^\d+$/.test(raw.trim()) ? Number(raw) : NaN;
  if (!(v > 0)) return;
  const n = clamp(v, DP_MIN, DP_MAX), w0 = Math.round(S.cur!.w), h0 = Math.round(S.cur!.h);
  const w = axis === "w" ? n : w0, h = axis === "h" ? n : h0;
  if (w === w0 && h === h0) return;
  S.roll[axis].snap(n);
  request(S, sizeSel(S, w, h));
}
export const sizeSel = (S: Scene, w: number, h: number) => S.PRESETS.find(x => x.w === w && x.h === h)?.sel || `custom:${w}x${h}`;
// 숫자를 고치기 시작하면 지금 크기 그대로 커스텀이 된다 — 기기를 고른 동안에도(D-99)
export function toCustom(S: Scene, typing = false) {
  if (S.editing) return;   // 누름(pointerdown)과 초점(focus)이 함께 와도 한 번만 보낸다
  if (S.cur!.kind !== "custom") {
    const w = clamp(Math.round(S.cur!.w), DP_MIN, DP_MAX), h = clamp(Math.round(S.cur!.h), DP_MIN, DP_MAX);
    request(S, `custom:${w}x${h}`);
    // 초점을 받은 칸은 틀이 갱신하지 않는다 — 한계를 넘는 기기(1691dp)는 잘린 값을 바로 보인다(치는 중에는 덮지 않는다)
    if (!typing) for (const [axis, el, v] of [["w", S.RL.w, w], ["h", S.RL.h, h]] as [Axis, HTMLInputElement, number][]) { el.value = String(v); S.RL.shown[axis] = String(v); }
  }
  S.editing = true; paintPick(S);
}
export const slOff = (S: Scene) => S.SL.el.classList.contains("off");
export const slValue = (S: Scene, axis: Axis) => S.draft ? S.draft[axis] : clamp(Math.round(S.cur![axis]), DP_MIN, DP_MAX);
export function paintSlider(S: Scene) {
  for (const axis of ["w", "h"] as Axis[]) {
    const s = S.SL[axis], v = slValue(S, axis), at = slAt(v);
    s.fill.style.width = at; s.thumb.style.left = at; s.val.textContent = String(v);
    s.thumb.setAttribute("aria-valuenow", String(v)); s.thumb.setAttribute("aria-valuetext", `${v}dp`);
  }
}
export function slide(S: Scene, axis: Axis, v: number) {
  const n = clamp(Math.round(v), DP_MIN, DP_MAX);
  S.draft = { w: slValue(S, "w"), h: slValue(S, "h"), [axis]: n };
  paintSlider(S); wake(S);
}
export function commit(S: Scene) {
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

export function installDock(S: Scene) {
  S.ORIENT.menu.addEventListener("click", e => {
    const button = (e.target as HTMLElement).closest<HTMLElement>("[data-orientation]");
    const here = S.cur!;
    if (!button || here.kind !== "device") return;
    request(S, devSel(here, here.folded, button.dataset.orientation!));
    setOrientationOpen(S, false);
  });
  S.ORIENT.menu.addEventListener("keydown", e => {
    if (e.key === "Tab") { setOrientationOpen(S, false); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation();
    const index = S.directions.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "Home" ? 0 : e.key === "End" ? S.directions.length - 1 : (index + (e.key === "ArrowUp" ? -1 : 1) + S.directions.length) % S.directions.length;
    S.directions[next].focus();
  });
  S.CTL.rot.addEventListener("keydown", e => {
    if (!["ArrowDown", "ArrowUp"].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation(); setOrientationOpen(S, true);
  });
  for (const b of S.ROWS) {
    const d = DEVICES[b.dataset.sel!];
    if (d) b.title = d.name;
    b.innerHTML = `${d ? silOf(d) : ""}<span class="nm">${d ? d.short : b.dataset.t ? phrase(b.dataset.t) : b.textContent}</span><span class="d"></span>`;
  }
  S.PN.sum.addEventListener("click", () => setOpen(S, !menuOpen(S)));
  S.PN.pick.addEventListener("click", e => {
    const b = (e.target as HTMLElement).closest<HTMLElement>("[data-sel]");
    if (!b) return;
    pick(S, b.dataset.sel!);
    setOpen(S, false);
  });
  S.CTL.fold.addEventListener("click", () => toggleFold(S));
  S.CTL.rot.addEventListener("click", () => setOrientationOpen(S, !orientationOpen(S)));
  S.CTL.hinge.addEventListener("click", () => toggleHinge(S));
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
  for (const axis of ["w", "h"] as Axis[]) {
    const { track, thumb } = S.SL[axis];
    const valueAt = (x: number) => { const r = track.getBoundingClientRect(); return DP_MIN + clamp((x - r.left) / r.width, 0, 1) * (DP_MAX - DP_MIN); };
    track.addEventListener("pointerdown", e => {
      if (e.button !== 0 || slOff(S) || !S.cur) return;
      e.preventDefault(); thumb.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
      track.setPointerCapture(e.pointerId); S.dragging = axis;
      slide(S, axis, valueAt(e.clientX));
    });
    track.addEventListener("pointermove", e => { if (S.dragging === axis && track.hasPointerCapture(e.pointerId)) slide(S, axis, valueAt(e.clientX)); });
    const release = () => { if (S.dragging !== axis) return; S.dragging = null; commit(S); };
    track.addEventListener("pointerup", release);
    track.addEventListener("lostpointercapture", release);
    thumb.addEventListener("keydown", e => {
      const step = stepOf(e), v = slValue(S, axis);
      const next = ({ ArrowRight: v + step, ArrowUp: v + step, ArrowLeft: v - step, ArrowDown: v - step, Home: DP_MIN, End: DP_MAX } as Record<string, number>)[e.key];
      if (next === undefined || slOff(S) || !S.cur) return;
      e.preventDefault(); e.stopPropagation();
      slide(S, axis, next);
      clearTimeout(S.keyTimer); S.keyTimer = window.setTimeout(() => commit(S), SL_KEY_SETTLE);
    });
    thumb.addEventListener("focus", () => { S.slFocus = true; });
    thumb.addEventListener("blur", e => {
      if (e.relatedTarget === S.SL.w.thumb || e.relatedTarget === S.SL.h.thumb) return;
      if (S.keyTimer) commit(S);
      S.slFocus = false;
      if (S.cur) paintPick(S);
    });
  }
  S.PN.pick.addEventListener("pointerdown", () => { const el = document.activeElement as HTMLElement | null; if (el === S.RL.w || el === S.RL.h) el.dataset.cancel = "1"; });
  // 칸은 위아래로 늘어선 한 묶음이다 — 방향키로 지나가는 것은 고르기만 한다(커서까지 옮기면 묶음에서 빠져나간다)
  S.PN.pick.addEventListener("keydown", e => {
    if (!S.ROWS.includes(e.target as HTMLElement) || !["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    e.preventDefault(); e.stopPropagation(); const i = S.ROWS.indexOf(e.target as HTMLElement);
    const n = e.key === "Home" ? 0 : e.key === "End" ? S.ROWS.length - 1 : (i + (e.key === "ArrowUp" ? -1 : 1) + S.ROWS.length) % S.ROWS.length;
    S.ROWS[n].focus(); pick(S, S.ROWS[n].dataset.sel!, true);
  });
  paintHinge(S);
  // 높이 자 배지의 폭이 바뀌면(글꼴 · 스타일) 양옆 비움이 달라진다 — 숨겨 폭이 0일 때는 지난 값을 둔다
  new ResizeObserver(() => { const w = S.RL.h.offsetWidth; if (w && w !== S.badge.w) { S.badge.w = w; relayout(S); } }).observe(S.RL.h, { box: "border-box" });
}
