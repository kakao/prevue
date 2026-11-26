import { useLayoutEffect, useState, type ReactNode } from 'react';
import '../static/style.css';
import '../static/resize.css';
import { createResizeScene, DOCK_START, type DockView, type SceneDock } from '../src/runtime/resize-scene';
import { createStore } from '../src/runtime/store';
import type { Store } from '../src/workspace/view';
import { examples } from './examples';
import { pearlBoard } from './pearl';

// 한 장 스토리의 재료 — 계약 예제 focus(보드 위의 조작 한 장)와 pearl 보드의 실제 그림.
// 계약 예제의 그림 주소는 데몬의 것이라 무대에는 같은 자리(첫 카드)의 pearl 그림을 담는다.
export const focusExample = examples[1], choiceExample = examples[3];
export const pearlCard = pearlBoard.groups[0].cards[0];

export function useShot(url: string | null = pearlCard.imageUrl) {
  useLayoutEffect(() => {
    const shot = document.getElementById('shot') as HTMLImageElement | null;
    if (shot && url) shot.src = url;
  }, [url]);
}

export function WorkspaceBody({ children }: { children: ReactNode }) {
  useLayoutEffect(() => { document.body.classList.add('ws'); return () => document.body.classList.remove('ws'); }, []);
  return <div className="story-panel">{children}</div>;
}

export function WithView<T extends object>({ store, value, children }: { store: Store<T>; value: Partial<T>; children: ReactNode }) {
  // 첫 렌더에 한 번만 넣는다 — 자식이 붙기 전이라 구독자가 없다. 다시 그려도 뷰어 코드가 바꾼 값을 덮지 않는다.
  const [initial] = useState(() => { const before = store.get(); store.set(value); return before; });
  useLayoutEffect(() => () => store.set(initial), []);
  return <>{children}</>;
}

export function idleDock(view: Partial<DockView> = {}): SceneDock {
  const store = createStore<DockView>({ ...DOCK_START, ...view }), none = () => {};
  return { view: store, setMenu: menu => store.set({ menu }), setOrientMenu: orientMenu => store.set({ orientMenu }),
    pick: none, orient: none, fold: none, hinge: none, cancelRuler: none, grab: none, drag: none, release: none, step: none, sliderFocus: none, lock: none };
}

export function useLiveScene() {
  const [dock, setDock] = useState<SceneDock>();
  useLayoutEffect(() => {
    const root = document.getElementById('resizeScene'), stage = document.getElementById('stage');
    if (!root || !stage) return;
    // 뷰어에서는 조작이 켜지면 resize.ts 가 캔버스를 장면의 틀로 옮긴다. 스토리는 첫 장이 오지 않으므로 캔버스를 숨긴 채 장면만 보인다.
    document.body.classList.add('resizing-ui'); root.parentElement!.classList.add('resize-wrap'); stage.classList.add('resize-hidden');
    // 첫 장을 기다리는 동안처럼(await-live) 장면이 정지 그림을 기기 안에 담아 보인다.
    root.classList.add('await-live');
    // 데몬이 없으니 고른 크기 · 기기 · 자세를 그대로 돌려준다 — 틀 · 독의 메뉴 버튼 · 자세 버튼이 뷰어처럼 옮겨 간다(새 그림은 오지 않는다).
    const scene = createResizeScene(root, { request: sel => { const size = scene.sizeOf(sel); if (size) scene.update({ sel, ...size }); return Promise.resolve(true); }, layout() {} });
    const image = { url: pearlCard.imageUrl!, dpW: pearlCard.widthDp!, dpH: pearlCard.heightDp!, edge: 'var(--surface-container)' };
    scene.setOriginal(image.dpW, image.dpH, image);
    scene.image('original', image);
    scene.enable(true);
    scene.update({ sel: 'original', w: image.dpW, h: image.dpH }, true);
    setDock(scene.dock);
    return () => { scene.enable(false); document.body.classList.remove('resizing-ui'); };
  }, []);
  return dock;
}
