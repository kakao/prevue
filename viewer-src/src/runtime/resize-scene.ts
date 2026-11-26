import { DEVICES } from "./devices";
import { P, springOf } from "../scene/calc";
import { dropDraft, installDock, menuOpen, orientationOpen, outside, paintPick, setOpen, setOrientationOpen } from "../scene/dock";
import { animate, fit, go, relayout, resolve, setFrame, snapTo, tick, wake } from "../scene/engine";
import { createState } from "../scene/state";
import type { ResizeScene, SceneHooks } from "../scene/types";

export type { Axis, DockView, ResizeScene, SceneDock, SceneHooks, SceneImage, SceneRect, SceneTarget } from "../scene/types";
export { DOCK_START, DP_MAX, DP_MIN, silhouette, slAt, stepOf } from "../scene/calc";
export { itemName } from "../scene/dock";

export function createResizeScene(root: HTMLElement, hooks: SceneHooks): ResizeScene {
  const S = createState(root, hooks);
  const dock = installDock(S);
  const onOutside = (e: PointerEvent) => outside(S, e);
  return {
    devices: new Set(Object.keys(DEVICES)),
    dock,
    setOriginal(w,h,img) {
      Object.assign(S.ORIGINAL,{w,h,img});
      if (S.target?.sel === "original") Object.assign(S.target,{w,h});
      if (S.cur) paintPick(S);
      if (S.cur?.sel === "original") {
        Object.assign(S.cur,{w,h});
        if (S.tr?.kind !== "fade") setFrame(S, fit(S, S.cur), performance.now(), S.tr ? springOf(P.frameDur, P.frameBounce) : null);
        S.roll.w.to(w, 420, performance.now()); S.roll.h.to(h, 420, performance.now());
        wake(S);
      }
    },
    image(sel,img) {
      S.images.set(sel,img);
      wake(S);
      if (S.cur?.sel === sel) {
        S.cur.img = img;
        if (S.tr?.to.sel === sel) {
          S.tr.to.img = img; S.tr.arriveAt = performance.now();
          if (S.tr.kind === "size" && S.tr.swapped) { if (S.layer.neu.r) S.layer.neu.r = img; else S.layer.old.r = img; }
        }
        else if (!S.tr) { S.layer.old.r = img; }
      }
    },
    update(st, instant = false) {
      S.target = st;
      if (S.draft && !S.dragging && !S.keyTimer && Math.round(st.w) === S.draft.w && Math.round(st.h) === S.draft.h) S.draft = null;
      if (!S.cur || instant) snapTo(S, st.sel); else go(S, st.sel);
      if (instant) { S.clock.t = performance.now(); tick(S); }
      if (S.enabled && !S.raf) S.raf = requestAnimationFrame((ts: number) => animate(S, ts));
    },
    enable(on) {
      S.enabled = on; S.root.hidden = !on;
      if (on) addEventListener("pointerdown", onOutside, true);
      if (!on) { S.dock.set({ posture: false }); setOpen(S, false); setOrientationOpen(S, false); removeEventListener("pointerdown", onOutside, true); }
      if (!on) S.roomSize = "";
      if (!on) { cancelAnimationFrame(S.raf); S.raf=0; S.images.clear(); S.cur=null; S.tr=null; S.queued=null; dropDraft(S); S.slFocus=false; }
      else if (!S.raf) S.raf=requestAnimationFrame((ts: number) => animate(S, ts));
    },
    relayout: (force?: boolean) => relayout(S, force),
    moving: () => !!S.tr || !!S.queued || S.rig.on || S.spin.on || !!S.draft,
    clearImages() { S.images.clear(); },
    closeMenu() {
      if (orientationOpen(S)) { setOrientationOpen(S, false); return true; }
      if (!menuOpen(S)) return false;
      setOpen(S, false); return true;
    },
    sizeOf(sel) { const st = resolve(S, sel); return st && { w: st.w, h: st.h }; },
  };
}
