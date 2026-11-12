import { memo, useLayoutEffect, useSyncExternalStore } from 'react';
import { capsuleContent, dismissOnce, subscribeCapsule, type CapsuleContent } from '../../legacy/js/capsule.js';
import { useHost } from '../host';
import { useMessages } from '../messages';

// 아래에 떠 있는 캡슐 — 오류 · 잠깐의 알림 · 처음 한 번 안내. 보드와 한 장이 함께 쓴다. 가리킨 결과는 그림 밖 카드가 말한다(D-162).
// 내용은 capsule.js 의 저장소가 갖는다 — 기존 모듈도 그리로 알린다. content 를 주면(Storybook) 저장소 대신 그것을 그린다.
export const NotificationCapsule = memo(function NotificationCapsule({ content, host }: { content?: CapsuleContent; host?: HTMLElement | null }) {
  const { phrase } = useMessages();
  const { element, place } = useHost(host);
  const live = useSyncExternalStore(subscribeCapsule, capsuleContent);
  const { error, log, once } = content ?? live;
  // 한 줄이라도 담을 것이 있을 때만 뜬다. 빈 캡슐이 그림을 가리면 패널을 없앤 뜻이 없다.
  const on = !!(error.trim() || log.trim()) || !!once;
  useLayoutEffect(() => { element?.classList.toggle('on', on); }, [element, on]);
  // 첫 문장이 요점이라 굵게 보인다.
  const [head, ...rest] = once ? once.text.split(/(?<=[.。])\s+/) : [];

  const body = <>
    <div className="cap-once" id="capOnce" hidden={!once}>
      <span id="capOnceText">{once && <><b>{head}</b>{rest.length ? ' ' + rest.join(' ') : null}</>}</span>
      <button className="cap-x" id="capOnceX" type="button" title={phrase('capsule.dismiss')} aria-label={phrase('capsule.dismiss')} onClick={dismissOnce}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="m5 5 6 6M11 5l-6 6" /></svg>
      </button>
    </div>
    <div className="cap-main"><div id="sel" className={error ? 'error' : ''}>{error}</div><div className="log" id="log">{log}</div></div>
  </>;
  return place(body, (ref, children) => <div className="capsule" id="strip" ref={ref} role="status">{children}</div>);
});
