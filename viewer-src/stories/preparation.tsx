import { useEffect, useRef } from 'react';
import '../legacy/preparation.css';
import { useMessages } from '../src/messages';
import { mountScene } from '../src/preparation/scene';
import type { Card } from '../src/state';

// 준비 장면은 제 컨트롤러가 움직인다 — 스토리도 같은 컨트롤러를 띄워 단계 · 실패 · 다 그린 모습을 보인다.
// 단계 이름은 준비 서버의 phase 값이고, 실패 이유는 준비 서버가 내는 사전 키다. 다 그린 그림은 pearl 보드의 실제 PNG다.
export type SceneArgs = { phase?: 'project' | 'environment' | 'render'; failure?: string; drawn?: Card; file?: string };

export function SceneStory({ phase = 'environment', failure, drawn, file }: SceneArgs) {
  const messages = useMessages();
  const place = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const parent = place.current!;
    // 장면은 페이지(:root)의 테마를 따른다 — 툴바가 고른 테마를 그동안 페이지에 둔다.
    const root = document.documentElement, before = root.dataset.theme;
    const surface = parent.closest<HTMLElement>('[data-theme]');
    const follow = () => {
      const theme = surface?.dataset.theme;
      if (theme && theme !== 'system') root.dataset.theme = theme;
      else if (before === undefined) delete root.dataset.theme; else root.dataset.theme = before;
    };
    follow();
    const toolbar = new MutationObserver(follow);
    if (surface) toolbar.observe(surface, { attributes: true, attributeFilter: ['data-theme'] });
    // 장면은 마크업을 동기로 한 번 그린다 — Storybook 의 커밋 안(이 효과)에서는 그럴 수 없어 커밋이 끝난 뒤 띄운다.
    let scene: ReturnType<typeof mountScene> | null = null, gone = false;
    queueMicrotask(() => {
      if (gone) return;
      const shown = scene = mountScene(messages, { phase, file, started: Date.now() - 12000 }, parent);
      if (failure) shown.fail(failure);
      if (drawn?.imageUrl) {
        shown.image.src = drawn.imageUrl;
        shown.image.alt = drawn.title;
        shown.image.decode().then(() => { if (scene !== shown) return; shown.fit(drawn.widthDp || shown.image.naturalWidth, drawn.heightDp || shown.image.naturalHeight); shown.reveal(false); }, () => {});
      }
    });
    return () => {
      gone = true;
      toolbar.disconnect();
      scene?.destroy(); scene = null;
      if (before === undefined) delete root.dataset.theme; else root.dataset.theme = before;
    };
  }, [messages, phase, failure, drawn, file]);
  return <div ref={place} />;
}
