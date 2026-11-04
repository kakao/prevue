import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { fetchPreviewFiles, post } from '../../legacy/js/api.js';
import { applyReveal, cancelReveal, reveal } from '../../legacy/js/board.js';
import { flash } from '../../legacy/js/capsule.js';
import type { Connection } from '../../legacy/js/main.js';
import { store } from '../../legacy/js/store.js';
import { hideReactKeys, useHost } from '../host';
import { matchFile, type FileEntry, type FileMatch, type PreviewFile } from '../match';
import { useMessages, type Messages } from '../messages';
import type { ViewerState } from '../state';

// 빠른 열기(D-56 · D-100) — 이 데몬이 열 수 있는 프리뷰 파일을 찾아 탭으로 연다.
// 레일 맨 아래 "파일 열기"(D-98) · / · ⌘K 로 열면 창 위 가운데에 팔레트가 뜨고, 그 맨 위 입력에 바로 칠 수 있다. 뒤에는 막이 깔린다.
// 목록은 데몬이 갖고(`/preview-files.json`), 매칭 · 순위 · 최근 연 파일은 브라우저의 일이다.
// 열린 탭이 없으면 같은 상자(FileSearch)가 막 없이 본문 가운데의 시작 화면이 된다(D-63) — 상자는 한 벌이고 둘 중 한 곳에만 선다.

const ROWS = 8, CHANGED = 5;          // 빈 상태 = 최근 바뀐 5 + 최근 연 3 — 결과와 줄 수가 같아 치기 시작해도 팔레트 높이가 거의 그대로다

/* ---------- 목록 — 화면을 모르는 셈 ---------- */
type BestFn = { fn: string; idx: Set<number>; more: number };
export type SearchRow = { f: FileEntry; m?: FileMatch; fn: BestFn | null };
type Section = { title?: string; rows: SearchRow[] };

const named = (files: PreviewFile[]): FileEntry[] => files.map(f => ({ ...f, name: f.rel.split('/').pop()! }));

/** 검색어가 맞은 함수 중 가장 많이 맞은 것 — 줄에는 이것 하나만 글자로 붙는다(R1). 파일명으로 맞았으면 없다. */
function bestFn(m?: FileMatch): BestFn | null {
  if (!m || !m.fns.size) return null;
  let best: [string, Set<number>] | null = null;
  for (const [fn, idx] of m.fns) if (!best || idx.size > best[1].size) best = [fn, idx];
  return { fn: best![0], idx: best![1], more: m.fns.size - 1 };
}

/** 지금 보일 줄들 — 빈 상태면 두 섹션(섹션 제목은 사전 키), 치면 점수 순 상위 8줄. */
function compute(files: FileEntry[] | null, query: string, recent: string[]) {
  const w = query.trim().split(/\s+/).filter(Boolean);
  if (!files) return { sections: [] as Section[], more: 0, empty: !w.length, loading: true };
  if (!w.length) {
    const byPath = new Map(files.map(f => [f.path, f]));
    const changed = files.slice(0, CHANGED);
    const seen = new Set(changed.map(f => f.path));
    const opened = recent.map(p => byPath.get(p)).filter((f): f is FileEntry => !!f && !seen.has(f.path));
    // 연 파일이 모자라면 바뀐 파일로 채운다 — 8줄 높이를 지킨다.
    const room = ROWS - changed.length;
    const more = opened.length < room ? files.slice(CHANGED).filter(f => !opened.includes(f)).slice(0, room - opened.length) : [];
    const sections: Section[] = [{ title: 'quickopen.changed', rows: [...changed, ...more].map(f => ({ f, fn: null })) }];
    if (opened.length) sections.push({ title: 'quickopen.opened', rows: opened.slice(0, room).map(f => ({ f, fn: null })) });
    return { sections, more: 0, empty: true, loading: false };
  }
  const hits: Array<{ f: FileEntry; m: FileMatch }> = [];
  for (const f of files) { const m = matchFile(w, f); if (m) hits.push({ f, m }); }
  hits.sort((a, b) => b.m.score - a.m.score || b.f.mtime - a.f.mtime);
  const rows = hits.slice(0, ROWS).map(h => ({ ...h, fn: bestFn(h.m) }));
  return { sections: rows.length ? [{ rows }] : [], more: Math.max(0, hits.length - ROWS), empty: false, loading: false };
}

