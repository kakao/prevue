import type { Message } from '../state';

export type CardImage = { url: string; w: number; h: number; at?: number };
export type CardAnswer = { ok: boolean; sheets: number; image: CardImage | null; failure: Message | null };
export type CardView =
  | { status: 'idle' | 'wait' | 'loading' }
  | { status: 'done'; sheets: number; image: CardImage }
  | { status: 'error'; sheets: number; failure: Message | null };

const IDLE: CardView = { status: 'idle' };

export type CardQueue = ReturnType<typeof createCardQueue>;

export function createCardQueue(ask: (path: string) => Promise<CardAnswer | null>, limit = 1) {
  const views = new Map<string, CardView>();
  const waiting = new Map<string, { path: string; order: number }>();
  const listeners = new Set<() => void>();
  const retried = new Set<string>();
  let running = 0, paused = false;

  const set = (key: string, view: CardView) => { views.set(key, view); for (const l of listeners) l(); };

  function pump() {
    while (!paused && running < limit && waiting.size) {
      let next: [string, { path: string; order: number }] | null = null;
      for (const entry of waiting) if (!next || entry[1].order < next[1].order) next = entry;
      const [key, { path }] = next!;
      waiting.delete(key);
      running++;
      set(key, { status: 'loading' });
      ask(path).then(
        a => set(key, a?.ok && a.image ? { status: 'done', sheets: a.sheets, image: a.image } : { status: 'error', sheets: a?.sheets ?? 0, failure: a?.failure ?? null }),
        () => set(key, { status: 'error', sheets: 0, failure: null }),
      ).finally(() => { running--; pump(); });
    }
  }

  function want(key: string, path: string, order: number) {
    const v = views.get(key)?.status ?? 'idle';
    if (v !== 'idle' && v !== 'wait') return;
    waiting.set(key, { path, order });
    if (v === 'idle') set(key, { status: 'wait' });
    pump();
  }

  return {
    want,
    drop(key: string) {
      if (!waiting.delete(key)) return;
      set(key, IDLE);
    },
    lost(key: string, path: string, order: number) {
      if (retried.has(key) || views.get(key)?.status !== 'done') return;
      retried.add(key);
      set(key, IDLE);
      want(key, path, order);
    },
    pause(on: boolean) { paused = on; if (!on) pump(); },
    get: (key: string): CardView => views.get(key) ?? IDLE,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
