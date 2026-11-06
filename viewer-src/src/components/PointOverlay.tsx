import { useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useHost } from '../host';
import { useMessages } from '../messages';
import type { ViewerState } from '../state';
import { tagView, type PointNode, type TagSay } from '../workspace/view';

// 가리킨 결과(FR-20 · D-101) — 박스 위 꼬리표가 `파일명:라인 · ✓ 복사됨`을 말하고, 같은 이름의 파일이 여럿이면 꼬리표에서 팝오버가 내려온다.
// 박스의 자리(보드 카드 · 한 장의 #pickBox)는 workspace/point.ts 가 재서 그리고, 꼬리표는 그 박스의 `.tag` 안에 포털로 선다.
export type PointActions = {
  /** 가리킨 파일을 탭으로(U7). */
  openFile(file: string): void;
  /** 후보 하나를 고른다 — 데몬이 기억해 한 데몬에서 두 번 묻지 않는다. */
  choose(path: string): void;
  cancel(): void;
  /** 떠 있는 동안 팝오버를 꼬리표 아래에 붙여 둔다. */
  follow(chooser: HTMLElement): void;
};
const NO_ACTIONS: PointActions = { openFile() {}, choose() {}, cancel() {}, follow() {} };

const CLOSE = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>;
const JUMP = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M2.5 11.5L6 8l2.5 2.5 2-2 3 3" /><circle cx="10.5" cy="6" r="0.75" fill="currentColor" stroke="none" /></svg>;
const CARET = <svg className="pc-caret" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4.5 2.5 8 6l-3.5 3.5" /></svg>;
const TAB = <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="3.5" width="12" height="9.5" rx="2" /><path d="M2 6.5h5.5V3.5" /></svg>;