/** 맞은 글자만 굵게 — 색을 쓰면 줄마다 색이 흩어진다(D6). */
function Marked({ text, idx }: { text: string; idx?: Set<number> }) {
  if (!idx?.size) return text;
  const runs: Array<[string, boolean]> = [];
  [...text].forEach((c, i) => {
    const hit = idx.has(i), last = runs[runs.length - 1];
    if (last && last[1] === hit) last[0] += c; else runs.push([c, hit]);
  });
  return runs.map(([run, on], k) => on ? <b key={k}>{run}</b> : run);
}

// 줄의 시작 — apple.com 빠른 링크의 화살표. 고른 줄에서만 진해진다(R5).
const ARROW = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10M9 4l4 4-4 4" /></svg>;
const moduleOf = (m: string | null) => (m || '').replace(/^:/, '').replace(/:/g, '/');

// 줄이 다시 그려지면 가만히 있는 포인터 밑에서도 mousemove 가 온다 — 그걸 받으면 치는 동안 고른 줄을 마우스가 빼앗는다. 실제로 움직였을 때만.
// 좌표는 페이지 어디서든 늘 적어 둔다 — 그래야 패널을 연 직후의 가짜 mousemove 도 "안 움직였다"로 읽힌다.
let px = -1, py = -1, real = false;
addEventListener('mousemove', e => { real = e.screenX !== px || e.screenY !== py; px = e.screenX; py = e.screenY; }, true);

/**
 * 검색 상자 — 입력 · 목록 · 안내 줄. 팔레트와 시작 화면이 같은 상자를 쓴다.
 * 입력은 React 가 값을 갖지 않는다 — 사람이 친 글자도, 브라우저 검사가 넣은 값도 같은 input 이벤트로 온다.
 * 고른 줄(sel)은 쉬는 동안(막 열었고 아무것도 안 했다) -1 이다. ↓ · 입력 · 포인터가 움직이면 생긴다(R5). 그래도 Enter 의 기본값은 첫 줄이다.
 */
