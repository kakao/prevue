// 한 장 · 가리키기의 브라우저 쪽 표시 상태 — 데몬 상태가 아니라 뷰어가 재고 정한 것(배율 · 첫 장 대기 · 가리킨 카드).
// 정하는 쪽(focus.ts · resize.ts · point.ts)이 여기 쓰고 React 컴포넌트가 구독한다. Storybook 은 이 저장소에 값을 넣어 그린다.
import { createStore, type Store } from '../runtime/store';

export type { Store };

export type ZoomView = { pct: number; real: boolean; atFit: boolean; menu: boolean; disabled: boolean };
export const zoomView = createStore<ZoomView>({ pct: 100, real: false, atFit: true, menu: false, disabled: false });

export type LoadingView = { on: boolean; failed: boolean };
export const loadingView = createStore<LoadingView>({ on: false, failed: false });

export type PointNode = { name?: string | null; fileName: string; lineNumber: number; bounds: number[]; chain?: string[]; uchain?: string[]; origin?: 'compose' | 'project' | 'library' };
export type PointSay = { msg: string | null; ref?: string; copied?: boolean; file?: string; again?: () => void };

export type CardRow = { id: string; name: string };
export type CardTree = { ups: CardRow[]; here: CardRow; before: CardRow[]; after: CardRow[]; downs: CardRow[] };
export type CardModifier = { name: string; value?: string; color?: string; sizes?: Array<'width' | 'height'> };
export type CardBox = { width: number; height: number; unit: 'dp' | 'px'; padded: boolean };
export type CardPreview = { file: string; rel: string; fn: string };
export type CardOrigin = { module: string } | 'compose' | 'library' | null;
export type PointCardData = {
  node: PointNode; say: PointSay; box: CardBox; tree: CardTree | null; modifiers: CardModifier[] | null;
  previews: CardPreview[]; origin: CardOrigin;
};
export type PointView = { host: HTMLElement | null; shot: (() => DOMRect | null) | null; card: PointCardData | null };
export const pointView = createStore<PointView>({ host: null, shot: null, card: null });

export type InsetOverlayView = { on: boolean };
export const insetOverlayView = createStore<InsetOverlayView>({ on: false });
