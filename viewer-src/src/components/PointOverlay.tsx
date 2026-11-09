import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useHost } from '../host';
import { useMessages } from '../messages';
import type { ViewerState } from '../state';
import { pointView, type CardBox, type CardModifier, type CardOrigin, type CardPreview, type CardRow, type CardTree, type PointCardData, type PointNode, type PointSay } from '../workspace/view';

// 가리킨 결과(FR-20 · D-162) — 그림 밖 옆에 뜬 카드가 이름 · 출처 · 파일:라인 · 크기 · 위아래 노드 · Modifier 체인을 말하고,
// 트리 줄로 다시 가리키며, 가리킨 컴포저블을 부르는 Preview 로 건너간다. 같은 이름의 파일이 여럿이면 카드 머리에서 팝오버가 내려온다.
// 그림 위 표시는 workspace/point.ts 가 그리고, 카드의 내용 · 자리(host · shot)는 그곳이 view.ts 의 pointView 에 쓴다.
export type PointActions = {
  /** 후보 하나를 고른다 — 데몬이 기억해 한 데몬에서 두 번 묻지 않는다. */
  choose(path: string): void;
  cancel(): void;
  /** 떠 있는 동안 팝오버를 카드 머리 아래에 붙여 둔다. */
  follow(chooser: HTMLElement): void;
  /** 트리 줄을 누르면 그 노드를 그림에서 누른 것과 같다. */
  pick(row: CardRow): void;
  /** 트리 줄에 올린 노드(벗어나면 null) — 그림 위에 옅은 바탕으로 짚는다. */
  peek(row: CardRow | null): void;
  jump(preview: CardPreview): void;
  close(): void;
};
const NO_ACTIONS: PointActions = { choose() {}, cancel() {}, follow() {}, pick() {}, peek() {}, jump() {}, close() {} };

