import { useLayoutEffect, useState, type ReactNode } from 'react';
import '../legacy/style.css';
import '../legacy/resize.css';
import { createResizeScene } from '../legacy/js/resize-scene.js';
import type { Store } from '../src/workspace/view';
import { examples } from './examples';
import { pearlBoard } from './pearl';

// 한 장 스토리의 재료 — 계약 예제 focus(보드 위의 조작 한 장)와 pearl 보드의 실제 그림.
// 계약 예제의 그림 주소는 데몬의 것이라 무대에는 같은 자리(첫 카드)의 pearl 그림을 담는다.
export const focusExample = examples[1], choiceExample = examples[3];
export const pearlCard = pearlBoard.groups[0].cards[0];

/** 무대의 그림 — 뷰어에서는 focus.ts 가 src 를 갈아 끼우므로 JSX 가 갖지 않는다. 스토리도 그린 뒤에 담는다. */
export function useShot(url: string | null = pearlCard.imageUrl) {
  useLayoutEffect(() => {
    const shot = document.getElementById('shot') as HTMLImageElement | null;
    if (shot && url) shot.src = url;
  }, [url]);
}

/** 작업 공간의 본문 — 뷰어에서는 한 장에 들어오면 body.ws 가 붙는다. 조작 독을 세우는 스토리는 이 안에서 그린다. */
export function WorkspaceBody({ children }: { children: ReactNode }) {
  useLayoutEffect(() => { document.body.classList.add('ws'); return () => document.body.classList.remove('ws'); }, []);
  return <div className="story-panel">{children}</div>;
}

/** 브라우저 쪽 표시 상태(배율 · 첫 장 대기 · 가리킨 카드)를 스토리 동안만 넣고, 끝나면 처음 값으로 돌린다. */
export function WithView<T extends object>({ store, value, children }: { store: Store<T>; value: Partial<T>; children: ReactNode }) {
  // 첫 렌더에 한 번만 넣는다 — 자식이 붙기 전이라 구독자가 없다. 다시 그려도 뷰어 코드가 바꾼 값을 덮지 않는다.
  const [initial] = useState(() => { const before = store.get(); store.set(value); return before; });
  useLayoutEffect(() => () => store.set(initial), []);
  return <>{children}</>;
}

/**
 * 실제 장면 — 번들 밖의 resize-scene.js 를 페이지처럼 띄워 pearl 첫 카드를 원래 크기(@Preview)로 담는다.
 * 장면은 문서에서 조작 독(#panel · #pnPick · #devCtl)도 찾으므로 Workspace 를 통째로 그린 뒤에 부른다. 크기 · 기기 · 자세를 고르면 틀이 옮겨 간다 — 데몬이 없어 새 그림은 오지 않는다.
 */
export function useLiveScene() {
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
    return () => { scene.enable(false); document.body.classList.remove('resizing-ui'); };
  }, []);
}
