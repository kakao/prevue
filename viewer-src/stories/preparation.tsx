import { useEffect, useRef } from 'react';
import '../static/preparation.css';
import { useMessages } from '../src/messages';
import { mountScene } from '../src/preparation/scene';
import type { Card } from '../src/state';

export type SceneArgs = { phase?: 'project' | 'environment' | 'render'; failure?: string; drawn?: Card; file?: string };

export function SceneStory({ phase = 'environment', failure, drawn, file }: SceneArgs) {
  const messages = useMessages();
  const place = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const parent = place.current!;
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