/** 멘션(`@절대경로#L라인`)이나 미리 보인 `파일명:라인`에서 꼬리표 글자를. */
function tagText(ref: string) {
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
/** 꼬리표의 툴팁 — 클립보드에 간 모양(`@절대경로#L라인`) 그대로 · 노드 이름 · 조상 사슬. 에이전트가 읽는 모양은 바꾸지 않는다. */
export function tagTitle(node: PointNode, say: TagSay) {
  const where = (node.uchain || node.chain || []).slice(-6).join(' › ');
  return (say.ref ? [say.ref, node.name, where] : [say.msg, where]).filter(Boolean).join('\n');
}

/** 지금 탭이 아닌 파일이면 "탭으로 열기" 또는 "탭으로 가기"의 라벨, 지금 탭이면 null. */
function tabLabel(file: string | undefined, state: ViewerState | null, phrase: (key: string) => string) {
  const tabs = state?.tabs || [], tab = file ? tabs.find(t => t.key === file) : undefined;
  if (!file || tab?.active || (!tabs.length && state?.board?.file === file)) return null;
  return (tab ? phrase('point.tab.go') : phrase('point.tab.open')) + ' — ' + file.split('/').pop();
}

/**
 * 꼬리표의 안. 디렉터리 · 노드 이름 · 조상 사슬은 툴팁에 둔다 — 꼬리표는 그림 위라 짧을수록 덜 가린다(D-105).
 * 지금 탭의 파일이면 "탭으로 열기"를 달지 않고, 이미 열린 파일이면 "탭으로 가기"다.
 */
export function PointTag({ say, state, actions = NO_ACTIONS }: { say: TagSay; state: ViewerState | null; actions?: PointActions }) {
  const { phrase } = useMessages();
  if (!say.ref) return <span className="tag-ref">{say.msg || ''}</span>;
  const file = say.file, label = tabLabel(file, state, phrase);
  return <>
    <span className="tag-ref">{tagText(say.ref)}</span>
    {say.copied ? <span className="tag-ok">{phrase('point.tag.copied')}</span>
      : say.again ? <button type="button" className="tag-again" onClick={say.again}>{phrase('point.tag.retry')}</button>
      : say.copied === false ? <span className="tag-ok wait">{phrase('point.tag.blocked')}</span> : null}
    {label && <button type="button" className="tag-open" title={label} aria-label={label} onClick={() => actions.openFile(file!)}>{TAB}</button>}
  </>;
}

export type CardPreview = { id: string; name: string };
/** 트리의 한 줄 — 조상(up) · 가리킨 노드(here) · 직계 자식(down). previews 는 지금 보는 Preview를 뺀 도착지다. */
export type CardRow = { id: string; name: string; at: 'up' | 'here' | 'down'; previews?: CardPreview[] };
export type CardActions = { pick(row: CardRow): void; jump(preview: CardPreview): void; close(): void };
const NO_CARD_ACTIONS: CardActions = { pick() {}, jump() {}, close() {} };

/** dp 는 px 를 밀도로 나눈 값이라 정수로 떨어지지 않는다 — 소수 한 자리까지, 정수면 소수점 없이. */
function dpPair([a, b]: readonly [number, number], join: string) {
  const dp = (n: number) => String(Math.round(n * 10) / 10);
  return `${dp(a)}${join}${dp(b)} dp`;
}

function TreeRow({ row, actions, children }: { row: CardRow; actions: CardActions; children?: ReactNode }) {
  const { phrase } = useMessages();
  const [open, setOpen] = useState(false);
  const previews = row.previews || [], many = previews.length > 1;
  const label = many ? phrase('point.card.previews', { n: previews.length }) : previews[0] && phrase('point.card.jump', { name: previews[0].name });
  return <li className={`pc-node ${row.at}`}>
    <div className="pc-row">
      <button type="button" className="pc-pick" aria-current={row.at === 'here' ? 'true' : undefined} onClick={() => actions.pick(row)}>{row.name}</button>
      {label && <button type="button" className="pc-jump" title={label} aria-label={label} aria-expanded={many ? open : undefined}
        onClick={() => { if (many) setOpen(!open); else actions.jump(previews[0]); }}>
        {many && <span>{previews.length}</span>}{JUMP}{many && CARET}
      </button>}
    </div>
    {many && <div className="pc-fold" data-open={open || undefined} inert={!open}><ul className="pc-previews">{previews.map(p => <li key={p.id}>
      <button type="button" className="pc-preview" title={p.name} onClick={() => actions.jump(p)}><span>{p.name}</span>{JUMP}</button>
    </li>)}</ul></div>}
    {children}
  </li>;
}

/** 가리킨 줄 바로 위 몇 칸만 파일 트리처럼 들여 쓴다 — 깊이 22를 다 들이면 카드 폭을 먹는다. 그 위의 조상은 왼쪽에 나란히 선다. */
const NESTED_UPS = 2;
function TreeRows({ rows, actions }: { rows: CardRow[]; actions: CardActions }) {
  const here = rows.findIndex(r => r.at === 'here'), cut = Math.max(0, here - NESTED_UPS);
  const line = rows.slice(cut, here + 1), downs = rows.slice(here + 1);
  const leaves = downs.length ? <ul className="pc-group">{downs.map(r => <TreeRow key={r.id} row={r} actions={actions} />)}</ul> : null;
  const nested = line.reduceRight<ReactNode>((inner, r, i) => {
    const row = <TreeRow key={r.id} row={r} actions={actions}>{inner}</TreeRow>;
    return i ? <ul className="pc-group">{row}</ul> : row;
  }, leaves);
  return <>{rows.slice(0, cut).map(r => <TreeRow key={r.id} row={r} actions={actions} />)}{nested}</>;
}

/** 머리 둘째 줄 오른쪽의 복사 결과. */
function CardStatus({ say }: { say: TagSay }) {
  const { phrase } = useMessages();
  if (say.copied) return <span className="pc-status ok">{phrase('point.card.copied')}</span>;
  if (say.again) return <button type="button" className="pc-again" onClick={say.again}>{phrase('point.card.retry')}</button>;
  return say.copied === false ? <span className="pc-status">{phrase('point.card.blocked')}</span> : null;
}

/** 머리 아래의 수치 — 트리에서 셀 수 있는 깊이 · 자식은 색인이 있을 때만 있다. */
function CardSpecs({ origin, size, rows }: { origin: readonly [number, number]; size: readonly [number, number]; rows: CardRow[] | null }) {
  const { phrase } = useMessages();
  const here = rows ? rows.findIndex(r => r.at === 'here') : -1;
  const specs: Array<[string, string]> = [[phrase('point.card.position'), dpPair(origin, ', ')], [phrase('point.card.size'), dpPair(size, ' × ')]];
  if (rows) specs.push([phrase('point.card.depth'), String(here + 1)], [phrase('point.card.children'), String(rows.length - here - 1)]);
  return <dl className="pc-specs">{specs.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>;
}

/**
 * 가리킨 결과의 카드(D-162) — 꼬리표를 대신해 이름 · 복사한 자리 · 위치 · 크기와 위아래 노드를 보인다.
 * rows 가 null 이면 색인이 없는 것이라 트리 칸을 숨긴다. 트리는 카드 안의 패널에서 스크롤하고 가리킨 줄을 가운데에 둔다.
 */
export function PointCard({ node, origin, size, say, rows, state, actions = NO_CARD_ACTIONS, tabs = NO_ACTIONS }: { node: PointNode; origin: readonly [number, number]; size: readonly [number, number]; say: TagSay; rows: CardRow[] | null; state: ViewerState | null; actions?: CardActions; tabs?: PointActions }) {
  const { phrase } = useMessages();
  const tree = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    const box = tree.current, here = box?.querySelector<HTMLElement>('.pc-node.here > .pc-row');
    if (!box || !here) return;
    const b = box.getBoundingClientRect(), r = here.getBoundingClientRect();
    box.scrollTop += r.top - b.top - (box.clientHeight - r.height) / 2;
  }, [rows]);
  const label = tabLabel(say.file, state, phrase);
  const where = say.file ? `${shortPath(say.file, state?.header?.repo)}:${node.lineNumber}` : say.ref && tagText(say.ref);
  const cut = (where || '').lastIndexOf('/') + 1;
  return <section className="point-card" aria-label={phrase('point.card.label')}>
    <header className="pc-title">
      <span className="pc-name" title={node.name || undefined}>{node.name || node.fileName}</span>
      <button type="button" className="pc-close" title={phrase('point.card.close')} aria-label={phrase('point.card.close')} onClick={actions.close}>{CLOSE}</button>
    </header>
    {say.ref ? <div className="pc-mention">
      <span className="pc-ref" title={say.ref}><span>{where!.slice(0, cut)}</span><span>{where!.slice(cut)}</span></span>
      {label && <button type="button" className="pc-tab" title={label} aria-label={label} onClick={() => tabs.openFile(say.file!)}>{TAB}</button>}
      <CardStatus say={say} />
    </div> : <p className="pc-msg">{say.msg}</p>}
    <CardSpecs origin={origin} size={size} rows={rows} />
    {rows && <div className="pc-section">
      <h3 className="pc-label">{phrase('point.card.tree')}</h3>
      <ul className="pc-tree" ref={tree} aria-label={phrase('point.card.tree')}><TreeRows rows={rows} actions={actions} /></ul>
    </div>}
  </section>;
}

/** 마지막으로 가리킨 박스의 꼬리표 — 다른 박스의 꼬리표는 point.ts 가 걷는다. */
export function PointOverlay({ state, actions }: { state: ViewerState | null; actions?: PointActions }) {
  const { tag, node, say } = useSyncExternalStore(tagView.subscribe, tagView.get);
  useLayoutEffect(() => { if (tag && node && say) tag.title = tagTitle(node, say); }, [tag, node, say]);
  if (!tag || !node || !say) return null;
  return createPortal(<PointTag say={say} state={state} actions={actions} />, tag);
}

/**
 * 후보 고르기 — 같은 베이스네임이 여러 곳에 있다(state.choice). 꼬리표에서 내려오는 팝오버이고, 꼬리표가 없으면 헤더 아래 가운데.
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
