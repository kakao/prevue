// 장면 본체는 손으로 고치는 plugin/viewer/js/resize-scene.js 다 — 번들 밖에서 같은 주소로 서빙하고(접기 하네스가 직접 import 한다) 타입만 여기 둔다.
export type SceneRect = { cx: number; y: number; w: number; h: number; s: number; radius: [number, number, number, number]; bezel: number };
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
  sliderOff(on: boolean): void;
  /** force 면 창 크기가 그대로여도 다시 맞춘다(오버레이 켬 · 끔처럼 자리가 달라질 때). */
  relayout(force?: boolean): void;
  moving(): boolean;
};
export function createResizeScene(root: HTMLElement, hooks: {
  request(sel: string): Promise<boolean>;
  layout(rect: SceneRect, moving: boolean): void;
  /** 인셋 영역 보기가 켜졌는지 — 켜졌을 때만 배지가 설 자리를 비운다. */
  insetOn?(): boolean;
}): ResizeScene;
