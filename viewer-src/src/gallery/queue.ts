import type { Message } from '../state';

export type CardImage = { url: string; w: number; h: number; at?: number };
export type FrontSheet = { i: number; name: string; variant: string | null; image: CardImage | null; failure: Message | null };
export type CardAnswer = { sheets: number; front: FrontSheet[] };
export type CardView =
  | { status: 'idle' | 'wait' | 'loading' }
  | { status: 'done'; sheets: number; front: FrontSheet[]; image: CardImage }
  | { status: 'error'; sheets: number; front: FrontSheet[]; failure: Message | null };

const IDLE: CardView = { status: 'idle' };

export function viewOf(a: CardAnswer | null): CardView {
  const first = a?.front[0];
  return a && first?.image ? { status: 'done', sheets: a.sheets, front: a.front, image: first.image }
    : { status: 'error', sheets: a?.sheets ?? 0, front: a?.front ?? [], failure: first?.failure ?? null };
}

export type CardQueue = ReturnType<typeof createCardQueue>;

export function createCardQueue(ask: (path: string) => Promise<CardAnswer | null>, limit = 1) {
  const views = new Map<string, CardView>();
  const waiting = new Map<string, { path: string; order: number; urgent?: boolean }>();
  const listeners = new Set<() => void>();
  const retried = new Set<string>();
  let running = 0, paused = false;

  const set = (key: string, view: CardView) => { views.set(key, view); for (const l of listeners) l(); };

  function pump() {
    while (running < limit && waiting.size) {
      let next: [string, { path: string; order: number; urgent?: boolean }] | null = null;
      for (const entry of waiting) if ((!paused || entry[1].urgent) && (!next || entry[1].order < next[1].order)) next = entry;
      if (!next) return;
      const [key, { path }] = next;
      waiting.delete(key);
      running++;
      set(key, { status: 'loading' });
      ask(path).then(
        a => set(key, viewOf(a)),
        () => set(key, viewOf(null)),
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
    urgent(key: string, path: string) {
      const v = views.get(key)?.status ?? 'idle';
      if (v !== 'idle' && v !== 'wait') return;
      waiting.set(key, { path, order: -1, urgent: true });
      if (v === 'idle') set(key, { status: 'wait' });
      pump();
    },
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
