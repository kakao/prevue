import { Fragment, useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { post } from '../../legacy/js/api.js';
import { flash } from '../../legacy/js/capsule.js';
import { useHost } from '../host';
import { useMessages } from '../messages';
import type { ViewerState } from '../state';

// 헤더 왼쪽 — 대상 앱 록업 · 부제(폴더 ⑂ 브랜치 · 모듈 · (소스 세트) · 변형). 부제에서 누를 수 있는 칸은 폴더 · 브랜치뿐이다(D-60).
// 워드마크(#brand)는 index.html 의 마크업이고 여기서는 Prevue 판을 툴팁에 단다.
export type AppInfo = { name?: string; icon?: boolean; reveal?: boolean; prevue?: string };

// 이니셜 타일의 바탕 — 이름에서 고른 차분한 색 하나(연락처 앱의 이니셜처럼). 같은 이름은 늘 같은 색이다.
const TILES = 8;
const tileOf = (title: string) => [...title].reduce((h, c) => (h * 31 + c.codePointAt(0)!) >>> 0, 7) % TILES + 1;

let closeDir = () => false;
/** Esc 가 먼저 닫는 층 가운데 하나다. 열려 있었으면 true. */
export const closeDirPop = () => closeDir();

export function ProjectHeader({ header, tabs, app, iconUrl = '/app-icon.png', host, brand }: {
  header: ViewerState['header'] | null;
  tabs: ViewerState['tabs'];
  app: AppInfo | null;
  iconUrl?: string;
  host?: HTMLElement | null;
  brand?: HTMLElement | null;
}) {
  const { phrase } = useMessages();
  const { element, place } = useHost(host);
  const [iconLoaded, setIconLoaded] = useState(false);
  const [dir, setDir] = useState<{ left: number } | null>(null);
  const dirRef = useRef({ open: false, byKey: false });
  const pjDir = useRef<HTMLButtonElement>(null);
  const dirPop = useRef<HTMLDivElement>(null);
  const tile = useRef<HTMLSpanElement>(null);

  // 파일명은 지금 탭이 말한다 — 여기는 앱(제목)과 폴더 · 브랜치 · 모듈 · 변형(부제)만. 앱 이름을 못 읽으면 폴더가 제목이다.
  const title = header ? app?.name || header.repoLeaf : '';

  useLayoutEffect(() => {
    if (brand && app?.prevue) brand.title = `Prevue ${app.prevue}`;
  }, [brand, app]);
  useLayoutEffect(() => {
    // 색은 tokens.css 의 그림 토큰(--avatar-*)이라 크롬 마크업의 style 에 쓰지 않고 여기서 단다.
    tile.current?.style.setProperty('background', header ? `var(--avatar-${tileOf(title)})` : '');
  }, [header, title]);
  useLayoutEffect(() => {
    if (!header || !host) return;
    // 브라우저 탭은 파일 — 앱(B6). macOS 창 제목처럼 문서가 앞이라 좁은 탭에서도 파일이 남는다. Prevue 는 파비콘이 말한다.
    const tab = tabs.find(t => t.active);
    document.title = tab ? `${tab.name} — ${title}` : title;
  }, [header, host, tabs, title]);

  useEffect(() => {
    closeDir = () => {
      if (!dirRef.current.open) return false;
      dirRef.current.open = false;
      // 팝오버 안에 남은 포커스는 키보드로 열었으면 폴더 칸으로 돌려주고, 아니면 놓는다(D-63).
      const active = document.activeElement as HTMLElement | null;
      if (active && dirPop.current?.contains(active)) { if (dirRef.current.byKey) pjDir.current?.focus({ preventScroll: true }); else active.blur(); }
      setDir(null);
      return true;
    };
    const outside = (e: PointerEvent) => { if (!dirPop.current?.contains(e.target as Node) && e.target !== pjDir.current) closeDir(); };
    addEventListener('pointerdown', outside);
    return () => { removeEventListener('pointerdown', outside); closeDir = () => false; };
  }, []);

  const copy = (text: string, what: string) => {
    navigator.clipboard.writeText(text).then(() => flash(phrase('header.copied', { what, text })), () => flash(text));
  };
  const openDir = (e: MouseEvent<HTMLButtonElement>) => {
    if (closeDir()) return;
    dirRef.current = { open: true, byKey: e.detail === 0 };   // 0 이면 키보드로 누른 것이다
    setDir({ left: Math.round(e.currentTarget.getBoundingClientRect().left - (element?.getBoundingClientRect().left ?? 0) - 6) });
  };

  const rest = header ? [
    header.module,
    // 소스 세트는 KMP 모듈의 파일일 때만 — 툴팁이 "Android 빌드로 그렸다"를 말한다.
    header.sourceSet && <span key="ss" title={phrase('header.sourceSet', { variant: header.variant })}>{header.sourceSet}</span>,
    header.variant,
  ].filter(Boolean).flatMap((part, i) => [' · ', <Fragment key={i}>{part}</Fragment>]) : [];

  const body = <>
    <span className="app-tile" id="appTile" ref={tile} aria-hidden="true" hidden={iconLoaded}>{[...title][0] || ''}</span>
    <img className="app-icon" id="appIcon" alt="" hidden={!iconLoaded} src={app?.icon ? iconUrl : undefined} onLoad={() => setIconLoaded(true)} />
    <div className="app-t">
      <div className="app-name" id="appName">{title}</div>
      <div className="proj" id="proj">
        <button className="pj" id="pjDir" ref={pjDir} type="button" aria-haspopup="dialog" aria-expanded={dir ? 'true' : 'false'} aria-controls="dirPop" onClick={openDir}>{header?.repoLeaf}</button>
        <button className="pj pj-br" id="pjBr" type="button" title={phrase('brand.copyBranch')} hidden={!header?.branch} onClick={() => copy(header?.branch || '', phrase('header.copy.branch'))}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><circle cx="5" cy="3.5" r="1.5" /><circle cx="5" cy="12.5" r="1.5" /><circle cx="11" cy="5.5" r="1.5" /><path d="M5 5v6M11 7c0 2.5-6 2-6 4" /></svg>
          <span id="pjBrName">{header?.branch || ''}</span>
        </button>
        <span className="pj-rest" id="pjRest">{rest}</span>
      </div>
    </div>
    {/* 부제는 말줄임(overflow: hidden)이라 팝오버를 그 밖에 둔다. 가로 자리는 폴더 칸에 맞춘다. */}
    <div className={`pop dir-pop${dir ? ' on' : ''}`} id="dirPop" ref={dirPop} role="dialog" aria-label={phrase('header.dir')} style={dir ? { left: `${dir.left}px` } : undefined}>
      {/* 줄은 `/` 뒤에서만 바꾼다 — 폴더 이름 중간에서 끊기지 않게. */}
      <div className="dir-path" id="dirPath">{(header?.repo || '').split(/(?<=\/)/).flatMap((part, i) => [part, <wbr key={i} />])}</div>
      <div className="dir-act">
        <button type="button" id="dirCopy" onClick={() => { copy(header?.repo || '', phrase('header.copy.path')); closeDir(); }}>{phrase('header.dir.copy')}</button>
        <button type="button" id="dirReveal" hidden={app ? !app.reveal : false} onClick={() => { post('/viewer/reveal'); closeDir(); }}>{phrase('header.dir.reveal')}</button>
      </div>
    </div>
  </>;
  return place(body, (ref, children) => <div className="app" id="app" ref={ref}>{children}</div>);
}