export function FileSearch({ files, ready, query, sel, recent = [], fieldRef, onQuery, onSelect, onPick, onEscape, onLeave }: {
  files: PreviewFile[] | null;
  ready: boolean;
  query: string;
  sel: number;
  /** 최근 연 파일의 경로 — 저장소별로 브라우저에만 남는다. */
  recent?: string[];
  fieldRef?: (field: HTMLInputElement | null) => void;
  onQuery(query: string, sel: number): void;
  onSelect(sel: number): void;
  onPick?(row: SearchRow): void;
  /** 빈 입력에서 Esc. */
  onEscape?(): void;
  /** 입력이 포커스를 잃었다 — 가는 곳. */
  onLeave?(to: Element | null): void;
}) {
  const { phrase } = useMessages();
  const col = useRef<HTMLDivElement>(null), list = useRef<HTMLDivElement>(null);
  const [field, setField] = useState<HTMLInputElement | null>(null);
  const latest = useRef({ fieldRef, onQuery });
  latest.current = { fieldRef, onQuery };
  const bind = useCallback((el: HTMLInputElement | null) => { setField(el); latest.current.fieldRef?.(el); }, []);
  const entries = useMemo(() => files && named(files), [files]);
  const { sections, more, empty, loading } = compute(entries, query, recent);
  const items = sections.flatMap(s => s.rows);
  const at = Math.min(sel, items.length - 1);

  useLayoutEffect(() => {
    if (!field) return;
    const input = () => latest.current.onQuery(field.value, field.value.trim() ? 0 : -1);
    field.addEventListener('input', input);
    return () => field.removeEventListener('input', input);
  }, [field]);
  // 브라우저 검사가 상자의 요소(줄 · 입력 칸)를 값으로 돌려받는다(tests/viewer/quickopen.mjs · preparation.mjs). 줄은 칠 때마다 새로 생긴다.
  useLayoutEffect(() => {
    hideReactKeys(col.current!);
    col.current!.querySelectorAll('*').forEach(hideReactKeys);
    if (at >= 0) list.current!.querySelector(`.qo-row[data-i="${at}"]`)?.scrollIntoView({ block: 'nearest' });
  });

  // 입력 중에는 단축키가 죽으므로(shortcuts.ts) 상자의 키는 여기서 받는다.
  const keydown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      const d = e.key === 'ArrowDown' ? 1 : -1;
      onSelect(at < 0 ? (d > 0 ? 0 : items.length - 1) : (at + d + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const row = items[Math.max(0, at)];
      if (row) onPick?.(row);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // 지우고, 빈 필드면 물러난다.
      if (e.currentTarget.value) { e.currentTarget.value = ''; onQuery('', -1); } else onEscape?.();
    }
  };

  /** 한 줄 — `→ 파일명 › 맞은 함수  모듈`. 썸네일 · 칩 · 시각 · 열림은 없다(디자인 리뷰 2차: 쉬고 있을 때는 조용하게). */
  const row = (it: SearchRow, i: number) => <div key={it.f.path} className={i === at ? 'qo-row sel' : 'qo-row'} role="option" aria-selected={i === at}
    data-i={i} style={{ '--i': i } as CSSProperties} title={it.f.rel}
    onMouseDown={e => e.preventDefault()}       // 필드의 포커스를 지킨다
    onMouseMove={() => { if (real && at !== i) onSelect(i); }}
    onClick={() => onPick?.(it)}>
    <span className="qo-arrow">{ARROW}</span>
    <span className="qo-name"><Marked text={it.f.name} idx={it.m?.name} /></span>
    {it.fn && <span className="qo-fn">{'› '}<Marked text={it.fn.fn} idx={it.fn.idx} />{it.fn.more ? <span className="qo-fn-more">{` +${it.fn.more}`}</span> : null}</span>}
    <span className="qo-mod">{moduleOf(it.f.module)}</span>
  </div>;

  let note: ReactNode = null;
  if (loading || (!ready && !items.length)) note = <div className="qo-none">{phrase('quickopen.loading')}</div>;
  else if (!items.length) note = empty ? <div className="qo-none">{phrase('quickopen.none')}</div>
    : <div className="qo-none">{phrase('quickopen.noMatch', { q: query.trim() })}<div className="qo-why">{phrase('quickopen.noMatch.why')}</div></div>;
  let i = 0;
  // 상자의 빈 곳(머리말 · 안내 줄)을 눌러도 입력이 포커스를 지킨다 — 그래야 Esc 가 닫는다.
  return <div className="qo-col" ref={col} onMouseDown={e => { if (e.target !== field) e.preventDefault(); }}>
    <label className="qo-field">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>
      <input id="q" type="search" ref={bind} placeholder={phrase('quickopen.placeholder')} autoComplete="off" spellCheck={false}
        aria-label={phrase('quickopen.field')} aria-controls="qoIn" onKeyDown={keydown} onBlur={e => onLeave?.(e.relatedTarget as Element | null)} />
      <kbd className="qo-esc" aria-hidden="true">esc</kbd>
    </label>
    <div className="qo-in" id="qoIn" role="listbox" aria-label={phrase('quickopen.list')} ref={list}>
      {note}
      {sections.map((s, k) => [
        s.title ? <div key={`h${k}`} className="qo-h">{phrase(s.title)}</div> : null,
        ...s.rows.map(it => row(it, i++)),
      ])}
      {more ? <div className="qo-foot">{phrase('quickopen.more', { n: more })}</div> : null}
    </div>
    <div className="qo-hint">
      <span className="qo-keys" aria-hidden="true"><span>{phrase('quickopen.keys.move')}</span><span>{phrase('quickopen.keys.open')}</span><span>{phrase('quickopen.keys.close')}</span></span>
      <span className="qo-term"><span>{phrase('quickopen.term')}</span> <code>prevue show &lt;<span>{phrase('quickopen.term.file')}</span>&gt;</code></span>
    </div>
  </div>;
}

/** 팔레트 — 창 위 가운데에 뜨고, 막은 레일 오른쪽 본문을 가린다(D-100). 여닫는 움직임은 openQuickOpen · closeQuickOpen 이 바깥 요소에 건다. */
export function QuickOpenPalette({ hosts, children }: { hosts?: { sheet: HTMLElement; curtain: HTMLElement }; children?: ReactNode }) {
  const { place } = useHost(hosts?.sheet);
  return place(children, (ref, body) => <><div className="qo-curtain on" id="qoCurtain" /><div className="qo-sheet on" id="qoSheet" ref={ref}>{body}</div></>);
}