const icon = (d: ReactNode) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
const CLOSE = icon(<path d="M4 4l8 8M12 4l-8 8" />);
const JUMP = icon(<><rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M2.5 11.5L6 8l2.5 2.5 2-2 3 3" /><circle cx="10.5" cy="6" r="0.75" fill="currentColor" stroke="none" /></>);
/** Modifier 줄 앞의 하는 일 — 글은 title · aria-label 이 갖는다. */
const KIND = {
  width: icon(<path d="M2 8h12M4.5 5.5 2 8l2.5 2.5M11.5 5.5 14 8l-2.5 2.5" />),
  height: icon(<path d="M8 2v12M5.5 4.5 8 2l2.5 2.5M5.5 11.5 8 14l2.5-2.5" />),
  size: icon(<><path d="M2.5 6V2.5H6M10 13.5h3.5V10" /><path d="M2.5 2.5l11 11" /></>),
  padding: icon(<><rect x="2.5" y="2.5" width="11" height="11" rx="1.5" /><rect x="5.5" y="5.5" width="5" height="5" rx="0.5" strokeDasharray="1.5 1.5" /></>),
  click: icon(<path d="M5 2.5l7.5 4.8-3.4.9 2 3.4-1.6.9-2-3.4L5 11.5z" />),
  text: icon(<path d="M3.5 3.5h9M8 3.5v9M6 12.5h4" />),
  color: icon(<path d="M8 2.5S4 7 4 9.75a4 4 0 0 0 8 0C12 7 8 2.5 8 2.5z" />),
};

/** 멘션(`@절대경로#L라인`)이나 미리 보인 `파일명:라인`에서 보일 글자를. */
function refText(ref: string) {
  const m = /#L(\d+)$/.exec(ref);
  const path = ref.replace(/^@/, '').replace(/#L\d+$/, '');
  return m ? `${path.slice(path.lastIndexOf('/') + 1)}:${m[1]}` : path;
}
/** 저장소 기준 경로 — `src/main/kotlin/<패키지>` 는 파일명이 이미 말하는 것이라 …로 접는다. */
function shortPath(path: string, repo: string | null | undefined) {
  const rel = repo && path.startsWith(repo + '/') ? path.slice(repo.length + 1) : path;
  const cut = rel.lastIndexOf('/') + 1, src = rel.indexOf('/src/');
  return (src > 0 && src < cut ? rel.slice(0, src) + '/…/' : rel.slice(0, cut)) + rel.slice(cut);
}
/** 카드 머리의 툴팁 — 클립보드에 간 모양(`@절대경로#L라인`) 그대로 · 노드 이름 · 조상 사슬. 에이전트가 읽는 모양은 바꾸지 않는다. */
export function pointTitle(node: PointNode, say: PointSay) {
  const where = (node.uchain || node.chain || []).slice(-6).join(' › ');
  return (say.ref ? [say.ref, node.name, where] : [say.msg, where]).filter(Boolean).join('\n');
}

/** 크기 그림의 비율을 이 안에서만 따른다 — 띠나 기둥처럼 긴 노드도 56px 칸에서 모양이 읽히게. */
const GLYPH_RATIO: readonly [number, number] = [0.5, 3.2];
/** 위 두 칸만 파일 트리처럼 들여 쓴다 — 깊이 22를 다 들이면 카드 폭을 먹는다. 그 위의 조상은 왼쪽에 나란히 선다. */
const NESTED_UPS = 2;
/** dp 는 px 를 밀도로 나눈 값이라 정수로 떨어지지 않는다 — 소수 한 자리까지, 정수면 소수점 없이. */
const size = (n: number) => String(Math.round(n * 10) / 10);
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** 마우스로 누른 카드 단추는 포커스를 쥐지 않는다(D-63) — 쥐면 다음 Enter(고른 카드 열기)를 단추가 가져간다. 키보드(Tab → Enter)는 그대로다. */
const keepFocus = (e: MouseEvent) => { if (e.button === 0 && (e.target as Element).closest('button')) e.preventDefault(); };

function TreeRow({ row, here, actions, children }: { row: CardRow; here?: boolean; actions: PointActions; children?: ReactNode }) {
  return <li className={`pc-node${here ? ' here' : ''}`} data-id={row.id}>
    <div className="pc-row" onMouseEnter={() => actions.peek(row)} onMouseLeave={() => actions.peek(null)}>
      <button type="button" className="pc-pick" aria-current={here ? 'true' : undefined} onFocus={() => actions.peek(row)} onBlur={() => actions.peek(null)} onClick={() => actions.pick(row)}>{row.name}</button>
    </div>
    {children}
  </li>;
}

/**
 * 가리킨 노드가 바뀌면 새 자식 묶음은 펼치고, 옛 노드가 형제나 자식으로 남으면 그 아래의 옛 자식 묶음을 같은 시간에 접어 걷는다.
 * 처음 그릴 때와 부모로 올라갈 때(새 자식이 곧 이미 보이던 형제다)는 펼치지 않는다. 줄의 id 는 트리 순서라 다시 가리켜도 같다.
 */
function Tree({ tree, actions, settled }: { tree: CardTree; actions: PointActions; settled(): void }) {
  const { ups, here, before, after, downs } = tree;
  const [ghost, setGhost] = useState<{ at: string; rows: CardRow[] } | null>(null);
  const [unfold, setUnfold] = useState(false);
  const prev = useRef<{ here: string; downs: CardRow[] } | null>(null);
  useLayoutEffect(() => {
    const p = prev.current;
    if (p && p.here !== here.id) {
      setUnfold(!downs.some(d => d.id === p.here));
      const level = [...before, ...after, ...downs], shown = new Set([...ups, here, ...level].map(r => r.id));
      const rows = p.downs.filter(d => !shown.has(d.id));
      setGhost(rows.length && level.some(r => r.id === p.here) ? { at: p.here, rows } : null);
    }
    prev.current = { here: here.id, downs };
  }, [here.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const leaving = (r: CardRow) => ghost?.at === r.id
    ? <div key={`fold-${r.id}`} className="pc-foldout" inert onAnimationEnd={e => { if (e.target === e.currentTarget) { setGhost(null); settled(); } }}>
        <ul className="pc-group">{ghost.rows.map(g => <TreeRow key={g.id} row={g} actions={actions} />)}</ul>
      </div>
    : undefined;
  const side = (r: CardRow) => <TreeRow key={r.id} row={r} actions={actions}>{leaving(r)}</TreeRow>;
  const leaves = downs.length ? <div key={`unfold-${here.id}`} className={unfold ? 'pc-unfold' : undefined} onAnimationEnd={e => { if (e.target === e.currentTarget) settled(); }}>
    <ul className="pc-group">{downs.map(side)}</ul>
  </div> : null;
  const level = <>{before.map(side)}<TreeRow key={here.id} row={here} here actions={actions}>{leaves}</TreeRow>{after.map(side)}</>;
  const cut = Math.max(0, ups.length - NESTED_UPS);
  const nested = ups.slice(cut).reduceRight<ReactNode>((inner, r) => <TreeRow key={r.id} row={r} actions={actions}><ul className="pc-group">{inner}</ul></TreeRow>, level);
  return <ul className="pc-tree">{ups.slice(0, cut).map(r => <TreeRow key={r.id} row={r} actions={actions} />)}{nested}</ul>;
}

/**
 * 자동 복사가 막혔을 때만 파일 줄 끝에 선다. 누르는 순간(사용자 제스처) 다시 넣는다(point.ts copy 의 again).
 * 다시 넣기도 막히면 point.ts 가 again 없이 copied=false 를 다시 보내므로 `복사할 수 없음`으로 남는다.
 */
function CopyRescue({ say }: { say: PointSay }) {
  const { phrase } = useMessages();
  if (say.copied !== false) return null;
  if (!say.again) return <span className="pc-rescue off">{phrase('point.card.blocked')}</span>;
  return <button type="button" className="pc-rescue" title={phrase('point.card.retry.title', { ref: say.ref ?? '' })} onClick={say.again}>{phrase('point.card.retry')}</button>;
}

function OriginChip({ origin }: { origin: CardOrigin }) {
  const { phrase } = useMessages();
  if (!origin) return null;
  if (origin === 'compose') return <span className="pc-chip compose" title={phrase('point.card.compose.title')}>Compose</span>;
  return <span className="pc-chip module" title={phrase('point.card.module.title', { module: origin.module })}>{origin.module}</span>;
}

/** 크기 한 줄 — 56px 칸에 비율 그림(여백이 있으면 안쪽 점선 상자)과 `너비 × 높이 dp`. 출처 · 여백 값은 체인이 말한다. */
function SizeRow({ box }: { box: CardBox }) {
  const raw = box.width > 0 && box.height > 0 ? box.width / box.height : 1;
  const ratio = Math.min(GLYPH_RATIO[1], Math.max(GLYPH_RATIO[0], raw));
  return <div className="pc-size">
    <div className="pc-glyph"><div className={`pc-shape${box.padded ? ' padded' : ''}`} style={{ '--ratio': ratio } as CSSProperties}>{box.padded && <i />}</div></div>
    <div className="pc-dims">{size(box.width)}<i>×</i>{size(box.height)}<span className="pc-unit">{box.unit}</span></div>
  </div>;
}

/** modifier 가 하는 일 — 줄 앞 아이콘 열이 말하고 뜻은 툴팁이 갖는다. 모르는 modifier 는 비워 둔다. */
function modifierKind(m: CardModifier): keyof typeof KIND | null {
  if (m.sizes?.length) return m.sizes.length === 2 ? 'size' : m.sizes[0];
  if (m.color) return 'color';
  return ({ padding: 'padding', clickable: 'click', text: 'text' } as const)[m.name as 'padding' | 'clickable' | 'text'] ?? null;
}

function ModifierRows({ modifiers }: { modifiers: CardModifier[] }) {
  const { phrase } = useMessages();
  return <div className="pc-mods"><ol className="pc-scroll" tabIndex={0} aria-label={phrase('point.card.modifiers')}>{modifiers.map((m, i) => { const kind = modifierKind(m); return <li key={`${i}-${m.name}`}>
    {kind ? <span className="pc-kind" title={phrase(`point.card.kind.${kind}`)} aria-label={phrase(`point.card.kind.${kind}`)}>{KIND[kind]}</span> : <span className="pc-kind" />}
    <span className="pc-mod-name">{m.name}</span>
    {(m.value || m.color) && <span className="pc-mod-value" title={m.value}>{m.color && <i className="pc-swatch" style={{ background: m.color }} />}<span>{m.value}</span></span>}
  </li>; })}</ol></div>;
}

/**
 * 가리킨 결과의 카드(D-162) — 머리(이름 · 출처 · 파일:라인) → 트리 → 설명 패널(크기 · Modifier 체인)을 탭 없이 쌓는다.
 * 트리 칸 높이는 고정이라 노드를 옮겨도 그 아래 설명 패널이 제자리에 있다. previews 는 머리의 버튼 하나가 갖는다(여럿이면 개수와 목록).
 */
export function PointCard({ card, actions = NO_ACTIONS }: { card: PointCardData; actions?: PointActions }) {
  const { phrase } = useMessages();
  const { node, say, box, tree, modifiers, previews, origin } = card;
  const panel = useRef<HTMLDivElement>(null), drawn = useRef(false);
  /** 가리킨 줄을 트리 칸 가운데로 — 스크롤하는 것은 칸(div)이지 그 안의 ul 이 아니다. 처음은 바로, 그 뒤는 부드럽게. */
  const center = (smooth: boolean) => {
    const p = panel.current, row = p?.querySelector<HTMLElement>('.pc-node.here > .pc-row');
    if (!p || !row) return;
    const top = p.scrollTop + row.getBoundingClientRect().top - p.getBoundingClientRect().top - (p.clientHeight - row.offsetHeight) / 2;
    p.scrollTo({ top, behavior: smooth && !reduced() ? 'smooth' : 'auto' });
  };
  const hereId = tree?.here.id;
  useLayoutEffect(() => { center(drawn.current); drawn.current = true; }, [hereId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [listOpen, setListOpen] = useState(false);
  useEffect(() => setListOpen(false), [hereId, node.lineNumber]);
  const where = say.file ? `${say.file.slice(say.file.lastIndexOf('/') + 1)}:${node.lineNumber}` : say.ref ? refText(say.ref) : '';
  const many = previews.length > 1;
  const jumpLabel = many ? phrase('point.card.previews', { n: previews.length }) : previews[0] && phrase('point.card.jump', { name: previews[0].fn });
  // 노드가 바뀌면 머리 글자와 설명을 새로 붙여 페이드로 갈아든다.
  const swap = hereId ?? `${node.name}:${node.lineNumber}`;
  return <section className="point-card" aria-label={phrase('point.card.label')} onMouseDown={keepFocus}>
    <div className="pc-body">
      <header className="pc-head">
        <div className="pc-id pc-swap" key={`id-${swap}`} title={pointTitle(node, say)}>
          <span className="pc-nameline"><span className="pc-name">{node.name || node.fileName}</span><OriginChip origin={origin} /></span>
          {say.ref && <span className="pc-refline"><span className="pc-ref">{where}</span><CopyRescue say={say} /></span>}
        </div>
        {jumpLabel && <button type="button" className="pc-jump" title={jumpLabel} aria-label={jumpLabel} aria-expanded={many ? listOpen : undefined}
          onClick={() => many ? setListOpen(o => !o) : actions.jump(previews[0])}>{JUMP}{many && <span>{previews.length}</span>}</button>}
        <button type="button" className="pc-close" title={phrase('point.card.close')} aria-label={phrase('point.card.close')} onClick={actions.close}>{CLOSE}</button>
      </header>
      {many && <div className="pc-fold" data-open={listOpen || undefined} inert={!listOpen}><ul className="pc-previews">{previews.map(p => <li key={`${p.file}#${p.fn}`}>
        <button type="button" className="pc-preview" title={`${p.fn} — ${p.rel}`} onClick={() => actions.jump(p)}>{JUMP}<span>{p.fn}</span></button>
      </li>)}</ul></div>}
      {!say.ref && <p className="pc-msg">{say.msg}</p>}
      {tree && <div className="pc-panel pc-tree-panel"><div className="pc-scroll" ref={panel}><Tree tree={tree} actions={actions} settled={() => center(true)} /></div></div>}
      <div className="pc-panel pc-detail">
        <div className="pc-detail-in pc-swap" key={`detail-${swap}`}>
          <SizeRow box={box} />
          {modifiers && modifiers.length > 0 && <ModifierRows modifiers={modifiers} />}
        </div>
      </div>
    </div>
  </section>;
}

export type Rect = { left: number; top: number; width: number; height: number };
export type Spot = { left: number; top: number };
/** 간격은 tokens.css 에서 읽는다 — gap 그림과 카드 사이, edge 쓸 수 있는 폭의 가장자리와 카드 사이. */
export type Spacing = { gap: number; edge: number };

/**
 * 카드 자리 — 가리킨 그림 밖 오른쪽(쓸 수 있는 폭이 모자라면 왼쪽)에, 위쪽은 그림 위쪽에 맞춰 고정한다. 어느 노드를 가리켜도 카드는 움직이지 않는다.
 * 이웃 그림 위에 서는 것은 허용한다. room 은 레일 · 패널에 가리지 않는 가로 범위다. 좌표는 모두 카드가 선 영역(host) 기준이다.
 */
export function placeCard({ room, shot, card, space }: { room: { left: number; right: number }; shot: Rect; card: { width: number }; space: Spacing }): Spot {
  const right = shot.left + shot.width + space.gap;
  const left = right + card.width <= room.right - space.edge ? right : Math.max(room.left + space.edge, shot.left - space.gap - card.width);
  return { left, top: Math.max(space.edge, shot.top) };
}

const px = (el: Element, name: string) => parseFloat(getComputedStyle(el).getPropertyValue(name)) || 0;
const visibleRect = (id: string) => { const el = document.getElementById(id); return el && !el.hidden && el.offsetWidth ? el.getBoundingClientRect() : null; };

/**
 * 떠 있는 카드 — 그림 위쪽 옆에 서고, 내용이 바뀔 때 높이만 감쇠 곡선(--easing-spring)으로 옮긴다.
 * 그림은 보드 스크롤 · 창 크기 · 한 장의 확대 · 이동으로 움직이므로 떠 있는 동안 프레임마다 그림을 재어 따라간다(후보 고르기 팝오버와 같다) — 바뀔 때만 쓴다.
 * 높이는 카드 몸통(.pc-body)을 재어 --h 로 준다. 몸통 안에서 Preview 목록이 펼쳐지는 중이면 끝난 뒤 한 번만 잰다 — 프레임마다 재면 곡선이 매번 다시 시작해 내용을 쫓아간다.
 * 처음 뜰 때는 자리로 바로 서고(data-placed 전에는 전환 없음), 그다음 프레임부터 움직인다.
 */
export function PointCardFloat({ host, shot, children }: { host: HTMLElement; shot: () => DOMRect | Rect | null; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0), [placed, setPlaced] = useState(false);
  useLayoutEffect(() => {
    const body = ref.current?.querySelector<HTMLElement>('.pc-body');
    if (!body) return;
    let wait = 0;
    const measure = () => {
      const moving = body.getAnimations({ subtree: true }).filter(a => a.playState === 'running' && a instanceof CSSTransition && a.transitionProperty === 'grid-template-rows');
      const n = ++wait;
      if (moving.length) { Promise.all(moving.map(a => a.finished.catch(() => {}))).then(() => { if (n === wait) setHeight(body.offsetHeight); }); return; }
      setHeight(body.offsetHeight);
    };
    const watch = new ResizeObserver(measure);
    watch.observe(body);
    setHeight(body.offsetHeight);
    return () => { wait = -1; watch.disconnect(); };
  }, []);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const space = { gap: px(el, '--space-16'), edge: px(el, '--space-8') };
    let frame = 0, last = '';
    const follow = () => {
      const s = shot(), h = host.getBoundingClientRect();
      let next = 'hidden';
      if (s && s.width) {
        const rail = visibleRect('rail'), panel = visibleRect('panel');
        const room = { left: Math.max(0, (rail?.right ?? 0) - h.left), right: Math.min(host.clientWidth, (panel?.left ?? innerWidth) - h.left, innerWidth - h.left) };
        const spot = placeCard({ room, shot: { left: s.left - h.left, top: s.top - h.top, width: s.width, height: s.height }, card: { width: el.offsetWidth }, space });
        next = `${Math.round(spot.left)},${Math.round(spot.top)}`;
      }
      if (next !== last) {
        last = next;
        if (next === 'hidden') el.style.visibility = 'hidden';
        else { const [l, t] = next.split(','); el.style.left = l + 'px'; el.style.top = t + 'px'; el.style.visibility = ''; }
      }
      frame = requestAnimationFrame(follow);
    };
    follow();
    const ready = requestAnimationFrame(() => setPlaced(true));
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(ready); };
  }, [host, shot]);
  const style: CSSProperties & { '--h'?: string } = { '--h': height ? `${height}px` : undefined };
  return <div ref={ref} className="pc-float" style={style} data-placed={placed || undefined}>{children}</div>;
}

/** 마지막으로 가리킨 그림의 카드 — 보드는 #boardView, 한 장은 #focusView 에 선다. 다른 그림을 가리키면 새로 선다(바로 선다). */
export function PointOverlay({ actions }: { actions?: PointActions }) {
  const { host, shot, card } = useSyncExternalStore(pointView.subscribe, pointView.get);
  const keys = useRef(new WeakMap<object, number>()), seq = useRef(0);
  if (!host || !shot || !card) return null;
  if (!keys.current.has(shot)) keys.current.set(shot, ++seq.current);
  return createPortal(<PointCardFloat key={keys.current.get(shot)} host={host} shot={shot}><PointCard card={card} actions={actions} /></PointCardFloat>, host);
}

/**
 * 후보 고르기 — 같은 베이스네임이 여러 곳에 있다(state.choice). 카드 머리에서 내려오는 팝오버이고, 카드가 없으면 헤더 아래 가운데.
 * 닫히는 동안에도 마지막 후보를 그대로 두어 사라지는 모습이 비지 않는다 — 닫힌 팝오버는 누름을 가로채지 않는다(style.css).
 */
export function ChoicePopover({ choice, repo, host, actions = NO_ACTIONS }: { choice: ViewerState['choice'] | null; repo?: string | null; host?: HTMLElement; actions?: PointActions }) {
  const { phrase } = useMessages();
  const { element, place } = useHost(host);
  const last = useRef(choice);
  if (choice) last.current = choice;
  const shown = last.current;
  useLayoutEffect(() => {
    if (!element) return;
    element.classList.toggle('on', !!choice);
    element.setAttribute('aria-hidden', String(!choice));
    if (choice) { actions.follow(element); return; }
    if (element.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
  }, [choice, element]);
  const body = shown && <>
    <h2>{phrase('choose.title', { file: shown.fileName, n: shown.candidates.length })}</h2>
    <p>{phrase('choose.sub')}</p>
    {shown.candidates.map(p => <button type="button" className="opt" title={p} key={p} onClick={() => actions.choose(p)}>
      {shortPath(p.startsWith(shown.repoRoot + '/') ? p.slice(shown.repoRoot.length + 1) : p, repo)}
    </button>)}
    <button type="button" className="cancel" onClick={actions.cancel}>{phrase('choose.cancel')}</button>
  </>;
  return place(body, (ref, children) => <div className="chooser" id="chooser" role="dialog" aria-label={phrase('choose.label')} aria-hidden="true" ref={ref}>{children}</div>);
}
