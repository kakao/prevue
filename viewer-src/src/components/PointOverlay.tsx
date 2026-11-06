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

/** 노드의 크기와 여백. padding 은 왼쪽 · 위 · 오른쪽 · 아래 순서이고 dp 다. */
export type CardBox = { width: number; height: number; padding?: readonly [number, number, number, number] };
/** modifier 체인의 한 칸 — 적힌 순서대로다. sizes 는 이 칸이 정한 축이고, 색이 있으면 color 로 견본을 그린다. */
export type CardModifier = { name: string; value?: string; color?: string; sizes?: Array<'width' | 'height'> };
/** 그림의 비율을 이 안에서만 따른다 — 띠처럼 긴 노드가 칸에서 사라지지 않게. */
const MODEL_MAX_RATIO = 2.4;

/** dp 는 px 를 밀도로 나눈 값이라 정수로 떨어지지 않는다 — 소수 한 자리까지, 정수면 소수점 없이. */
const dp = (n: number) => String(Math.round(n * 10) / 10);

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

/** 칸 안의 상자 — 가로세로 비율만 그림을 따르고, 여백은 숫자가 들어가도록 고정 폭 고리로 그린다. */
function BoxModel({ box }: { box: CardBox }) {
  const ratio = Math.min(MODEL_MAX_RATIO, Math.max(1 / MODEL_MAX_RATIO, box.width / box.height));
  const [left, top, right, bottom] = box.padding || [0, 0, 0, 0];
  return <div className={`pc-model${box.padding ? ' padded' : ratio > 1 ? ' wide' : ''}`} style={box.padding ? undefined : { aspectRatio: ratio }}>
    {box.padding && <>
      <span className="pc-gap top">{dp(top)}</span><span className="pc-gap right">{dp(right)}</span>
      <span className="pc-gap bottom">{dp(bottom)}</span><span className="pc-gap left">{dp(left)}</span>
      <i />
    </>}
  </div>;
}

function SizeLine({ axis, value, by }: { axis: 'width' | 'height'; value: number; by?: CardModifier }) {
  const { phrase } = useMessages();
  return <div className="pc-axis">
    <dt>{phrase(`point.card.${axis}`)}</dt>
    <dd><strong>{dp(value)}</strong> dp</dd>
    {by && <dd className="pc-by">{by.value ? `${by.name}(${by.value})` : by.name}</dd>}
  </div>;
}

function ModifierRows({ modifiers }: { modifiers: CardModifier[] }) {
  const { phrase } = useMessages();
  return <ol className="pc-mods">{modifiers.map((m, i) => <li key={`${i}-${m.name}`}>
    <span className="pc-mod-name">{m.name}</span>
    {m.color && <i className="pc-swatch" style={{ background: m.color }} />}
    {m.value && <span className="pc-mod-value" title={m.value}>{m.value}</span>}
    {m.sizes?.map(axis => <span className="pc-mod-axis" key={axis}>{phrase(`point.card.${axis}`)}</span>)}
  </li>)}</ol>;
}

type CardTab = 'modifiers' | 'tree';

/**
 * 가리킨 결과의 카드(D-162) — 이 노드의 크기가 어디서 왔고 어떤 modifier 를 거쳤는지를 보인다.
 * modifiers · rows 가 null 이면 그 탭을 숨긴다. 탭 칸의 높이는 고정이라 옮겨도 카드가 출렁이지 않고, 트리는 가리킨 줄을 가운데에 둔다.
 */
export function PointCard({ node, box, facts = [], modifiers, say, rows, state, tab: firstTab = 'modifiers', actions = NO_CARD_ACTIONS, tabs = NO_ACTIONS }: { node: PointNode; box: CardBox; facts?: string[]; modifiers: CardModifier[] | null; say: TagSay; rows: CardRow[] | null; state: ViewerState | null; tab?: CardTab; actions?: CardActions; tabs?: PointActions }) {
  const { phrase } = useMessages();
  const [picked, setTab] = useState<CardTab>(firstTab);
  const shown = ([modifiers && 'modifiers', rows && 'tree'] as Array<CardTab | null>).filter((t): t is CardTab => !!t);
  const tab = shown.includes(picked) ? picked : shown[0];
  const tree = useRef<HTMLUListElement>(null);
  useLayoutEffect(() => {
    const list = tree.current, here = list?.querySelector<HTMLElement>('.pc-node.here > .pc-row');
    if (!list || !here) return;
    const b = list.getBoundingClientRect(), r = here.getBoundingClientRect();
    list.scrollTop += r.top - b.top - (list.clientHeight - r.height) / 2;
  }, [rows, tab]);
  const label = tabLabel(say.file, state, phrase);
  const where = say.file ? `${shortPath(say.file, state?.header?.repo)}:${node.lineNumber}` : say.ref && tagText(say.ref);
  const cut = (where || '').lastIndexOf('/') + 1;
  const by = (axis: 'width' | 'height') => modifiers?.find(m => m.sizes?.includes(axis));
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
    <div className="pc-hero">
      <div className="pc-stage"><BoxModel box={box} /></div>
      <dl className="pc-axes"><SizeLine axis="width" value={box.width} by={by('width')} /><SizeLine axis="height" value={box.height} by={by('height')} /></dl>
    </div>
    {facts.length > 0 && <ul className="pc-facts">{facts.map(f => <li key={f} title={f}>{f}</li>)}</ul>}
    {tab && <div className="pc-section">
      <div className="pc-tabs" role="tablist">{shown.map(t => <button type="button" role="tab" key={t} aria-selected={t === tab} onClick={() => setTab(t)}>{phrase(`point.card.tab.${t}`)}</button>)}</div>
      {tab === 'modifiers' ? <div className="pc-panel" role="tabpanel"><ModifierRows modifiers={modifiers!} /></div>
        : <ul className="pc-panel pc-tree" role="tabpanel" ref={tree}><TreeRows rows={rows!} actions={actions} /></ul>}
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
