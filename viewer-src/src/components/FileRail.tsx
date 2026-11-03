import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { post } from '../../legacy/js/api.js';
import { hideOnce, showOnce } from '../../legacy/js/capsule.js';
import { motionMs, motionToken, reduced } from '../../legacy/js/motion.js';
import { hideReactKeys, useHost } from '../host';
import { useMessages } from '../messages';
import type { ViewerState } from '../state';
import { FileIcon, kindOf } from './FileIcon';

// 뷰어 탭(D-54) — 왼쪽 레일의 열린 파일 줄(D-98). 파일 보드가 있으면 하나여도 이 줄이 파일명을 말한다(H4). 열기 · 옮기기 · 닫기는 데몬이 정하고 여기는 그리고 의도만 보낸다.
// 지금 파일은 글자가 아니라 그 아래 떠 있는 바탕(glider)이 가리키고, 옮기면 바탕이 미끄러진다.
type Tab = ViewerState['tabs'][number];
const SHARED_ONCE = 'prevue.sharedOnce';
const NONE: Tab[] = [];

// 단축키(⇧← ⇧→ · 1~9)가 보는 것은 마지막으로 그린 레일이다.
let railTabs: Tab[] = [];
/** `⇧←` `⇧→` — 이웃 탭. 끝에서 멈춘다(돌지 않는다). */
export function stepTab(d: number) {
  const i = railTabs.findIndex(t => t.active);
  const t = railTabs[Math.max(0, Math.min(railTabs.length - 1, i + d))];
  if (t && !t.active) post('/viewer/tab', { key: t.key });
}
/** `1`~`9` — 그 번째 탭. */
export function jumpTab(n: number) {
  const t = railTabs[n - 1];
  if (t && !t.active) post('/viewer/tab', { key: t.key });
}
export const tabCount = () => railTabs.length;

const WORDS = /[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])|./g;
/** 꼬리 — 뒤쪽 낱말(CamelCase) 몇 개. 형제 파일은 앞이 같고 뒤가 달라서, 뒤를 자르면 셋이 똑같이 `DrinkDetailSc…`가 됐다. */
function tailOf(name: string) {
  const words = name.match(WORDS) || [name];
  let tail = '';
  for (let i = words.length - 1; i > 0; i--) {
    if (tail && (words[i] + tail).length > 12) break;
    tail = words[i] + tail;
  }
  return tail.length >= name.length - 2 ? '' : tail;
}

