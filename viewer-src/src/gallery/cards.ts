import type { KeptShot, PreviewFile } from '../match';

export const stemOf = (f: Pick<PreviewFile, 'rel'>) => f.rel.slice(f.rel.lastIndexOf('/') + 1).replace(/\.kts?$/, '');

const segsOf = (f: Pick<PreviewFile, 'rel'>) => f.rel.match(/(?:^|\/)src\/[^/]+\/(?:java|kotlin)\/(.+)\/[^/]+$/)?.[1].split('/') ?? [];

export function commonHead(files: Array<Pick<PreviewFile, 'rel'>>): string[] {
  const all = files.map(segsOf).filter(s => s.length);
  if (!all.length) return [];
  return all.reduce((head, s) => { let i = 0; while (i < head.length && i < s.length && head[i] === s[i]) i++; return head.slice(0, i); });
}

export function packageOf(f: Pick<PreviewFile, 'rel'>, head: string[]): string {
  const s = segsOf(f);
  if (!s.length) return f.rel.includes('/') ? f.rel.slice(0, f.rel.lastIndexOf('/')) : '';
  return s.slice(head.length).join('.') || s.join('.');
}

export function moduleOf(m: string | null | undefined): string {
  const parts = (m || '').split(':').filter(Boolean);
  while (parts.length > 1 && (parts.at(-1) === 'impl' || parts.at(-1) === 'api')) parts.pop();
  return parts.join('/');
}

export function changedAgo(mtime: number, now: number, phrase: (key: string, args?: Record<string, unknown>) => string, lang: string): string {
  const m = Math.round((now - mtime) / 60000);
  if (m < 60) return phrase('gallery.ago.minutes', { n: Math.max(m, 1) });
  if (m < 60 * 24) return phrase('gallery.ago.hours', { n: Math.round(m / 60) });
  if (m < 60 * 24 * 14) return phrase('gallery.ago.days', { n: Math.round(m / 1440) });
  return new Date(mtime).toLocaleDateString(lang, { month: 'short', day: 'numeric' });
}

export const byChanged = (files: PreviewFile[]) => [...files].sort((a, b) => b.mtime - a.mtime || a.rel.localeCompare(b.rel));

export const cardKey = (f: Pick<PreviewFile, 'path' | 'mtime'>) => `${f.mtime} ${f.path}`;

export const keptOf = (f: Pick<PreviewFile, 'shots'>, i: number): KeptShot | null => f.shots?.items.find(s => s.i === i) ?? null;

export const stale = (f: Pick<PreviewFile, 'mtime'>, image: { at?: number } | null | undefined) => image?.at != null && f.mtime > image.at;
