import type { DeviceEntry } from "../../legacy/js/devices.js";
import { phrase } from "../runtime/strings";
import { BADGE_W, FRAME_TOP, Tw, Val, byId, faceOf, layersOf, panelOf, q, slAt, unitOf } from "./calc";
import { pick } from "./dock";
import { fit } from "./engine";
import type { Axis, Body, Face, Frame, Layers, Plain, Rig, SceneHooks, SceneImage, SceneTarget, Shadow, Side, Slider, Spin, St, Tr } from "./types";

export function createState(root: HTMLElement, hooks: SceneHooks) {
  // 시제품에서 확정한 기하와 곡선을 유지하고, 그림 도착은 실제 디코드가 알린다.
  const $ = <T extends Element = HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  let hingeLine = true;
  const ORIGINAL: Plain = { sel: "original", kind: "original", name: "@Preview", w: 411, h: 891, img: null };
  const PRESETS = [{ sel: "narrow", name: phrase("size.narrow"), w: 320, h: 640 }, { sel: "foldable", name: phrase("size.foldable"), w: 673, h: 841 }];
  let target = null as SceneTarget | null;
  const images = new Map<string, SceneImage>();
  let foldEaseKey = "";
let foldEaseFn = null as ((x: number) => number) | null;
  const clock = { t: 0 };
  const badge = { w: BADGE_W };
  let cur = null as St | null;
  let tr = null as Tr | null;
  let queued = null as string | null;
  const V = { w: new Val(), h: new Val(), s: new Val(), y: new Val(FRAME_TOP) };
  const O = { w: new Val(), h: new Val() };
  const outlineOp = new Tw(0);
const creaseOp = new Tw(0);
const rulerOp = new Tw(0);
const shellOp = new Tw(0);
const hingeOp = new Tw(1);
  const layer = layersOf(null);
  const unitOp = { a: new Tw(1), b: new Tw(0) };
  let fadeB = null as { f: Frame; st: St; layers: Layers } | null;
  const look: { a: Body | null; b: Body | null; t0: number; dur: number } = { a: null, b: null, t0: 0, dur: 460 };
  const rig = { on: false } as Rig;
  // 접기 장면의 두 판은 두께 있는 상자다(앞면 · 뒷면 · 옆면 띠). 원근은 .lift 한 겹에만 두고 그 아래는 preserve-3d 라
  // 판의 조상에 overflow · filter · mask · opacity 를 두지 않는다 — 두면 납작해진다. 흐림 · 자르기는 면 안에서만 한다.
  const rigEl = $("rig");
  const rigSpace = q(rigEl, ".space");
const rigBase = panelOf(q(rigEl, ".slab.base"));
const rigLeaf = panelOf(q(rigEl, ".slab.leaf"));
  const RG = { lift: q(rigEl, ".lift"), space: rigSpace, plate: q(rigEl, ".plate"), spine: q(rigEl, ".spine"),
    crease: q(rigEl, ".crease"), tTop: q(rigEl, ".r-top"), tBot: q(rigEl, ".r-bot"), base: rigBase, leaf: rigLeaf,
    btns: Array.from({ length: 5 }, () => { const el = document.createElement("div"); el.className = "btn"; rigSpace.append(el); return el; }),
    F: { inner: faceOf(rigLeaf.front.clip!), outer: faceOf(rigLeaf.back.clip!), base: faceOf(rigBase.front.clip!) } };
  // 겹 흐림(plate.blur) — 접히는 판의 화면에 힌지에서 먼 쪽일수록 더 흐린 그림 네 겹과 그늘을 덮는다. 면 안은 평평한 층이라 filter · mask 를 둬도 장면이 눌리지 않는다.
  // 겹은 화면 크기로 늘여지므로(stretch) 그림은 되돌린 겹(.unstretch) 안에 둬 화면 좌표 그대로 선다.
  for (const [side, f] of [[RG.leaf.front, RG.F.inner], [RG.leaf.back, RG.F.outer]] as [Side, Face][]) {
    f.blurs = Array.from({ length: 4 }, () => {
      const el = document.createElement("div"); el.className = "smear"; el.innerHTML = '<div class="unstretch"><img class="ly" alt=""></div>'; f.el.insertBefore(el, f.cam);
      return { el, inv: q(el, ".unstretch"), img: q<HTMLImageElement>(el, "img") };
    });
    f.dark = document.createElement("div"); f.dark.className = "smear"; f.el.insertBefore(f.dark, f.cam);
    side.fit.push(...f.blurs.map(b => b.el), f.dark);
  }
  RG.base.front.fit.push(RG.F.base.cast);
  // 접는 동안 크기가 바뀌는 그라디언트 층(광택 · 그늘 · 겹 흐림)은 첫 프레임의 크기로 한 번 그리고 그 뒤로는 scale 로만 늘인다 —
  // 크기가 바뀌면 층 전체를 다시 래스터해, 소프트웨어 래스터에서 접기 한 번에 수백 ms 가 들었다.
  // 면마다 그 면이 정면으로 보이는 끝(펼친 끝 · 접힌 끝)의 크기로 칠한다 — 그 끝 프레임에서 배율이 1이라 멈춘 몸체와 같은 그라디언트다.
  const stretchOf = new Map<HTMLElement, { w0: number; h0: number; k: [number, number] }>();
  let seeding = null as Set<HTMLElement> | null;
  const spin = { on: false } as Spin;
  let spinEaseKey = "";
let spinEaseFn = null as ((x: number) => number) | null;
  // 판은 접는 내내 한 배율(rig.sRef)로 배치하고 프레임마다의 배율은 .space 의 scale3d 로만 준다 — 배치 크기가 바뀌면 층을 모두 다시 래스터한다.
  // 화면 픽셀로 정한 굵기(단추 · 고리 · 눈금 · 접힌 자국)는 u 를 곱해 변환 뒤에도 같은 굵기로 남긴다.
  // 그림자는 멈춘 몸체(.shell)의 --elevation-2 를 그대로 쓰되, 장면이 돈 만큼 오프셋을 되돌리고 배율만큼 굵기를 되돌려 화면에서 같은 자리 · 크기로 드리운다.
  let elevationOf = null as Shadow[] | null;
  const UA = unitOf($("ua"));
const UB = unitOf($("ub"));
  const roll = { w: new Tw(411), h: new Tw(891) };
   // 조작 독은 장면 밖(무대 아래 가운데에 뜬다)에 선다 — $ 는 장면 안만 찾는다
  const PN = { el: byId("panel"), pick: byId("pnPick"), fold: byId("pnFold"), sum: byId("pnSum"), body: byId("pnBody") };
  const CTL = { el: byId("devCtl"), fold: byId("dcFold"), rot: byId("dcRot"), hinge: byId("dcHinge") };
  const ORIENT = { el: byId("dcOrientation"), menu: byId("dcOrientMenu") };
  const directions = [...ORIENT.menu.querySelectorAll<HTMLElement>("[data-orientation]")];
  const ROWS = [...PN.pick.querySelectorAll<HTMLElement>("[data-sel]")];
  // 크기 · 기기 메뉴(D-167) — 독의 버튼 위로 열린다. 그림을 가리는 층이라 고르면 닫는다. 방향키로 지나가는 동안(고르기만 한다)은
  // 열어 둔다. 바깥 누름도 닫는다. Esc 는 다른 떠 있는 층과 한 줄로 단축키의 EscapeLayers 가 closeMenu 로 닫는다.
  // 자세 · 슬라이더는 독 가운데(#devCtl · #pnSl)가 갖는다.
  const SUM = { sil: PN.sum.querySelector<HTMLElement>(".pn-sum-sil")!, nm: PN.sum.querySelector<HTMLElement>(".nm")!, dev: null as DeviceEntry | null };
  // 커스텀 칸은 눈금자 숫자로 가는 입구다 — 지금 크기 그대로 커스텀이 되고, 장면이 멈추면 폭 숫자에 커서가 간다.
  let focusW = false;
  const RL = { el: $("ruler"), ext: $<SVGPathElement>("rlExt"), dim: $<SVGPathElement>("rlDim"), w: $<HTMLInputElement>("rlW"), h: $<HTMLInputElement>("rlH"), shown: { w: "", h: "" } };
  let editing = false;
  const slEl = byId("pnSl");
const slAxes: Partial<Record<Axis, Slider>> = {};
  for (const box of slEl.querySelectorAll<HTMLElement>(".sl")) {
    const track = box.querySelector<HTMLElement>(".sl-track")!;
    slAxes[box.dataset.axis as Axis] = { track, thumb: box.querySelector<HTMLElement>(".thumb")!, fill: box.querySelector<HTMLElement>(".fill")!, val: box.querySelector<HTMLElement>(".v b")! };
    for (const t of track.querySelectorAll<HTMLElement>(".tick")) t.style.left = slAt(Number(t.dataset.v));
  }
  const SL = { el: slEl, w: slAxes.w!, h: slAxes.h! };
  let draft = null as { w: number; h: number } | null;
let dragging = null as Axis | null;
let slFocus = false;
let keyTimer = 0;
let slSent = null as string | null;
  let enabled = false;
let raf = 0;
let roomSize = "";
  return { root, hooks, hingeLine, ORIGINAL, PRESETS, target, images, foldEaseKey, foldEaseFn, clock, badge, cur, tr, queued, V, O, outlineOp, creaseOp, rulerOp, shellOp, hingeOp, layer, unitOp, fadeB, look, rig, rigEl, RG, stretchOf, seeding, spin, spinEaseKey, spinEaseFn, elevationOf, UA, UB, roll, PN, CTL, ORIENT, directions, ROWS, SUM, focusW, RL, editing, SL, draft, dragging, slFocus, keyTimer, slSent, enabled, raf, roomSize };
}

export type Scene = ReturnType<typeof createState>;
