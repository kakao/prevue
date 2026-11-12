import { useLayoutEffect } from 'react';
import { useHost } from '../host';
import { useMessages } from '../messages';
import type { ViewerState } from '../state';

// 빈 탭 — 탭의 파일이 지워졌거나 @Preview 를 잃었다. 옛 카드를 그 파일의 지금 모습인 척 두지 않는다. 프리뷰가 돌아오면 데몬이 다시 연다.
// 레일의 그 탭은 그대로 남는다(FileRail).
export function VacantTab({ screen, vacant, host }: { screen: ViewerState['screen'] | null; vacant: ViewerState['vacant']; host?: HTMLElement }) {
  const { phrase, daemonText } = useMessages();
  const { element, place } = useHost(host);
  useLayoutEffect(() => { if (element && screen !== null) element.hidden = screen !== 'vacant'; }, [screen, element]);
  const body = <><p className="vacant-msg" id="vacantMsg">{daemonText(vacant)}</p><p className="vacant-hint">{phrase('vacant.hint')}</p></>;
  return place(body, (ref, children) => <section id="vacantView" className="vacant" ref={ref}>{children}</section>);
}
