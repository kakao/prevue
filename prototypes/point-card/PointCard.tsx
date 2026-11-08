// 가리키기 카드 프로토타입(D-162) — 뷰어에 연결하지 않은 시안이다. 설치본(plugin/)에 실리지 않고 Storybook `프로토타입/PointCard`로만 본다.
// 값은 plugin/viewer/tokens.css 의 역할 이름만 쓰고, 문구는 strings.ts 가 갖는다. 연결할 때 viewer-src/src/components 로 옮긴다.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useMessages } from '../../viewer-src/src/messages';
import type { PointNode, TagSay } from '../../viewer-src/src/workspace/view';
import './point-card.css';

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

/** 멘션(`@절대경로#L라인`)이나 미리 보인 `파일명:라인`에서 보일 글자를. 뷰어 PointOverlay.tsx 의 사본이다. */
function tagText(ref: string) {
  const m = /#L(\d+)$/.exec(ref);
  const path = ref.replace(/^@/, '').replace(/#L\d+$/, '');
  return m ? `${path.slice(path.lastIndexOf('/') + 1)}:${m[1]}` : path;
}
/** 저장소 기준 경로 — `src/main/kotlin/<패키지>` 는 파일명이 이미 말하는 것이라 …로 접는다. 뷰어 PointOverlay.tsx 의 사본이다. */
function shortPath(path: string, repo: string | null | undefined) {
  const rel = repo && path.startsWith(repo + '/') ? path.slice(repo.length + 1) : path;
  const cut = rel.lastIndexOf('/') + 1, src = rel.indexOf('/src/');
  return (src > 0 && src < cut ? rel.slice(0, src) + '/…/' : rel.slice(0, cut)) + rel.slice(cut);
}

export type CardPreview = { id: string; name: string };
export type CardRow = { id: string; name: string };
/** 트리 — 조상 전체, 가리킨 노드와 그 앞뒤 형제, 가리킨 노드의 직계 자식. 줄은 이름만이다. */
export type CardTree = { ups: CardRow[]; here: CardRow; before: CardRow[]; after: CardRow[]; downs: CardRow[] };
/** peek 은 트리 줄에 올린 노드(벗어나면 null)라 그림 위에 반투명 바탕으로 짚고, pick 은 그림을 누른 것과 같다. */
export type CardActions = { pick(row: CardRow): void; peek(row: CardRow | null): void; jump(preview: CardPreview): void; close(): void };
const NO_ACTIONS: CardActions = { pick() {}, peek() {}, jump() {}, close() {} };
/** 출처 — 프로젝트 컴포저블이면 정의 모듈, Compose 기본이면 'compose', 모르면 null. */
export type CardOrigin = { module: string } | 'compose' | null;

/** 노드의 크기와 여백. padding 은 왼쪽 · 위 · 오른쪽 · 아래 순서이고 dp 다. */
export type CardBox = { width: number; height: number; padding?: readonly [number, number, number, number] };
/** modifier 체인의 한 칸 — 적힌 순서대로다. value 는 보일 모양 그대로(문자열은 따옴표째)이고, sizes 는 이 칸이 정한 축, color 는 견본이다. */
export type CardModifier = { name: string; value?: string; color?: string; sizes?: Array<'width' | 'height'> };
/** 크기 그림의 비율을 이 안에서만 따른다 — 띠나 기둥처럼 긴 노드도 56px 칸에서 모양이 읽히게. */
const GLYPH_RATIO: readonly [number, number] = [0.5, 3.2];
/** 위 두 칸만 파일 트리처럼 들여 쓴다 — 깊이 22를 다 들이면 카드 폭을 먹는다. 그 위의 조상은 왼쪽에 나란히 선다. */
const NESTED_UPS = 2;

/** dp 는 px 를 밀도로 나눈 값이라 정수로 떨어지지 않는다 — 소수 한 자리까지, 정수면 소수점 없이. */
const dp = (n: number) => String(Math.round(n * 10) / 10);
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function TreeRow({ row, here, actions, children }: { row: CardRow; here?: boolean; actions: CardActions; children?: ReactNode }) {
  return <li className={`pc-node${here ? ' here' : ''}`} data-id={row.id}>
    <div className="pc-row" onMouseEnter={() => actions.peek(row)} onMouseLeave={() => actions.peek(null)}>
      <button type="button" className="pc-pick" aria-current={here ? 'true' : undefined} onFocus={() => actions.peek(row)} onBlur={() => actions.peek(null)} onClick={() => actions.pick(row)}>{row.name}</button>
    </div>
    {children}
  </li>;
}

/**
 * 가리킨 노드가 바뀌면 새 자식 묶음은 펼치고, 옛 노드가 형제나 자식으로 남으면 그 아래의 옛 자식 묶음을 같은 시간에 접어 걷는다.
 * 처음 그릴 때는 펼치지 않는다 — 바뀐 적이 있어야 moved 가 선다.
 */
function Tree({ tree, actions, settled }: { tree: CardTree; actions: CardActions; settled(): void }) {
  const { ups, here, before, after, downs } = tree;
  const [ghost, setGhost] = useState<{ at: string; rows: CardRow[] } | null>(null);
  const [moved, setMoved] = useState(false);
  const prev = useRef<{ here: string; downs: CardRow[] } | null>(null);
  useLayoutEffect(() => {
    const p = prev.current;
    if (p && p.here !== here.id) {
      setMoved(true);
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
  const leaves = downs.length ? <div key={`unfold-${here.id}`} className={moved ? 'pc-unfold' : undefined} onAnimationEnd={e => { if (e.target === e.currentTarget) settled(); }}>
    <ul className="pc-group">{downs.map(side)}</ul>
  </div> : null;
  const level = <>{before.map(side)}<TreeRow key={here.id} row={here} here actions={actions}>{leaves}</TreeRow>{after.map(side)}</>;
  const cut = Math.max(0, ups.length - NESTED_UPS);
  const nested = ups.slice(cut).reduceRight<ReactNode>((inner, r) => <TreeRow key={r.id} row={r} actions={actions}><ul className="pc-group">{inner}</ul></TreeRow>, level);
  return <ul className="pc-tree">{ups.slice(0, cut).map(r => <TreeRow key={r.id} row={r} actions={actions} />)}{nested}</ul>;
}

/** 자동 복사가 막혔을 때만 파일 줄 끝에 선다. 누르는 순간(사용자 제스처) 넣고 사라지고, 그래도 막히면 `복사할 수 없음`으로 남는다. */
function CopyRescue({ say }: { say: TagSay }) {
  const { phrase } = useMessages();
  const [gone, setGone] = useState(false), [failed, setFailed] = useState(false);
  useEffect(() => { setGone(false); setFailed(false); }, [say.ref, say.copied]);
  if (say.copied !== false || gone) return null;
  if (failed) return <span className="pc-rescue off">{phrase('point.card.blocked')}</span>;
  const press = () => {
    if (say.again) { say.again(); setGone(true); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(say.ref || '') : Promise.reject()).then(() => setGone(true), () => setFailed(true));
  };
  return <button type="button" className="pc-rescue" title={phrase('point.card.rescue.title', { ref: say.ref ?? '' })} onClick={press}>{phrase('point.card.rescue')}</button>;
}

function OriginChip({ origin }: { origin: CardOrigin }) {
  const { phrase } = useMessages();
  if (!origin) return null;
  if (origin === 'compose') return <span className="pc-chip compose" title={phrase('point.card.compose.title')}>{phrase('point.card.compose')}</span>;
  return <span className="pc-chip module" title={phrase('point.card.module.title', { module: origin.module })}>{origin.module}</span>;
}

/** 크기 한 줄 — 56px 칸에 비율 그림(여백이 있으면 안쪽 점선 상자)과 `너비 × 높이 dp`. 출처 · 여백 값은 체인이 말한다. */
function SizeRow({ box }: { box: CardBox }) {
  const padded = !!box.padding?.some(v => v !== 0);
  const raw = box.width > 0 && box.height > 0 ? box.width / box.height : 1;
  const ratio = Math.min(GLYPH_RATIO[1], Math.max(GLYPH_RATIO[0], raw));
  return <div className="pc-size">
    <div className="pc-glyph"><div className={`pc-shape${padded ? ' padded' : ''}`} style={{ '--ratio': ratio } as CSSProperties}>{padded && <i />}</div></div>
    <div className="pc-dims">{dp(box.width)}<i>×</i>{dp(box.height)}<span className="pc-unit">dp</span></div>
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
  return <ol className="pc-mods pc-scroll" tabIndex={0}>{modifiers.map((m, i) => { const kind = modifierKind(m); return <li key={`${i}-${m.name}`}>
    {kind ? <span className="pc-kind" title={phrase(`point.card.kind.${kind}`)} aria-label={phrase(`point.card.kind.${kind}`)}>{KIND[kind]}</span> : <span className="pc-kind" />}
    <span className="pc-mod-name">{m.name}</span>
    {(m.value || m.color) && <span className="pc-mod-value" title={m.value}>{m.color && <i className="pc-swatch" style={{ background: m.color }} />}<span>{m.value}</span></span>}
  </li>; })}</ol>;
}

/**
 * 가리킨 결과의 카드(D-162) — 머리(이름 · 출처 · 파일:라인) → 트리 → 설명 패널(크기 · Modifier 체인)을 탭 없이 쌓는다.
 * tree · modifiers 가 null 이면 그 칸을 숨긴다. 트리 칸 높이는 고정이라 노드를 옮겨도 그 아래 설명 패널이 제자리에 있다.
 * previews 는 가리킨 노드의 Preview(지금 보는 것을 뺀 도착지)이고 머리의 버튼 하나가 갖는다.
 */
export function PointCard({ node, box, modifiers, say, tree, previews = [], origin = null, repo, actions = NO_ACTIONS }: {
  node: PointNode; box: CardBox; modifiers: CardModifier[] | null; say: TagSay; tree: CardTree | null;
  previews?: CardPreview[]; origin?: CardOrigin; repo?: string | null; actions?: CardActions;
}) {
  const { phrase } = useMessages();
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
  const full = say.file ? `${shortPath(say.file, repo)}:${node.lineNumber}` : say.ref && tagText(say.ref);
  const where = full ? full.slice(full.lastIndexOf('/') + 1) : '';
  const many = previews.length > 1;
  const jumpLabel = many ? phrase('point.card.previews', { n: previews.length }) : previews[0] && phrase('point.card.jump', { name: previews[0].name });
  // 노드가 바뀌면 머리 글자와 설명을 새로 붙여 페이드로 갈아든다.
  const swap = hereId ?? `${node.name}:${node.lineNumber}`;
  return <section className="point-card" aria-label={phrase('point.card.label')}>
    <div className="pc-body">
      <header className="pc-head">
        <div className="pc-id pc-swap" key={`id-${swap}`}>
          <span className="pc-nameline"><span className="pc-name" title={node.name || undefined}>{node.name || node.fileName}</span><OriginChip origin={origin} /></span>
          {say.ref && <span className="pc-refline"><span className="pc-ref" title={full || say.ref}>{where}</span><CopyRescue say={say} /></span>}
        </div>
        {jumpLabel && <button type="button" className="pc-jump" title={jumpLabel} aria-label={jumpLabel} aria-expanded={many ? listOpen : undefined}
          onClick={() => many ? setListOpen(o => !o) : actions.jump(previews[0])}>{JUMP}{many && <span>{previews.length}</span>}</button>}
        <button type="button" className="pc-close" title={phrase('point.card.close')} aria-label={phrase('point.card.close')} onClick={actions.close}>{CLOSE}</button>
      </header>
      {many && <div className="pc-fold" data-open={listOpen || undefined} inert={!listOpen}><ul className="pc-previews">{previews.map(p => <li key={p.id}>
        <button type="button" className="pc-preview" title={p.name} onClick={() => actions.jump(p)}>{JUMP}<span>{p.name}</span></button>
      </li>)}</ul></div>}
      {!say.ref && <p className="pc-msg">{say.msg}</p>}
      {tree && <div className="pc-panel pc-tree-panel pc-scroll" ref={panel}><Tree tree={tree} actions={actions} settled={() => center(true)} /></div>}
      <div className="pc-panel pc-detail">
        <div className="pc-detail-in pc-swap" key={`detail-${swap}`}>
          <SizeRow box={box} />
          {modifiers && modifiers.length > 0 && <ModifierRows modifiers={modifiers} />}
        </div>
      </div>
    </div>
  </section>;
}