let context: CanvasRenderingContext2D | null = null;
const measure = (s: string, font: string) => { context ??= document.createElement('canvas').getContext('2d')!; context.font = font; return context.measureText(s).width; };
const fontOf = (el: Element) => { const cs = getComputedStyle(el); return `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; };

/** room 안에 드는 이름 — 넘치면 머리를 줄이고 꼬리는 남긴다(`Drink…OptionsHeader`). CSS 줄임은 끝만 자르고 글자 사이에 빈칸을 남긴다. */
function fit(name: string, room: number, font: string) {
  if (measure(name, font) <= room) return name;
  // 좁으면 꼬리를 낱말 단위로 줄인다(`Dri…DetailScreen` → `Drink…Screen`) — 글자 단위로 깎으면 `P…ilScreen`가 된다.
  const full = tailOf(name);
  const words = full.match(WORDS) || [];
  const tails = words.map((_, i) => words.slice(i).join(''));
  for (const [tail, least] of [...tails.map(t => [t, 3] as const), [tails[tails.length - 1] || '', 1] as const]) {
    for (let k = name.length - tail.length - 1; k >= least; k--) {
      const s = name.slice(0, k) + '…' + tail;
      if (measure(s, font) <= room) return s;
    }
  }
  for (let j = 1; j < full.length; j++) {
    const s = name[0] + '…' + full.slice(j);
    if (measure(s, font) <= room) return s;
  }
  return name[0] + '…';
}

// 레일의 줄임 — 폭은 레일이 정하고(200px) 줄마다 같다. 이름이 먼저다: 모듈 · 함수 표시는 이름이 남긴 칸을 갖되 MOD_MIN 까지는 지키고
// 끝을 자른다. 이름은 남은 칸에서 꼬리를 남기고 가운데를 줄인다. 이름 · 표시 · 칸이 그대로인 줄은 건너뛴다.
// 이름 칸(.rt-name)의 글자와 표시 칸의 max-width 는 잰 뒤에만 정해지므로 React 가 아니라 여기서 쓴다.
const MOD_MIN = 56;
function layout(rail: HTMLElement, list: HTMLElement, force = false) {
  const els = [...list.querySelectorAll<HTMLElement>('.rt:not(.leaving)')];
  if (!els.length || rail.hidden) return;
  const part = (el: HTMLElement, name: string) => el.querySelector<HTMLElement>(name)!;
  const nf = fontOf(part(els[0], '.rt-name')), mf = fontOf(part(els[0], '.rt-mod'));
  const gap = parseFloat(getComputedStyle(els[0]).columnGap) || 0;
  const key = (el: HTMLElement) => el.dataset.name + '|' + part(el, '.rt-mod').textContent + '|' + rail.clientWidth;
  const dirty = els.filter(el => force || el.dataset.fitted !== key(el));
  if (!dirty.length) return;
  // 모듈 칸을 0 으로 접고 재면 이름 칸 + 간격이 둘이 나눌 폭이다 — 읽기를 한 번에 몰아 줄마다 레이아웃을 다시 하지 않는다.
  for (const el of dirty) part(el, '.rt-mod').style.maxWidth = '0px';
  const totals = dirty.map(el => part(el, '.rt-name').clientWidth + (part(el, '.rt-mod').textContent ? gap : 0));
  dirty.forEach((el, i) => {
    const name = part(el, '.rt-name'), mod = part(el, '.rt-mod'), total = totals[i];
    let room = total;
    if (mod.textContent) {
      const m = Math.min(Math.ceil(measure(mod.textContent, mf)), Math.max(total - gap - Math.ceil(measure(el.dataset.name!, nf)), MOD_MIN));
      mod.style.maxWidth = m + 'px';
      room = total - gap - m;
    } else mod.style.maxWidth = '';
    name.textContent = fit(el.dataset.name!, room, nf);
    el.dataset.fitted = key(el);
  });
}

function RailRow({ tab, leaving, enter, onGone, observe }: {
  tab: Tab;
  leaving: boolean;
  enter: boolean;
  onGone: (key: string) => void;
  observe: (el: HTMLElement | null, on: boolean) => void;
}) {
  const { phrase } = useMessages();
  const row = useRef<HTMLDivElement>(null);
  // 새 줄은 높이 0에서 자란다. 아래 줄은 그만큼 밀린다 — 둘 다 같은 전환이라 따로 FLIP 할 것이 없다.
  const [entering, setEntering] = useState(enter);
  useLayoutEffect(() => {
    const el = row.current!;
    // 브라우저 검사가 레일 줄을 값으로 읽는다(tests/viewer/quickopen.mjs).
    hideReactKeys(el);
    observe(el, true);
    let frame = 0;
    if (entering) frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => setEntering(false)); });
    return () => { cancelAnimationFrame(frame); observe(el, false); };
  }, []);
  useLayoutEffect(() => {
    if (!leaving) return;
    const el = row.current!;
    if (reduced.matches || document.hidden) { onGone(tab.key); return; }
    const drop = (e?: TransitionEvent) => { if (!e || e.target === el) onGone(tab.key); };
    el.addEventListener('transitionend', drop);
    const timer = setTimeout(drop, 500);   // 탭이 뒤에 있으면 전환이 멈춘다
    return () => { el.removeEventListener('transitionend', drop); clearTimeout(timer); };
  }, [leaving]);

  const kind = kindOf(tab.sourceSet);
  const close = () => post('/viewer/close', { key: tab.key });
  return <div ref={row} role="tab" data-key={tab.key} data-name={tab.name} data-ic={kind} aria-selected={tab.active}
    className={['rt', tab.active && 'active', tab.stale && 'stale', entering && 'entering', leaving && 'leaving'].filter(Boolean).join(' ')}
    // 공유 세트는 그림이 Android 빌드라는 것을 툴팁에서도 말한다 — 표식만으로는 뜻을 모른다.
    title={kind === 'kmp' ? tab.title + '\n' + phrase('tabs.sharedTip') : tab.title}
    onClick={() => { if (!tab.active) post('/viewer/tab', { key: tab.key }); }}
    // 가운데 단추로 닫기 — 브라우저 탭과 같은 손버릇
    onAuxClick={e => { if (e.button === 1) { e.preventDefault(); close(); } }}>
    <FileIcon kind={kind} />
    <span className="rt-name" />
    <span className="rt-mod">{((tab.dim || '') + (tab.module ? ' · ' + tab.module : '')).replace(/^\s*·\s*/, '')}</span>
    <button type="button" className="rt-x" tabIndex={-1} aria-label={phrase('tabs.close')} onClick={e => { e.stopPropagation(); close(); }}>
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="m5 5 6 6M11 5l-6 6" /></svg>
    </button>
  </div>;
}

export type RailHosts = { rail: HTMLElement; list: HTMLElement; empty: HTMLElement };

export function FileRail({ tabs, screen, hosts }: { tabs: Tab[] | null; screen: ViewerState['screen'] | null; hosts?: RailHosts }) {
  const { phrase } = useMessages();
  const { element: list, place } = useHost(hosts?.list);
  const [rail, setRail] = useState<HTMLElement | null>(null);
  const [empty, setEmpty] = useState<HTMLElement | null>(null);
  const railEl = hosts?.rail ?? rail, emptyEl = hosts?.empty ?? empty;
  const glider = useRef<HTMLDivElement>(null);
  const current = tabs ?? NONE;
  // 작업 공간(D-57 · D-99)에서는 레일이 접힌다 — 헤더가 한 줄 내비게이션 바가 되고, 돌아갈 탭은 뒤로 버튼이 이름으로 갖는다.
  const on = screen !== 'focus';

  // 닫힌 줄은 접히는 동안 남는다. 옮겨 놓인 줄 뒤에 선다.
  const [seen, setSeen] = useState(current);
  const [leaving, setLeaving] = useState<Tab[]>([]);
  if (seen !== current) {
    const keys = new Set(current.map(t => t.key));
    const gone = seen.filter(t => !keys.has(t.key) && !leaving.some(l => l.key === t.key));
    setLeaving([...leaving.filter(l => !keys.has(l.key)), ...gone]);
    setSeen(current);
  }
  const gone = (key: string) => setLeaving(rows => rows.filter(t => t.key !== key));

  // 접고 펴는 것은 단번에 한다 — 화면 전환이 새 화면을 찍는 순간 레이아웃이 끝나 있어야 커지는 그림의 목적지가 움직이지 않는다.
  const shown = useRef(false), activeKey = useRef<string | null>(null);
  const enter = shown.current && on && !reduced.matches && !document.hidden;

  /**
   * 바탕을 지금 줄 밑으로. 줄을 옮긴 때만 미끄러지고, 높이가 바뀌는 동안(열고 닫기)은 그대로 따라간다.
   * 늘어나거나 출렁이지 않는다 — 시간 · 이징은 tokens.css 의 것을 읽는다.
   */
  const glide = useRef({ y: 0, stretch: null as Animation | null, sliding: false });
  const move = (slide: boolean) => {
    const g = glider.current, state = glide.current;
    if (!g || !list) return;
    const el = list.querySelector<HTMLElement>('.rt.active:not(.leaving)');
    g.hidden = !el;
    if (!el) return;
    const y = el.offsetTop;
    if (slide && !reduced.matches && y !== state.y) {
      state.stretch?.cancel();
      state.sliding = true;
      const stretch = state.stretch = g.animate([{ transform: `translateY(${state.y}px)` }, { transform: `translateY(${y}px)` }],
        { duration: motionMs('--duration-medium2'), easing: motionToken('--easing-standard') });
      stretch.finished.then(() => { state.stretch = null; state.sliding = false; }, () => {});
    } else if (state.stretch && !slide) { state.stretch.cancel(); state.stretch = null; state.sliding = false; }
    state.y = y;
    g.style.transform = `translateY(${y}px)`;
  };
  const moveRef = useRef(move);
  moveRef.current = move;
  // 줄 높이가 움직이는 동안(열고 닫기) 바탕이 따라간다. 미끄러지는 중이면 그 전환을 끊지 않고 새 자리로 다시 겨눈다.
  const [observer] = useState(() => new ResizeObserver(() => moveRef.current(glide.current.sliding)));
  const observe = (el: HTMLElement | null, on: boolean) => { if (el) { if (on) observer.observe(el); else observer.unobserve(el); } };
  useEffect(() => () => observer.disconnect(), [observer]);
  useEffect(() => {
    if (railEl && list) document.fonts?.ready.then(() => layout(railEl, list, true));
  }, [railEl, list]);

  useLayoutEffect(() => {
    if (!tabs || !railEl || !list) return;
    railEl.hidden = !on;
    if (hosts) document.body.classList.toggle('rail-on', on);
    if (emptyEl) emptyEl.hidden = tabs.length > 0;
    layout(railEl, list);
    railTabs = tabs;
    const active = tabs.find(t => t.active);
    // "공유 세트도 Android 로 그린다"는 도구의 고정 사실이라 처음 한 번만 가르친다 — 뒤로는 표식과 툴팁이 떠올리게 한다.
    // 다른 파일로 옮기면 걷는다 — 안내가 지금 보지 않는 소스 세트를 말하지 않게.
    if (active && kindOf(active.sourceSet) === 'kmp') showOnce(SHARED_ONCE, () => phrase('capsule.sharedOnce', { sourceSet: active.sourceSet }));
    else hideOnce(SHARED_ONCE);
    const key = active?.key ?? null;
    const moved = shown.current && on && key !== activeKey.current && activeKey.current !== null;
    activeKey.current = key;
    shown.current = on;
    move(moved);
  }, [tabs, screen, railEl, list, emptyEl]);

  const rows = [...current.map(t => ({ tab: t, leaving: false })), ...leaving.map(t => ({ tab: t, leaving: true }))];
  const body = <>
    <div className="rail-glider instant" id="railGlider" ref={glider} hidden />
    {/* enter 는 처음 그려지는 줄만 읽는다 — 이미 있는 줄은 그대로다. */}
    {rows.map(({ tab, leaving }) => <RailRow key={tab.key} tab={tab} leaving={leaving} enter={enter} onGone={gone} observe={observe} />)}
  </>;
  if (hosts) return place(body, () => null);
  return <nav className="rail" id="rail" ref={setRail} aria-label={phrase('rail.title')}>
    <h4 className="rail-h">{phrase('rail.title')}</h4>
    {place(body, (ref, children) => <div className="rail-list" id="railList" ref={ref} role="tablist" aria-orientation="vertical">{children}</div>)}
    <p className="rail-empty" id="railEmpty" ref={setEmpty} hidden>{phrase('rail.empty')}</p>
  </nav>;
}
