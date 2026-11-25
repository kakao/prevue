// 갤러리 카드의 글자 — 데몬의 `/preview-files.json` 한 줄(rel · module · mtime)에서 짓는 순수 함수(D-201).
// 패키지는 색인에 없어 rel 경로에서 자른다 — 소스 루트(src/<세트>/java|kotlin) 아래 폴더가 패키지다.
import type { PreviewFile } from '../match';

export const stemOf = (f: Pick<PreviewFile, 'rel'>) => f.rel.slice(f.rel.lastIndexOf('/') + 1).replace(/\.kts?$/, '');

const segsOf = (f: Pick<PreviewFile, 'rel'>) => f.rel.match(/\/src\/[^/]+\/(?:java|kotlin)\/(.+)\/[^/]+$/)?.[1].split('/') ?? [];

/** 저장소 모든 파일의 패키지가 함께 갖는 머리 — 카드마다 같은 첫 마디를 떼어 한 줄에 다른 부분만 남긴다. */
export function commonHead(files: Array<Pick<PreviewFile, 'rel'>>): string[] {
  const all = files.map(segsOf).filter(s => s.length);
  if (!all.length) return [];
  return all.reduce((head, s) => { let i = 0; while (i < head.length && i < s.length && head[i] === s[i]) i++; return head.slice(0, i); });
}

/** 공통 머리를 뗀 패키지. 다 떼면 비므로 그때는 전체를 둔다. 소스 루트 밖의 파일은 폴더 경로다. */
export function packageOf(f: Pick<PreviewFile, 'rel'>, head: string[]): string {
  const s = segsOf(f);
  if (!s.length) return f.rel.includes('/') ? f.rel.slice(0, f.rel.lastIndexOf('/')) : '';
  return s.slice(head.length).join('.') || s.join('.');
}

/** `:feature:foryou:impl` → `feature/foryou` — 끝의 impl · api 는 같은 기능의 갈래라 뗀다. */
export function moduleOf(m: string | null | undefined): string {
  const parts = (m || '').split(':').filter(Boolean);
  while (parts.length > 1 && (parts.at(-1) === 'impl' || parts.at(-1) === 'api')) parts.pop();
  return parts.join('/');
}

/** 바뀐 시각 — 두 주 안은 상대 시간, 그 뒤는 날짜. 문구는 사전이 갖는다. */
export function changedAgo(mtime: number, now: number, phrase: (key: string, args?: Record<string, unknown>) => string, lang: string): string {
  const m = Math.round((now - mtime) / 60000);
  if (m < 60) return phrase('gallery.ago.minutes', { n: Math.max(m, 1) });
  if (m < 60 * 24) return phrase('gallery.ago.hours', { n: Math.round(m / 60) });
  if (m < 60 * 24 * 14) return phrase('gallery.ago.days', { n: Math.round(m / 1440) });
  return new Date(mtime).toLocaleDateString(lang, { month: 'short', day: 'numeric' });
}

/** 최근 바뀐 순 — 데몬이 이미 그 순서로 주지만 같은 시각이면 경로로 고정한다. 재정렬하지 않게 한 번만 정한다. */
export const byChanged = (files: PreviewFile[]) => [...files].sort((a, b) => b.mtime - a.mtime || a.rel.localeCompare(b.rel));

/** 카드 그림의 키 — 파일이 바뀌면(mtime) 새 그림을 다시 기다린다. */
export const cardKey = (f: Pick<PreviewFile, 'path' | 'mtime'>) => `${f.mtime} ${f.path}`;
