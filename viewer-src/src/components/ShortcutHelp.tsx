import { memo, useLayoutEffect, useRef } from 'react';
import { useHost } from '../host';
import { useMessages } from '../messages';
import type { ShortcutGroup } from '../shortcuts';

// 단축키 도움말. 내용은 단축키 표가 채운다 — 디스패치와 같은 표라 둘이 어긋나지 않는다.
// 열림은 이 값 하나가 정한다. hidden · .on 은 전환 때문에 늦게 바뀌어(뒤에 있는 탭은 타이머가 더 늦다) 판정에 쓰지 않는다.
let helpIsOpen = false, lastFocus: HTMLElement | null = null;
let parts: { scrim: HTMLElement; sheet: HTMLElement } | null = null;
let button: HTMLElement | null = null;
export const helpOpen = () => helpIsOpen;

/**
 * byKey 면 키보드로 연 것이라 닫을 때 연 자리로 포커스를 돌려준다. 마우스로 열었으면 돌려주지 않는다 —
 * 돌려주면 `?` 버튼이 포커스를 쥐고, 다음 Enter(고른 카드 열기)가 도움말을 다시 열었다(D-63).
 */
export function toggleHelp(on = !helpIsOpen, byKey = false) {
  if (!parts) return;
  const { scrim, sheet } = parts;
  if (on && !helpIsOpen) lastFocus = byKey && document.activeElement !== document.body ? document.activeElement as HTMLElement : null;
  helpIsOpen = on;
  if (on) {
    scrim.hidden = false;
    requestAnimationFrame(() => { if (helpIsOpen) { scrim.classList.add('on'); sheet.focus({ preventScroll: true }); } });
  } else {
    scrim.classList.remove('on');
    // 사라지는 전환이 끝난 뒤 뺀다 — hidden 을 바로 걸면 페이드가 없다.
    setTimeout(() => { if (!helpIsOpen) scrim.hidden = true; }, 220);
    if (scrim.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
    if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
  }
  button?.setAttribute('aria-expanded', String(on));
}

export const ShortcutHelp = memo(function ShortcutHelp({ table, logo = 'prevue.svg', host }: { table: ShortcutGroup[]; logo?: string; host?: HTMLElement | null }) {
  const { phrase } = useMessages();
  const { element, place } = useHost(host);
  const sheet = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!element || !sheet.current) return;
    parts = { scrim: element, sheet: sheet.current };
    const outside = (e: MouseEvent) => { if (e.target === element) toggleHelp(false); };
    element.addEventListener('click', outside);
    return () => { element.removeEventListener('click', outside); parts = null; };
  }, [element]);

  const body = <div className="sheet" ref={sheet} role="dialog" aria-modal="true" aria-labelledby="helpTitle" tabIndex={-1}>
    <div className="sheet-brand"><img src={logo} alt="" />Prevue</div>
    <h2 id="helpTitle">{phrase('help.title')}</h2>
    <div className="sheet-body">{table.map(g => [
      <h3 key={`h${g.group}`}>{g.group}</h3>,
      <dl key={`l${g.group}`}>{g.rows.map((r, i) => [
        // 같이 누르는 키는 + 로 잇고, 둘 중 하나인 키는 나란히 둔다.
        <dt key={`t${i}`}>{r.cap.map((c, j) => [j && r.combo ? <span key={`p${j}`} className="plus">+</span> : null, <kbd key={`k${j}`}>{c}</kbd>])}</dt>,
        <dd key={`d${i}`}>{r.label}</dd>,
      ])}</dl>,
    ])}</div>
  </div>;
  return place(body, (ref, children) => <div className="scrim" id="help" ref={ref} hidden>{children}</div>);
});

/** 헤더 오른쪽의 `?` — 도움말을 여닫는다. */
export const HelpButton = memo(function HelpButton({ host }: { host?: HTMLElement | null }) {
  const { phrase } = useMessages();
  const { element, place } = useHost(host);
  useLayoutEffect(() => {
    if (!element) return;
    button = element;
    element.title = phrase('header.help.tip');
    element.setAttribute('aria-label', phrase('header.help'));
    // e.detail 이 0 이면 키보드로 누른 것이다(Enter · Space).
    const click = (e: MouseEvent) => toggleHelp(!helpIsOpen, e.detail === 0);
    element.addEventListener('click', click);
    return () => { element.removeEventListener('click', click); button = null; };
  }, [element, phrase]);
  return place('?', (ref, children) => <button className="icon-btn" id="helpBtn" ref={ref} type="button" aria-haspopup="dialog" aria-expanded="false">{children}</button>);
});
