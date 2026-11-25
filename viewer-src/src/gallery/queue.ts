// 갤러리 카드 그림의 줄 — 화면에 든 카드만, 격자 순서로, 한 번에 하나씩 데몬에 묻는다.
// 데몬의 렌더 엔진이 하나라 동시에 여럿 물어도 빨라지지 않고, 데몬 쪽 줄은 순서를 바꾸거나 뺄 수 없다.
// 그래서 줄은 뷰어가 쥔다 — 화면을 벗어난 대기 카드는 빼고, 갤러리가 안 보이면 멈춘다. 이미 묻고 있는 카드는 끝까지 간다.
// 결과는 이 페이지가 떠 있는 동안 키(파일 + mtime)로 남는다. 실패는 다시 묻지 않는다 — 파일이 바뀌면 새 키라 다시 기다린다.
import type { Message } from '../state';

export type CardImage = { url: string; w: number; h: number };
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

  return {
    /** 카드가 화면에 들었다. 이미 묻는 중이거나 끝난 카드는 그대로다. */
    want(key: string, path: string, order: number) {
      const v = views.get(key)?.status ?? 'idle';
      if (v !== 'idle' && v !== 'wait') return;
      waiting.set(key, { path, order });
      if (v === 'idle') set(key, { status: 'wait' });
      pump();
    },
    /** 카드가 화면을 벗어났다 — 아직 묻지 않았으면 줄에서 뺀다. */
    drop(key: string) {
      if (!waiting.delete(key)) return;
      set(key, IDLE);
    },
    pause(on: boolean) { paused = on; if (!on) pump(); },
    get: (key: string): CardView => views.get(key) ?? IDLE,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
