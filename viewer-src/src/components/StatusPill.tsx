import { useLayoutEffect, useRef } from 'react';
import type { Connection } from '../session';
import { useHost } from '../host';
import { useMessages } from '../messages';
import type { ViewerState } from '../state';

export type PillState = 'none' | 'busy' | 'idle' | 'over' | 'error';

/**
 * 툴바의 상태 — 점 하나와 한 줄. 일하는 중이면 무엇을 하는지(데몬의 진행 문장 · 보드가 다 찰 때까지 `12/25`), 아니면 첫 장 시간.
 * 시간 내역 · 누가 · 언제는 호버해야 보인다. 주황은 시간 줄 하나라도 그 일의 기준을 넘었을 때다(D-63).
 * 다시 시작 · 끊김(connection)은 데몬 상태 밖의 사건이라 상태보다 앞선다(D-112).
 */
export function StatusPill({ state, connection = null, host, bar }: {
  state: ViewerState | null;
  connection?: Connection | null;
  host?: HTMLElement | null;
  bar?: HTMLElement | null;
}) {
  const { phrase, daemonText } = useMessages();
  const { element, place } = useHost(host);
  const restarted = useRef(false);
  if (connection === 'restarting') restarted.current = true;

  const head = state?.timing.find(p => p.head);
  const over = !!state?.timing.some(p => p.over);
  const failed = !!state && (!!state.error || state.stale.length > 0 || !!state.board?.groups.some(g => g.failed));
  // 모양이 뜻이다 — ✓ 끝 · 도는 표시 그리는 중 · ! 실패. 아직 그린 적이 없으면(시작 화면) 아무것도 없다.
  let pill: PillState = !state ? 'none' : state.busy ? 'busy' : failed ? 'error' : over ? 'over' : head ? 'idle' : 'none';
  let text = !state ? '' : state.busy ? daemonText(state.boardNote) : head ? head.text : '';
  if (connection === 'restarting') { pill = 'busy'; text = phrase('status.restarting'); }
  if (connection === 'lost') { pill = 'error'; text = phrase('status.lost.short'); }
  const busy = restarted.current || !!state?.busy;

  useLayoutEffect(() => {
    if (!element || (!state && !connection)) return;
    element.dataset.state = pill;
  }, [element, state, connection, pill]);
  useLayoutEffect(() => {
    if (!bar || (!state && !connection)) return;
    bar.classList.toggle('busy', busy);
  }, [bar, state, connection, busy]);

  const body = <>
    <span className="st-ic" aria-hidden="true">
      <svg className="i-ok" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3.5 8.5 3 3 6-7" /></svg>
      <svg className="i-busy" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 2.5a5.5 5.5 0 1 1-5.5 5.5" /></svg>
      <svg className="i-bad" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.5" fill="currentColor" /><path className="mark" d="M8 4.8v3.8" strokeWidth="1.7" strokeLinecap="round" /><circle className="mark" cx="8" cy="11.2" r=".95" /></svg>
    </span><span className="st-text" id="statusText">{text}</span>
    <div className="pop" role="tooltip">
      <div className="note" id="note">{daemonText(state?.boardNote ?? null)}</div>
      <div className="who" id="who">{daemonText(state?.who ?? null)}</div>
      <div className="settle" id="settle">{daemonText(state?.settle ?? null)}</div>
      <div className="timing" id="timing">{state?.timing.flatMap((p, i) => [
        <span key={`k${i}`} className={p.over ? 'over' : undefined}>{daemonText(p.label)}</span>,
        <b key={`v${i}`} className={p.over ? 'over' : undefined}>{p.text}</b>,
      ])}</div>
      {/* 포트는 헤더에서 뺀 개발 정보 — 필요한 사람만 호버로 본다(B4). 저장소 경로는 부제의 폴더 칸이 갖는다(D-60). */}
      <div className="where" id="where">{state ? location.host : ''}</div>
    </div>
  </>;
  return place(body, (ref, children) => <div className="status" id="status" ref={ref} tabIndex={0} data-state="none">{children}</div>);
}
