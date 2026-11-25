// 갤러리 층 — 화면에 하나뿐이라 모듈이 갖는다. 데몬 상태의 screen 은 늘리지 않는다(층은 뷰어만 안다).
// 탭 0개면 늘 보이고, 탭이 있으면 연 자리(그때의 지금 탭)의 보드 위에서만 보인다 — 다른 탭으로 옮겨지면 그 커밋에서 안 보인다.
import { useSyncExternalStore } from 'react';
import { fetchPreviewFiles } from '../runtime/api';
import { store } from '../runtime/store';
import type { PreviewFile } from '../match';
import type { Connection } from '../session';
import { activeKey, type ViewerState } from '../state';

export type Layer = { open: boolean; openedOver: string | null; files: PreviewFile[] | null; ready: boolean };
let layer: Layer = { open: false, openedOver: null, files: null, ready: false };
const listeners = new Set<() => void>();
function update(next: Partial<Layer>) {
  if ((Object.keys(next) as Array<keyof Layer>).every(k => layer[k] === next[k])) return;
  layer = { ...layer, ...next };
  for (const l of listeners) l();
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const snapshot = () => layer;
export const useLayer = () => useSyncExternalStore(subscribe, snapshot);
export const currentLayer = () => layer;

let shown = false, stale = true, asked = 0;
/** 단축키가 보는 것 — 마지막으로 그린 갤러리가 보이는가. */
export const galleryShown = () => shown;
export function markShown(on: boolean) { shown = on; }

/** 보드 위에 연다. */
export function openGallery() { update({ open: true, openedOver: activeKey(store.st) }); }
export function closeGallery() { update({ open: false }); }

export async function loadFiles() {
  const n = ++asked;
  stale = false;
  const next = await fetchPreviewFiles().then(d => ({ ready: d.ready, files: d.files }), () => ({ files: [] as PreviewFile[], ready: true }));
  if (n === asked) update(next);
}
export const filesStale = () => stale || !layer.files;
/** 목록이 바뀌었다(데몬의 `previewFiles`) — 보이면 다시 받고, 아니면 다음에 보일 때 받는다. */
export function galleryFilesChanged() { if (shown) loadFiles(); else stale = true; }

/** 갤러리가 보이는가 — 탭 0개면 늘, 탭이 있으면 연 자리의 보드 위에서만. 한 장에서는 보이지 않는다. 끊김은 오류로 남는다. */
export function useGalleryShown(state: ViewerState | null, connection: Connection | null) {
  const s = useLayer();
  if (connection === 'lost' || !state?.header.repo) return false;
  if (state.screen === 'empty') return true;
  return s.open && state.screen !== 'focus' && activeKey(state) === s.openedOver;
}