/**
 * 시작 화면(D-63 · D-100) — 열린 탭이 없으면(모두 닫았거나 파일 없이 띄웠다) 검색 상자가 본문 가운데에 선다. 오류가 아니라 할 수 있는 일 위에 선다.
 * 막 · 떠오르는 움직임 · Esc 닫기는 없고 줄 · 매칭 · 고르기는 팔레트와 한 벌이다. 상자가 팔레트 자리로 날아가는 모션은 만들지 않는다.
 * 썸네일 · 미리 렌더는 붙이지 않는다(D-08 — 카탈로그가 된다).
 */
export function StartScreen({ host, children }: { host?: HTMLElement; children?: ReactNode }) {
  const { phrase } = useMessages();
  const { place } = useHost(host);
  return place(<div className="start-in"><p className="start-lead">{phrase('start.lead')}</p>{children}</div>,
    (ref, body) => <section id="startView" className="start" ref={ref}>{body}</section>);
}

/* ---------- 열림 — 화면에 하나뿐이라 모듈이 갖는다 ---------- */
export type QuickOpenHosts = { sheet: HTMLElement; curtain: HTMLElement; start: HTMLElement };
type Search = { open: boolean; files: PreviewFile[] | null; ready: boolean; query: string; sel: number; recent: string[] };
let search: Search = { open: false, files: null, ready: false, query: '', sel: -1, recent: [] };
const listeners = new Set<() => void>();
/** quiet 면 다시 그리지 않는다 — 닫히는 팔레트는 흐려지는 동안 보던 줄을 그대로 둔다. */
function update(next: Partial<Search>, quiet = false) {
  if ((Object.keys(next) as Array<keyof Search>).every(k => search[k] === next[k])) return;
  search = { ...search, ...next };
  if (!quiet) for (const listener of listeners) listener();
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => search;

let parts: QuickOpenHosts | null = null, field: HTMLInputElement | null = null, button: HTMLElement | null = null;
// docked — 상자가 시작 화면에 있다. returnTo — 키보드로 연 자리. 닫을 때 그리로 포커스를 돌려준다(마우스로 열었으면 없다).
let docked = false, returnTo: HTMLElement | null = null, closeOnDraw = 0, entering = false, lastActive: string | null = null;

/* 최근 연 파일 — 저장소별로 브라우저에만 남는다(표시 취향, 데몬은 모른다). */
const recentSlot = () => 'prevue.recent:' + (store.st?.header.repo || '');
function readRecent(): string[] { try { return JSON.parse(localStorage.getItem(recentSlot()) || '[]'); } catch { return []; } }
function remember(path: string | null | undefined, quiet = false) {
  if (!path) return;
  const l = [path, ...readRecent().filter(p => p !== path)].slice(0, 20);
  try { localStorage.setItem(recentSlot(), JSON.stringify(l)); } catch { /* 기억 못 해도 열기는 된다 */ }
  update({ recent: l }, quiet);
}

async function load() {
  try { const d = await fetchPreviewFiles(); update({ ready: d.ready, files: d.files }); } catch { update({ files: [], ready: true }); }
}

/** opener 는 키보드로 연 자리다 — 그냥 닫으면(Esc · 커튼) 그리로 포커스가 돌아간다. 마우스로 열었으면 null 이다(D-63). */
export function openQuickOpen(opener: Element | null = null) {
  // 시작 화면이면 필드가 이미 본문에 있다 — 팔레트를 띄우지 않고 그 필드로 간다.
  if (docked) { field?.focus({ preventScroll: true }); field?.select(); return; }
  if (!parts) return;
  if (!search.open) {
    const { sheet, curtain } = parts;
    entering = true;
    returnTo = opener && opener !== document.body ? opener as HTMLElement : null;
    button?.setAttribute('aria-expanded', 'true');
    sheet.hidden = false; curtain.hidden = false; sheet.classList.remove('closing');   // 닫히는 중에 다시 열면 흐려 둔 팔레트를 되살린다
    update({ open: true, sel: -1, recent: readRecent() });
    requestAnimationFrame(() => { if (search.open) { curtain.classList.add('on'); sheet.classList.add('on'); } });
    load();
  }
  field?.focus({ preventScroll: true }); field?.select();
}

/**
 * 닫는다. instant 면 움직임 없이 — 화면 전환(탭 · 작업 공간 나가기)이 같은 프레임에 걷어 간다(D8).
 * back 이면 아무것도 고르지 않고 물러난 것이라 키보드로 연 자리에 포커스를 돌려준다 — 골라서 화면이 바뀌었으면 돌려주지 않는다
 * (돌려주면 다음 Enter 를 그 버튼이 가져가 패널이 다시 열린다).
 */
export function closeQuickOpen(instant = false, back = false) {
  closeOnDraw = 0;
  if (!search.open || !parts) return;
  const { sheet, curtain } = parts;
  if (field) { field.value = ''; field.blur(); }
  if (back && returnTo?.isConnected) returnTo.focus({ preventScroll: true });
  returnTo = null;
  update({ open: false, query: '' }, true);
  button?.setAttribute('aria-expanded', 'false');
  curtain.classList.remove('on'); sheet.classList.remove('on');
  if (instant) { sheet.hidden = true; curtain.hidden = true; return; }
  // 움직임 줄이기에서도 흐려지며 닫힌다 — 줄어드는 움직임만 없다(style.css).
  sheet.classList.add('closing');
  setTimeout(() => { if (!search.open) { sheet.hidden = true; curtain.hidden = true; sheet.classList.remove('closing'); } }, 220);
}

/** 목록이 바뀌었다(데몬의 `previewFiles`). 펼쳐져 있으면 다시 받는다 — 닫혀 있으면 다음에 열 때 받는다. */
export function previewFilesChanged() { if (search.open || docked) load(); }

const activeKey = (st: ViewerState | null) => { const t = (st?.tabs || []).find(t => t.active); return t ? t.key : st?.board?.file ?? null; };

/** 다음 화면 전환이 팔레트를 걷어 가게 한다. 전환이 오지 않으면(데몬이 답만 하고 끝) 잠시 뒤 스스로 닫는다. */
function arm() {
  const t = closeOnDraw = performance.now();
  setTimeout(() => { if (closeOnDraw === t) closeQuickOpen(); }, 1500);
}

/**
 * 연다. 검색어가 함수에 맞은 줄이면 그 함수 묶음의 첫 카드로 간다(R2 — Tab 은 없다, 다른 함수는 더 쳐서 찾는다).
 * 지금 보는 파일이면 그 자리에서 가고(작업 공간이면 나가며 그 카드로 줄어든다), 다른 파일이면 탭으로 연다 —
 * 팔레트는 새 화면을 그리는 그 프레임에 걷힌다(D8).
 */
async function pick(it: SearchRow, { phrase, daemonText }: Messages) {
  const f = it.f, st = store.st, fn = it.fn ? it.fn.fn : null;
  remember(f.path, true);
  if (f.path === activeKey(st)) {
    reveal(f.path, fn);
    if (st?.screen === 'focus' && st.focus?.fromBoard) { arm(); post('/viewer/exit'); }
    else { closeQuickOpen(); applyReveal(); }
    return;
  }
  reveal(f.path, fn);
  arm();
  const r = await post('/viewer/open', { file: f.path }).then(r => r.json()).catch((e: Error) => ({ ok: false, message: phrase('open.failed', { why: e.message }) }));
  if (r.ok) return;
  closeOnDraw = 0; cancelReveal();
  flash(daemonText(r.message) || phrase('open.cannot'));
}

/** 레일 맨 아래 "파일 열기"(D-98) — 빠른 열기의 눈에 보이는 입구. */
export const QuickOpenButton = memo(function QuickOpenButton({ host }: { host?: HTMLElement | null }) {
  const { phrase } = useMessages();
  const { element, place } = useHost(host);
  useLayoutEffect(() => {
    if (!element) return;
    button = element;
    element.title = phrase('rail.open.tip');
    element.setAttribute('aria-label', phrase('rail.open.label'));
    // e.detail 이 0 이면 키보드로 누른 것이다(Enter · Space) — 그때만 닫을 때 그 버튼으로 돌아온다.
    const click = (e: MouseEvent) => (search.open ? closeQuickOpen(false, true) : openQuickOpen(e.detail === 0 ? element : null));
    element.addEventListener('click', click);
    return () => { element.removeEventListener('click', click); button = null; };
  }, [element, phrase]);
  const body = <>
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M8 3.5v9M3.5 8h9" /></svg>
    <span className="rail-open-t">{phrase('rail.open')}</span><kbd>⌘K</kbd>
  </>;
  return place(body, (ref, children) => <button className="rail-open" id="railOpen" ref={ref} type="button" aria-haspopup="listbox" aria-expanded="false" aria-controls="qoSheet">{children}</button>);
});

/**
 * 뷰어의 빠른 열기 — 상태를 그릴 때마다 시작 화면을 펼지, 팔레트를 걷을지, 지금 탭을 최근 연 파일에 적을지 정한다.
 * 화면 전환이 새 화면을 찍기 전에 같은 커밋에서 정해야 해서 바깥 요소의 hidden · 클래스는 레이아웃 효과에서 바로 쓴다.
 */
export function QuickOpen({ state, draw, connection, hosts }: { state: ViewerState | null; draw: number; connection: Connection | null; hosts: QuickOpenHosts }) {
  const messages = useMessages();
  const s = useSyncExternalStore(subscribe, snapshot);
  // 최근 연 파일이 저장소별이라 저장소를 안 뒤에 편다 — 데몬이 막 떴을 때의 첫 상태는 저장소가 비어 있다.
  // 끊김은 오류로 남고 시작 화면이 덮지 않는다(탭 0개와 가른다). 다시 붙으면 페이지를 새로 연다.
  const dock = connection !== 'lost' && state?.screen === 'empty' && !!state.header.repo;

  useLayoutEffect(() => {
    parts = hosts;
    // 막이 덮지 않는 헤더 · 레일을 눌러도 닫는다 — 바깥 누름이다. 누른 것(레일 탭 등)은 그대로 제 일을 한다.
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (search.open && !hosts.sheet.contains(t) && !hosts.curtain.contains(t) && !button?.contains(t)) closeQuickOpen();
    };
    const curtain = () => closeQuickOpen(false, true);
    // 시작 화면은 계속 떠 있다 — 저장마다 다시 받지 않고(mtime만 바뀐 저장은 조용하다) 창에 돌아올 때 받는다.
    const back = () => { if (docked && !document.hidden) load(); };
    document.addEventListener('pointerdown', outside, true);
    hosts.curtain.addEventListener('click', curtain);
    document.addEventListener('visibilitychange', back);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      hosts.curtain.removeEventListener('click', curtain);
      document.removeEventListener('visibilitychange', back);
      parts = null;
    };
  }, [hosts]);
  useLayoutEffect(() => {
    if (dock === docked) return;
    docked = dock;
    if (dock) { closeQuickOpen(true); entering = true; hosts.start.hidden = false; load(); }
    else { hosts.start.hidden = true; hosts.start.classList.remove('enter'); }
    // 상자는 새 자리에서 새로 선다 — 입력이 비어 있다.
    update({ query: '', sel: -1, ...(dock ? { recent: readRecent() } : {}) });
  }, [dock]);
  useLayoutEffect(() => {
    if (!state) return;
    const a = activeKey(state);
    if (a && a !== lastActive) { lastActive = a; remember(a); }
    // 시작 화면에서 고른 파일은 탭이 열린 상태에서 걷힌다 — 그 사이에 온 빈 화면 상태로는 걷지 않는다.
    if (closeOnDraw && state.screen !== 'empty') closeQuickOpen(true);
  }, [draw]);
  useLayoutEffect(() => { if (connection === 'lost') closeQuickOpen(true); }, [connection]);
  // 펼친 뒤 처음 그릴 때만 줄이 계단으로 떠오른다. 움직임 줄이기면 계단 대신 페이드다(style.css).
  useLayoutEffect(() => {
    hosts.sheet.classList.toggle('enter', !docked && entering);
    hosts.start.classList.toggle('enter', docked && entering);
    entering = false;
  });

  const box = <FileSearch files={s.files} ready={s.ready} query={s.query} sel={s.sel} recent={s.recent}
    fieldRef={el => { if (el) field = el; }}
    onQuery={(query, sel) => update({ query, sel })} onSelect={sel => update({ sel })} onPick={it => pick(it, messages)}
    // 시작 화면은 닫을 것이 없다 — 빈 필드면 필드를 떠난다.
    onEscape={() => { if (docked) field?.blur(); else closeQuickOpen(false, true); }}
    // 키보드로 팔레트 밖에 나가도 닫는다 — 막이 레일 · 헤더를 덮지 않아 Tab 으로 닿는다. 입구 단추로 가는 것은 그 단추가 닫는다.
    onLeave={to => { if (search.open && to && !hosts.sheet.contains(to) && to !== button) closeQuickOpen(); }} />;
  return <>
    <QuickOpenPalette hosts={hosts}>{!dock && box}</QuickOpenPalette>
    <StartScreen host={hosts.start}>{dock && box}</StartScreen>
  </>;
}
