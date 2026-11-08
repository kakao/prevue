import { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
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

/**
 * 꼬리표의 안. 디렉터리 · 노드 이름 · 조상 사슬은 툴팁에 둔다 — 꼬리표는 그림 위라 짧을수록 덜 가린다(D-105).
 * 지금 탭의 파일이면 "탭으로 열기"를 달지 않고, 이미 열린 파일이면 "탭으로 가기"다.
 */
export function PointTag({ say, state, actions = NO_ACTIONS }: { say: TagSay; state: ViewerState | null; actions?: PointActions }) {
  const { phrase } = useMessages();
  if (!say.ref) return <span className="tag-ref">{say.msg || ''}</span>;
  const file = say.file, tabs = state?.tabs || [], tab = file ? tabs.find(t => t.key === file) : undefined;
  const open = !!file && !(tab && tab.active) && !(!tabs.length && state?.board?.file === file);
  const label = file ? (tab ? phrase('point.tab.go') : phrase('point.tab.open')) + ' — ' + file.split('/').pop() : '';
  return <>
    <span className="tag-ref">{tagText(say.ref)}</span>
    {say.copied ? <span className="tag-ok">{phrase('point.tag.copied')}</span>
      : say.again ? <button type="button" className="tag-again" onClick={say.again}>{phrase('point.tag.retry')}</button>
      : say.copied === false ? <span className="tag-ok wait">{phrase('point.tag.blocked')}</span> : null}
    {open && <button type="button" className="tag-open" title={label} aria-label={label} onClick={() => actions.openFile(file!)}>{TAB}</button>}
  </>;
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
