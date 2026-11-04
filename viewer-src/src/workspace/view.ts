// 한 장 · 가리키기의 브라우저 쪽 표시 상태 — 데몬 상태가 아니라 뷰어가 재고 정한 것(배율 · 첫 장 대기 · 꼬리표).
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

/** 가리킨 노드 — 꼬리표의 툴팁이 이름과 조상 사슬을 보인다. */
export type PointNode = { name?: string | null; fileName: string; lineNumber: number; bounds: number[]; chain?: string[]; uchain?: string[] };
/** 꼬리표의 말 — 멘션이 없으면 문장 한 줄, 있으면 `파일명:라인`과 복사 결과 · 다시 복사 · 탭으로 열기. */
export type TagSay = { msg: string | null; ref?: string; copied?: boolean; file?: string; again?: () => void };
/** 마지막으로 가리킨 꼬리표. tag 는 그 박스의 `.tag` 요소이고, 안은 PointOverlay 가 그린다. */
export type TagView = { tag: HTMLElement | null; node: PointNode | null; say: TagSay | null };
export const tagView = createStore<TagView>({ tag: null, node: null, say: null });
