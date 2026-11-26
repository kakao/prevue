import { useLayoutEffect, useState, type ReactNode } from 'react';
import '../static/style.css';
import '../static/resize.css';
import { createResizeScene, DOCK_START, type DockView, type SceneDock } from '../src/runtime/resize-scene';
import { createStore } from '../src/runtime/store';
import type { Store } from '../src/workspace/view';
import { examples } from './examples';
import { pearlBoard } from './pearl';

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
    document.body.classList.add('resizing-ui'); root.parentElement!.classList.add('resize-wrap'); stage.classList.add('resize-hidden');
    root.classList.add('await-live');
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
