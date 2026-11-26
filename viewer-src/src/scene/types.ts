import type { DeviceBody, DeviceEntry } from "../../legacy/js/devices.js";
import type { Store } from "../runtime/store";
import { Tw } from "./calc";

export type SceneRect = { cx: number; y: number; w: number; h: number; s: number; radius: Radii; bezel: number };
export type SceneImage = { url: string; dpW: number; dpH: number; edge: string };
export type SceneTarget = { sel: string; w: number; h: number };
export type ResizeScene = {
  devices: Set<string>;
  setOriginal(w: number, h: number, img: SceneImage | null): void;
  image(sel: string, img: SceneImage): void;
  update(target: SceneTarget, instant?: boolean): void;
  enable(on: boolean): void;
  clearImages(): void;
  /** 크기 · 기기 메뉴가 열려 있었으면 닫고 true. */
  closeMenu(): boolean;
  sizeOf(sel: string): { w: number; h: number } | null;
  dock: SceneDock;
  /** force 면 창 크기가 그대로여도 다시 맞춘다(오버레이 켬 · 끔처럼 자리가 달라질 때). */
  relayout(force?: boolean): void;
  moving(): boolean;
};
export type DockView = {
  menu: boolean; orientMenu: boolean; locked: boolean;
  checked: string; rows: Readonly<Record<string, string>>;
  sumTitle: string;
  posture: boolean; sliders: boolean;
  foldable: boolean; folded: boolean; orientFixed: boolean; orientation: Orientation; hinge: boolean;
  slW: number; slH: number;
};
export type SceneDock = {
  view: Pick<Store<DockView>, "get" | "subscribe">;
  setMenu(open: boolean): void;
  setOrientMenu(open: boolean): void;
  pick(sel: string, byKey?: boolean): void;
  orient(orientation: string): void;
  fold(): void;
  hinge(): void;
  cancelRuler(): void;
  grab(axis: Axis, v: number): void;
  drag(axis: Axis, v: number): void;
  release(axis: Axis): void;
  step(axis: Axis, v: number): void;
  sliderFocus(on: boolean): void;
  lock(on: boolean): void;
};
export type SceneHooks = {
  request(sel: string): Promise<boolean>;
  layout(rect: SceneRect, moving: boolean): void;
  /** 인셋 영역 보기가 켜졌는지 — 켜졌을 때만 배지가 설 자리를 비운다. */
  insetOn?(): boolean;
  /** 몸체 아래 줄(왼쪽 · 오른쪽 변의 컷아웃 아닌 종류)에 배지가 서는지 — 설 때만 조작 독 위로 자리를 비운다. */
  insetBelow?(): boolean;
};
export type Radii = [number, number, number, number];
export type Shape = { w: number; h: number; y: number; x?: number; notch?: number; rad?: number; flat?: number; edge?: "right" | "bottom"; lens?: true };
type Btn = { side: number; at: number; len: number };
export type Body = { tone: string; bezel: number; ends?: number; home?: boolean | number; radius: Radii; cams: Shape[]; btn: Btn[] };
export type Box = { left: number; top: number; width: number; height: number; corners: string; on: boolean; lens: number };
export type Orientation = "portrait" | "landscape-left" | "landscape-right";
export type Plain = { sel: string; kind: "original" | "preset" | "custom"; name: string; w: number; h: number; img: SceneImage | null; rot?: undefined; mirrored?: undefined };
export type Dev = { sel: string; kind: "device"; dev: string; folded: boolean; rot: boolean; right: boolean; orientation: Orientation; angle: number; mirrored: boolean; name: string; short: string; w: number; h: number; hinge?: number; img: SceneImage | null };
export type St = Plain | Dev;
export type Frame = { s: number; w: number; h: number; cx: number; y: number };
export type Spring = { w0: number; z: number };
type Layer = { r: SceneImage | null; held: boolean; grow: Tw; blur: Tw; veil: Tw; op: Tw };
type TrBase = { from: St; to: St; t0: number; arriveAt: number; arrived: boolean };
export type SizeTr = TrBase & { kind: "size"; cached: boolean; swapped: boolean; deepAt: number; grow: boolean; f0: { w: number; h: number }; f1: Frame };
export type Tr = SizeTr | (TrBase & { kind: "fade" | "spin" | "fold" | "unfold"; cached?: undefined; deepAt?: undefined });
export type Plan = { role: "crisp" | "hold"; du: number; neu?: true; frame?: { w: number; h: number } };
export type Rig = { on: boolean; turn: number; q: number; z: number; t0: number; dur: number; dir: "fold" | "unfold"; d: FoldDevice; restBlur: number; oldSpec: SceneImage;
  from: Dev; to: Dev; f0: Frame; f1: Frame; cached: boolean; s0: number; s1: number; sRef: number; half: { u: number; v: number }; cover: { u: number; v: number };
  hx0: number; hx1: number; plan: { inner: Plan; base: Plan; outer: Plan }; dip: (e: number) => number };
export type FoldDevice = DeviceEntry & { plate: NonNullable<DeviceEntry["plate"]>; cover: NonNullable<DeviceEntry["cover"]>; look: { open: DeviceBody; cover: DeviceBody } };
export type Side = { body: HTMLElement; gloss: HTMLElement; home: HTMLElement; clip: HTMLElement | null; ring: HTMLElement | null; lit: HTMLElement | null; fit: HTMLElement[] };
type Smear = { el: HTMLElement; inv: HTMLElement; img: HTMLImageElement };
export type Face = { el: HTMLElement; cam: HTMLElement; cams: HTMLElement[]; old: HTMLImageElement; veil: HTMLElement; neu: HTMLImageElement; cast: HTMLElement; blurs: Smear[]; dark: HTMLElement | null };
export type Panel = { el: HTMLElement; front: Side; back: Side; strips: HTMLElement[] };
export type PanelSpec = { body: number[]; span: number[]; bodyR: number[]; scr: number[]; scrR: number[]; backScrR?: number[]; T: number; normal: (v: number[]) => number[]; tone: number[]; hk: number; hingeLeft: boolean; u: number };
export type Axis = "w" | "h";
export type Shadow = [number, number, number, number, string];
export type Outline = { w: number; h: number; op: number; crease: number; shell: number; rot: boolean; mirrored: boolean; tall: boolean; look: Body };
export type Spin = { on: boolean; t0: number; dur: number; from: Dev; to: Dev; f0: Frame; f1: Frame; dir: number; cached: boolean };
export type Layers = { old: Layer; neu: { r: SceneImage | null; op: Tw; blur: Tw }; swap: { t0: number; dur: number } | null };
