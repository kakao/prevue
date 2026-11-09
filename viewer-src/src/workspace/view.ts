// 한 장 · 가리키기의 브라우저 쪽 표시 상태 — 데몬 상태가 아니라 뷰어가 재고 정한 것(배율 · 첫 장 대기 · 가리킨 카드).
// 정하는 쪽(focus.ts · resize.ts · point.ts)이 여기 쓰고 React 컴포넌트가 구독한다. Storybook 은 이 저장소에 값을 넣어 그린다.
export type Store<T> = { get(): T; set(next: Partial<T>): void; subscribe(listener: () => void): () => void };

export function createStore<T extends object>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next) {
      if ((Object.keys(next) as Array<keyof T>).every(key => value[key] === next[key])) return;
      value = { ...value, ...next };
      for (const listener of listeners) listener();
    },
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}

/** 확대 줄 — 배율 숫자는 실제 크기(1dp = 1 CSS px) 대비, 밀도를 모르면 맞춤 대비다. */
export type ZoomView = { pct: number; real: boolean; atFit: boolean; menu: boolean; disabled: boolean };
export const zoomView = createStore<ZoomView>({ pct: 100, real: false, atFit: true, menu: false, disabled: false });

/** 첫 장을 기다리는 자리 표시. failed 면 받지 못했다. */
export type LoadingView = { on: boolean; failed: boolean };
export const loadingView = createStore<LoadingView>({ on: false, failed: false });

/** 가리킨 노드 — 카드 머리의 이름과 툴팁의 조상 사슬. */
export type PointNode = { name?: string | null; fileName: string; lineNumber: number; bounds: number[]; chain?: string[]; uchain?: string[] };
/** 가리킨 결과의 말 — 멘션이 없으면 문장 한 줄, 있으면 멘션과 복사 결과 · 다시 복사(again). file 은 멘션의 풀패스다. */
export type PointSay = { msg: string | null; ref?: string; copied?: boolean; file?: string; again?: () => void };

/** 카드 트리의 줄 — id 는 같은 트리 안에서 다시 가리켜도 변하지 않는다(트리 순서). 줄은 이름만이다. */
export type CardRow = { id: string; name: string };
/** 트리 — 조상 전체, 가리킨 노드와 그 앞뒤 형제, 가리킨 노드의 직계 자식. */
export type CardTree = { ups: CardRow[]; here: CardRow; before: CardRow[]; after: CardRow[]; downs: CardRow[] };
/** modifier 체인의 한 칸 — 적용 순서대로다. value 는 보일 모양 그대로, color 는 견본(CSS 색), sizes 는 이 칸이 정한 축. 데몬이 읽어 싣는다. */
export type CardModifier = { name: string; value?: string; color?: string; sizes?: Array<'width' | 'height'> };
/** 노드의 크기 — unit 이 dp 면 밀도를 알아 나눈 값, px 면 그린 그림의 화소다. padded 면 여백 modifier 가 있다. */
export type CardBox = { width: number; height: number; unit: 'dp' | 'px'; padded: boolean };
/** 가리킨 노드를 부르는 Preview — 지금 보는 것은 뺀다. */
export type CardPreview = { file: string; rel: string; fn: string };
/** 출처 — 프로젝트 컴포저블이면 정의 모듈, Compose 기본이면 'compose', 색인이 없으면 null. */
export type CardOrigin = { module: string } | 'compose' | null;
/** 카드 하나의 내용. tree · modifiers 가 null 이면 그 칸을 숨긴다. */
export type PointCardData = {
  node: PointNode; say: PointSay; box: CardBox; tree: CardTree | null; modifiers: CardModifier[] | null;
  previews: CardPreview[]; origin: CardOrigin; repo: string | null;
};
/** 떠 있는 카드 — host 는 카드가 서는 영역(보드 · 한 장), shot 은 가리킨 그림의 화면 사각형을 잰다. */
export type PointView = { host: HTMLElement | null; shot: (() => DOMRect | null) | null; card: PointCardData | null };
export const pointView = createStore<PointView>({ host: null, shot: null, card: null });
