import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { fetchGalleryCard, post } from '../runtime/api';
import { flash } from '../runtime/capsule';
import { store } from '../runtime/store';
import { useHost } from '../host';
import { useMessages, type Messages } from '../messages';
import type { PreviewFile } from '../match';
import { activeKey, type ViewerState } from '../state';
import { byChanged, cardKey, changedAgo, commonHead, moduleOf, packageOf, stemOf } from '../gallery/cards';
import { createCardQueue, type CardQueue, type CardView } from '../gallery/queue';
import { closeGallery, currentLayer, filesStale, galleryShown, loadFiles, markShown, openGallery, useLayer } from '../gallery/layer';
import { fit, fontOf } from './fit';

// 갤러리(D-198 · D-200 · D-201) — 이 데몬이 열 수 있는 프리뷰 파일 전부를 최근 바뀐 순의 같은 크기 카드로 보인다.
// 탭이 0개면 시작 화면이고, 탭이 있으면 보드의 위층이다(보드에서 Esc · 레일 맨 위 「모든 Preview」). 층은 뷰어만 알고 데몬 상태는 그대로다.
// 카드는 판과 글자를 먼저 깔고, 화면에 든 카드의 그림만 줄(gallery/queue.ts)이 하나씩 데몬에 묻는다. 카드를 고르면 그 파일의 탭과 보드가 열린다.

const queue = createCardQueue(fetchGalleryCard);

/* ---------- 화면에 들었나 — 카드마다 관찰자를 두지 않고 둘을 함께 쓴다 ---------- */
type Watch = { add(el: Element, cb: (on: boolean) => void): () => void };
function watcher(rootMargin: string): () => Watch {
  let w: Watch | null = null;
  return () => w ??= (() => {
    const cbs = new Map<Element, (on: boolean) => void>();
    const io = new IntersectionObserver(es => { for (const e of es) cbs.get(e.target)?.(e.isIntersecting); }, { rootMargin });
    return { add(el, cb) { cbs.set(el, cb); io.observe(el); return () => { cbs.delete(el); io.unobserve(el); }; } };
  })();
}
// 그릴 카드 — 화면 안. 미리 그리지 않는다(D-200).
const inView = watcher('0px');
// 그림을 붙여 둘 카드 — 위아래 두 화면. 그 밖은 img 를 떼어 디코딩한 그림을 놓는다(결과의 주소는 남는다).
const nearView = watcher('200% 0px');

/* ---------- 카드 ---------- */
const Stack = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 2.5h7.5V12M3.5 4.5h7v9.5h-7z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>;
const Folder = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4.5V12.5h12V5.5H8L6.5 4H2z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>;
const Grid = () => <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 3h5v5H3zM10 3h5v5h-5zM3 10h5v5H3zM10 10h5v5h-5z" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;

/** 한 줄 글자의 가운데 줄임 — 폭은 카드가 정해 잰 뒤에만 안다. 줄였으면 툴팁이 전체를 말한다. */
function Fitted({ text, className }: { text: string; className: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shownText, setShown] = useState(text);
  useLayoutEffect(() => {
    const el = ref.current!;
    const apply = () => { if (el.clientWidth) setShown(fit(text, el.clientWidth, fontOf(el))); };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);
  return <span ref={ref} className={className} title={shownText === text ? undefined : text}>{shownText}</span>;
}

export type CardText = { name: string; pkg: string; mod: string; changed: string };

/** 접힌 카드 — 그림 칸은 크기가 늘 같고(4:3), 그림이 오면 그 자리에서 떠오른다. 대기 · 묻는 중은 같은 로딩 판이다. */
export const GalleryCard = memo(function GalleryCard({ text, view, near = true, onOpen }: { text: CardText; view: CardView; near?: boolean; onOpen?: () => void }) {
  const { phrase, daemonText } = useMessages();
  const state = view.status === 'done' ? 'done' : view.status === 'error' ? 'failed' : 'loading';
  const tall = view.status !== 'done' || view.image.w <= view.image.h;
  const sheets = view.status === 'done' ? view.sheets : 0;
  return <article className="gcard" data-state={state} aria-busy={state === 'loading'}>
    <button className="gcard-hit" type="button" onClick={onOpen}>
      <span className="gcard-cover">
        {view.status === 'error'
          ? <span className="gcard-failed" title={daemonText(view.failure) || undefined}>{phrase('gallery.failed')}</span>
          : <span className="gcard-stack" data-o={tall ? 'tall' : 'wide'}>
              <span className="gcard-shot">{view.status === 'done' && near
                ? <img src={view.image.url} width={view.image.w} height={view.image.h} alt="" decoding="async" onLoad={e => e.currentTarget.classList.add('in')} />
                : <span className="gcard-ph" />}</span>
            </span>}
        {sheets > 1 && <span className="gcard-count" aria-label={phrase('board.count', { n: sheets })}><Stack />{sheets}</span>}
      </span>
      <span className="gcard-body">
        <Fitted className="gcard-file" text={text.name} />
        <span className="gcard-pkgrow"><Folder /><Fitted className="gcard-pkg" text={text.pkg} /></span>
        <span className="gcard-foot">{text.mod && <span className="gcard-mod">{text.mod}</span>}<span className="gcard-info">{text.changed}</span></span>
      </span>
    </button>
  </article>;
});

function LiveCard({ f, order, text, cards, onOpen }: { f: PreviewFile; order: number; text: CardText; cards: CardQueue; onOpen: (f: PreviewFile) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const key = cardKey(f);
  const view = useSyncExternalStore(cards.subscribe, () => cards.get(key));
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current!;
    const off = inView().add(el, on => (on ? cards.want(key, f.path, order) : cards.drop(key)));
    const offNear = nearView().add(el, setNear);
    return () => { off(); offNear(); cards.drop(key); };
  }, [key, order, cards]);
  return <div ref={ref} className="gcard-slot" data-path={f.path}><GalleryCard text={text} view={view} near={near} onOpen={() => onOpen(f)} /></div>;
}

