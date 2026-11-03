import { useLayoutEffect, useRef } from 'react';
import { useHost } from '../host';
import { useMessages } from '../messages';
import type { ViewerState } from '../state';

// 그림이 소스보다 옛것이 된 이유(데몬의 stale). 이유마다 손쓸 방법이 달라 합치지 않고 그대로 보인다.
// 보드와 한 장 모두에 걸리므로 두 섹션 밖에 둔다.
export function StaleBanner({ rows, host }: { rows: ViewerState['stale'] | null; host?: HTMLElement | null }) {
  const { daemonText } = useMessages();
  const { element, place } = useHost(host);
  // 접히는 동안 옛 문구를 남겨 둔다 — 비우면 띠가 빈 채로 접힌다
  const shown = useRef<ViewerState['stale']>([]);
  if (rows?.length) shown.current = rows;
  const on = !!rows?.length;
  useLayoutEffect(() => {
    if (!element || !rows) return;
    element.classList.toggle('on', on);
    if (host) document.body.classList.toggle('stale', on);
  }, [element, host, rows, on]);

  const body = <div className="in"><div className="rows" id="staleRows">{shown.current.map((row, i) =>
    <div className="row" key={i}><span className="head">{daemonText(row.head)}</span><span className="why">{row.why.map(daemonText).join(' · ')}</span></div>)}</div></div>;
  return place(body, (ref, children) => <div className="stalebar" id="staleBar" ref={ref}>{children}</div>);
}
