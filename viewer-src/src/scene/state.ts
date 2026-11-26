import { phrase } from "../runtime/strings";
import { createStore } from "../runtime/store";
import { BADGE_W, CAM_MAX, DOCK_START, FRAME_TOP, Tw, Val, layersOf } from "./calc";
import type { Axis, Body, DockView, Face, Frame, Layers, Panel, Plain, Rig, SceneHooks, SceneImage, SceneTarget, Shadow, Side, Spin, St, Tr } from "./types";

const faceOf = (el: HTMLElement): Face => ({ el, cam: q(el, ".cam"), cams: camsIn(el), old: q<HTMLImageElement>(el, ".old"), veil: q(el, ".veil"), neu: q<HTMLImageElement>(el, ".neu"), cast: q(el, ".cast"), blurs: [], dark: null });
const sideOf = (el: HTMLElement): Side => {
  const gloss = document.createElement("div"), rim = document.createElement("div"), home = document.createElement("div");
  gloss.className = "gloss"; rim.className = "rim"; home.className = "home"; el.prepend(gloss, rim); el.append(home);
  return { body: el, gloss, home, clip: maybe(el, ".clip"), ring: maybe(el, ".ring"), lit: maybe(el, ".lit"), fit: [] };
};
const panelOf = (el: HTMLElement): Panel => ({ el, front: sideOf(q(el, ".front")), back: sideOf(q(el, ".rear")), strips: [] });
const unitOf = (el: HTMLElement) => ({ el, shell: q(el, ".shell"), btns: [...el.querySelectorAll<HTMLElement>(".btn")], cams: camsIn(el), home: q(el, ".home"), outline: q(el, ".outline"), stage: q(el, ".stage"), l0: q<HTMLImageElement>(el, ".l0"), l1: q<HTMLImageElement>(el, ".l1"), veil: q(el, ".veil"), crease: q(el, ".crease"), tTop: q(el, ".t-top"), tBot: q(el, ".t-bot") });
// 그릴 모양마다 .cam 하나 — 첫 .cam(마크업)을 기기 표의 가장 긴 목록만큼 복제해 둔다. 남는 것은 숨긴다.
const camsIn = (el: ParentNode) => {
  const first = el.querySelector<HTMLElement>(".cam")!, list = [first];
  while (list.length < CAM_MAX) { const c = first.cloneNode() as HTMLElement; list[list.length - 1].after(c); list.push(c); }
  return list;
};
const q = <T extends HTMLElement = HTMLElement>(root: ParentNode, s: string) => root.querySelector<T>(s)!;
const maybe = (root: ParentNode, s: string) => root.querySelector<HTMLElement>(s);
export type Unit = ReturnType<typeof unitOf>;

export function createState(root: HTMLElement, hooks: SceneHooks) {
  // 시제품에서 확정한 기하와 곡선을 유지하고, 그림 도착은 실제 디코드가 알린다.
  const $ = <T extends Element = HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const ORIGINAL: Plain = { sel: "original", kind: "original", name: "@Preview", w: 411, h: 891, img: null };
  const PRESETS = [{ sel: "narrow", name: phrase("size.narrow"), w: 320, h: 640 }, { sel: "foldable", name: phrase("size.foldable"), w: 673, h: 841 }];
  const images = new Map<string, SceneImage>();
  const clock = { t: 0 };
  const badge = { w: BADGE_W };
  const V = { w: new Val(), h: new Val(), s: new Val(), y: new Val(FRAME_TOP) };
  const O = { w: new Val(), h: new Val() };
  const outlineOp = new Tw(0);
  const creaseOp = new Tw(0);
  const rulerOp = new Tw(0);
  const shellOp = new Tw(0);
  const hingeOp = new Tw(1);
  const layer = layersOf(null);
  const unitOp = { a: new Tw(1), b: new Tw(0) };
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
  const spin = { on: false } as Spin;
  // 판은 접는 내내 한 배율(rig.sRef)로 배치하고 프레임마다의 배율은 .space 의 scale3d 로만 준다 — 배치 크기가 바뀌면 층을 모두 다시 래스터한다.
  // 화면 픽셀로 정한 굵기(단추 · 고리 · 눈금 · 접힌 자국)는 u 를 곱해 변환 뒤에도 같은 굵기로 남긴다.
  // 그림자는 멈춘 몸체(.shell)의 --elevation-2 를 그대로 쓰되, 장면이 돈 만큼 오프셋을 되돌리고 배율만큼 굵기를 되돌려 화면에서 같은 자리 · 크기로 드리운다.
  const UA = unitOf($("ua"));
  const UB = unitOf($("ub"));
  const roll = { w: new Tw(411), h: new Tw(891) };
  // 커스텀 칸은 눈금자 숫자로 가는 입구다 — 지금 크기 그대로 커스텀이 되고, 장면이 멈추면 폭 숫자에 커서가 간다.
  const RL = { el: $("ruler"), ext: $<SVGPathElement>("rlExt"), dim: $<SVGPathElement>("rlDim"), w: $<HTMLInputElement>("rlW"), h: $<HTMLInputElement>("rlH"), shown: { w: "", h: "" } };
  const dock = createStore<DockView>(DOCK_START);
  return {
    root,
    hooks,
    hingeLine: true,
    ORIGINAL,
    PRESETS,
    target: null as SceneTarget | null,
    images,
    foldEaseKey: "",
    foldEaseFn: null as ((x: number) => number) | null,
    clock,
    badge,
    cur: null as St | null,
    tr: null as Tr | null,
    queued: null as string | null,
    V,
    O,
    outlineOp,
    creaseOp,
    rulerOp,
    shellOp,
    hingeOp,
    layer,
    unitOp,
    fadeB: null as { f: Frame; st: St; layers: Layers } | null,
    look,
    rig,
    rigEl,
    RG,
    stretchOf,
    seeding: null as Set<HTMLElement> | null,
    spin,
    spinEaseKey: "",
    spinEaseFn: null as ((x: number) => number) | null,
    elevationOf: null as Shadow[] | null,
    UA,
    UB,
    roll,
    dock,
    focusW: false,
    RL,
    editing: false,
    draft: null as { w: number; h: number } | null,
    dragging: null as Axis | null,
    slFocus: false,
    keyTimer: 0,
    slSent: null as string | null,
    enabled: false,
    raf: 0,
    roomSize: "",
  };
}

export type Scene = ReturnType<typeof createState>;
