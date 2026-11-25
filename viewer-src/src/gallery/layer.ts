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

let shown = false, asked = 0;
export const galleryShown = () => shown;
export function markShown(on: boolean) { shown = on; }

export function openGallery() { update({ open: true, openedOver: activeKey(store.st) }); }
export function closeGallery() { update({ open: false }); }

export async function loadFiles() {
  const n = ++asked;
  const next = await fetchPreviewFiles().then(d => ({ ready: d.ready, files: d.files }), () => ({ files: [] as PreviewFile[], ready: true }));
  if (n === asked) update(next);
}
export function galleryFilesChanged() { if (shown) loadFiles(); }

addEventListener('visibilitychange', () => { if (shown && document.visibilityState === 'visible') loadFiles(); });

export function useGalleryShown(state: ViewerState | null, connection: Connection | null) {
  const s = useLayer();
  if (connection === 'lost' || !state?.header.repo) return false;
  if (state.screen === 'empty') return true;
  return s.open && state.screen !== 'focus' && activeKey(state) === s.openedOver;
}