/** 카드를 고르면 탭과 보드 — 지금 탭의 파일이면 층만 닫는다. 실패는 캡슐이 말한다. */
async function openFile(f: PreviewFile, { phrase, daemonText }: Messages) {
  if (f.path === activeKey(store.st)) { closeGallery(); return; }
  const r = await post('/viewer/open', { file: f.path }).then(r => r.json()).catch((e: Error) => ({ ok: false, message: phrase('open.failed', { why: e.message }) }));
  if (!r.ok) flash(daemonText(r.message) || phrase('open.cannot'));
}

/** 격자 — 화면을 모른다. Storybook 은 가짜 줄과 목록을 넣는다. */
export function GalleryGrid({ files, ready, cards, now = Date.now(), onOpen }: {
  files: PreviewFile[] | null; ready: boolean; cards: CardQueue; now?: number; onOpen: (f: PreviewFile) => void;
}) {
  const { phrase } = useMessages();
  const sorted = useMemo(() => (files ? byChanged(files) : null), [files]);
  const head = useMemo(() => (files ? commonHead(files) : []), [files]);
  const lang = document.documentElement.lang || 'en';
  return <div className="gallery-in">
    <div className="gallery-head">
      <h1 className="gallery-title">{phrase('gallery.title')}</h1>
      {sorted && <span className="gallery-n">{sorted.length}</span>}
      <span className="gallery-sort">{phrase('gallery.sort')}</span>
    </div>
    {!sorted || (!ready && !sorted.length) ? <p className="gallery-note">{phrase('quickopen.loading')}</p>
      : !sorted.length ? <p className="gallery-note">{phrase('quickopen.none')}</p>
      : <div className="gallery-grid">{sorted.map((f, i) => <LiveCard key={f.path} f={f} order={i} cards={cards} onOpen={onOpen}
          text={{ name: stemOf(f), pkg: packageOf(f, head), mod: moduleOf(f.module), changed: changedAgo(f.mtime, now, phrase, lang) }} />)}</div>}
  </div>;
}

/**
 * 뷰어의 갤러리 — 보일지는 ViewerRoot 가 정해 넘긴다(보드 · 빈 탭의 hidden 과 한 커밋에서 맞아야 한다).
 * 이 컴포넌트는 보드보다 먼저 효과가 돈다 — 보드가 숨기 전의 스크롤을 적어 두고, 층을 오갈 때 각자의 자리로 돌려준다.
 */
export function Gallery({ shown: on, state, draw, host }: { shown: boolean; state: ViewerState | null; draw: number; host?: HTMLElement }) {
  const messages = useMessages();
  const s = useLayer();
  const { element, place } = useHost(host);
  const scroll = useRef({ gallery: 0, board: 0, over: false });

  useLayoutEffect(() => {
    if (!state) return;
    // 연 자리를 벗어났으면(다른 탭 · 한 장) 층은 이미 안 보인다 — 돌아와도 다시 뜨지 않게 닫아 둔다.
    const l = currentLayer();
    if (l.open && (state.screen === 'focus' || activeKey(state) !== l.openedOver)) closeGallery();
  }, [draw]);

  useLayoutEffect(() => {
    if (!element) return;
    const was = galleryShown();
    markShown(on);
    element.hidden = !on;
    queue.pause(!on);
    if (on === was) return;
    const over = state?.screen === 'board' || state?.screen === 'vacant';
    if (on) {
      if (filesStale()) loadFiles();
      if (over) scroll.current.board = scrollY;
      scroll.current.over = over;
      const y = scroll.current.gallery;
      queueMicrotask(() => scrollTo(0, y));
    } else {
      scroll.current.gallery = scrollY;
      // 사람이 같은 보드로 물러났을 때만 보던 자리로 — 다른 탭이 열렸으면 그 탭의 자리는 session.ts 가 돌려준다.
      if (scroll.current.over && over && activeKey(state) === currentLayer().openedOver) { const y = scroll.current.board; queueMicrotask(() => scrollTo(0, y)); }
    }
  }, [on, element]);

  const onOpen = (f: PreviewFile) => openFile(f, messages);
  return place(<GalleryGrid files={s.files} ready={s.ready} cards={queue} onOpen={onOpen} />,
    (ref, body) => <section id="galleryView" className="gallery" ref={ref}>{body}</section>);
}

/** 레일 맨 위 「모든 Preview」 — 갤러리의 눈에 보이는 입구. 갤러리에 있는 동안 고른 줄이다. */
export function GalleryEntry({ on, count, host }: { on: boolean; count: number | null; host?: HTMLElement | null }) {
  const { phrase } = useMessages();
  const { element, place } = useHost(host);
  useLayoutEffect(() => {
    if (!element) return;
    element.classList.toggle('on', on);
    if (on) element.setAttribute('aria-current', 'page'); else element.removeAttribute('aria-current');
  }, [element, on]);
  useLayoutEffect(() => {
    if (!element) return;
    const click = () => { if (!on) openGallery(); };
    element.addEventListener('click', click);
    return () => element.removeEventListener('click', click);
  }, [element, on]);
  const body = <><Grid /><span className="rail-open-t">{phrase('rail.all')}</span>{count != null && <span className="rail-all-n">{count}</span>}</>;
  return place(body, (ref, children) => <button className={on ? 'rail-all on' : 'rail-all'} id="railAll" ref={ref} type="button">{children}</button>);
}
