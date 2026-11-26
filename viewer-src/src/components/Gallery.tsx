import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { fetchGalleryCard, post } from '../runtime/api';
import { flash } from '../runtime/capsule';
import { store } from '../runtime/store';
import { useHost } from '../host';
import { useMessages, type Messages } from '../messages';
import type { PreviewFile } from '../match';
import { activeKey, type ViewerState } from '../state';
import { byChanged, cachedView, cardKey, changedAgo, commonHead, moduleOf, packageOf, stale as isStale, stemOf } from '../gallery/cards';
import { createCardQueue, type CardImage, type CardQueue, type CardView } from '../gallery/queue';
import { closeGallery, closeSheet, currentLayer, galleryShown, loadFiles, markShown, openGallery, openSheet, sheetClosed, useLayer } from '../gallery/layer';
import { GallerySheet } from './GallerySheet';
import { fit, fontOf } from './fit';


const queue = createCardQueue(fetchGalleryCard);

type Watch = { add(el: Element, cb: (on: boolean) => void): () => void };
function watcher(rootMargin: string): () => Watch {
  let w: Watch | null = null;
  return () => w ??= (() => {
    const cbs = new Map<Element, (on: boolean) => void>();
    const io = new IntersectionObserver(es => { for (const e of es) cbs.get(e.target)?.(e.isIntersecting); }, { rootMargin });
    return { add(el, cb) { cbs.set(el, cb); io.observe(el); return () => { cbs.delete(el); io.unobserve(el); }; } };
  })();
}
const inView = watcher('0px');
const nearView = watcher('200% 0px');

const Stack = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 2.5h7.5V12M3.5 4.5h7v9.5h-7z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>;
const Folder = () => <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4.5V12.5h12V5.5H8L6.5 4H2z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>;
const Grid = () => <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 3h5v5H3zM10 3h5v5h-5zM3 10h5v5H3zM10 10h5v5h-5z" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>;

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

const NO_GHOSTS: Array<CardImage | null> = [];

export const GalleryCard = memo(function GalleryCard({ text, view, stale = false, near = true, shown = true, onOpen, onLost }: {
  text: CardText; view: CardView; stale?: boolean; near?: boolean; shown?: boolean; onOpen?: () => void; onLost?: () => void;
}) {
  const ghosts = view.status === 'done' ? [view.front[1]?.image ?? null, view.front[2]?.image ?? null] : NO_GHOSTS;
  const { phrase, daemonText } = useMessages();
  const state = view.status === 'done' ? 'done' : view.status === 'error' ? 'failed' : 'loading';
  const tall = view.status !== 'done' || view.image.w <= view.image.h;
  const sheets = view.status === 'done' ? view.sheets : 0;
  return <article className="gcard" data-state={state} data-stale={stale || undefined} aria-busy={state === 'loading'}>
    <button className="gcard-hit" type="button" aria-haspopup="dialog" onClick={onOpen}>
      <span className="gcard-cover">
        {view.status === 'error'
          ? <span className="gcard-failed" title={daemonText(view.failure) || undefined}>{phrase('gallery.failed')}</span>
          : <span className="gcard-stack" data-o={tall ? 'tall' : 'wide'}>
              {(['r', 'l'] as const).slice(0, ghosts.filter(Boolean).length).map(g => {
                const img = shown ? ghosts[g === 'r' ? 0 : 1] : null;
                return <span key={g} className="gcard-ghost" data-g={g}>{img && <img src={img.url} width={img.w} height={img.h} alt="" decoding="async" />}</span>;
              })}
              <span className="gcard-shot">{view.status === 'done' && near
                ? <img src={view.image.url} width={view.image.w} height={view.image.h} alt="" decoding="async" onLoad={e => e.currentTarget.classList.add('in')} onError={onLost} />
                : <span className="gcard-ph" />}</span>
            </span>}
        {stale && <span className="gcard-old" title={phrase('gallery.stale.why')}>{phrase('gallery.stale')}</span>}
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

const LiveCard = memo(function LiveCard({ f, order, name, pkg, mod, changed, cards, onOpen }: {
  f: PreviewFile; order: number; name: string; pkg: string; mod: string; changed: string; cards: CardQueue; onOpen: (f: PreviewFile) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const key = cardKey(f);
  const queued = useSyncExternalStore(cards.subscribe, () => cards.get(key));
  const [broken, setBroken] = useState(false);
  const cachedCard = useMemo(() => (broken ? null : cachedView(f)), [broken, f]);
  const cached = !!cachedCard;
  const view = cachedCard ?? queued;
  const [near, setNear] = useState(false);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current!;
    const off = inView().add(el, on => { setShown(on); if (!on) cards.drop(key); else if (!cached) cards.want(key, f.path, order); });
    const offNear = nearView().add(el, setNear);
    return () => { off(); offNear(); cards.drop(key); };
  }, [key, order, cards, cached]);
  const text = useMemo(() => ({ name, pkg, mod, changed }), [name, pkg, mod, changed]);
  const open = useCallback(() => onOpen(f), [onOpen, f]);
  const lost = useCallback(() => (cached ? setBroken(true) : cards.lost(key, f.path, order)), [cached, cards, key, f, order]);
  const stale = view.status === 'done' && isStale(f, view.image);
  return <div ref={ref} className="gcard-slot" data-path={f.path}>
    <GalleryCard text={text} view={view} stale={stale} near={near} shown={shown} onOpen={open} onLost={lost} />
  </div>;
});

async function openFile(f: PreviewFile, { phrase, daemonText }: Messages) {
  if (f.path === activeKey(store.st)) { closeGallery(); return; }
  const r = await post('/viewer/open', { file: f.path }).then(r => r.json()).catch((e: Error) => ({ ok: false, message: phrase('open.failed', { why: e.message }) }));
  if (!r.ok) flash(daemonText(r.message) || phrase('open.cannot'));
}

export const GalleryGrid = memo(function GalleryGrid({ files, ready, cards, now = Date.now(), onOpen }: {
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
          name={stemOf(f)} pkg={packageOf(f, head)} mod={moduleOf(f.module)} changed={changedAgo(f.mtime, now, phrase, lang)} />)}</div>}
  </div>;
});

export function Gallery({ shown: on, state, draw, host }: { shown: boolean; state: ViewerState | null; draw: number; host?: HTMLElement }) {
  const messages = useMessages();
  const s = useLayer();
  const { element, place } = useHost(host);
  const scroll = useRef({ gallery: 0, board: 0, over: false });

  useLayoutEffect(() => {
    if (!state) return;
    const l = currentLayer();
    if (l.open && (state.screen === 'focus' || activeKey(state) !== l.openedOver)) closeGallery();
  }, [draw]);

  useLayoutEffect(() => {
    if (!element) return;
    const was = galleryShown();
    markShown(on);
    element.hidden = !on;
    if (on === was) return;
    const over = state?.screen === 'board' || state?.screen === 'vacant';
    if (on) {
      loadFiles();
      if (over) scroll.current.board = scrollY;
      scroll.current.over = over;
      const y = scroll.current.gallery;
      queueMicrotask(() => scrollTo(0, y));
    } else {
      scroll.current.gallery = scrollY;
      if (scroll.current.over && over && activeKey(state) === currentLayer().openedOver) { const y = scroll.current.board; queueMicrotask(() => scrollTo(0, y)); }
    }
  }, [on, element]);

  useLayoutEffect(() => { queue.pause(!on || !!s.sheet); }, [on, s.sheet]);
  useEffect(() => {
    if (s.sheet && (!on || (s.files && !s.files.some(f => f.path === s.sheet!.path)))) sheetClosed();
  }, [on, s.files, s.sheet]);

  const latest = useRef(messages);
  latest.current = messages;
  const onPeek = useCallback((f: PreviewFile) => openSheet(f.path), []);
  const peek = on && s.sheet ? s.files?.find(f => f.path === s.sheet!.path) ?? null : null;
  return place(<>
    <GalleryGrid files={s.files} ready={s.ready} cards={queue} onOpen={onPeek} />
    {peek && <SheetHost key={peek.path} f={peek} closing={s.sheet!.closing} onOpen={() => openFile(peek, latest.current)} />}
  </>, (ref, body) => <section id="galleryView" className="gallery" ref={ref}>{body}</section>);
}

function SheetHost({ f, closing, onOpen }: { f: PreviewFile; closing: boolean; onOpen(): void }) {
  const { phrase } = useMessages();
  const key = cardKey(f);
  const queued = useSyncExternalStore(queue.subscribe, () => queue.get(key));
  const cachedCard = useMemo(() => cachedView(f), [f]);
  const view = cachedCard ?? queued;
  useEffect(() => { if (!cachedCard) queue.urgent(key, f.path); }, [key]);
  const lang = document.documentElement.lang || 'en';
  const text = useMemo(() => ({ name: stemOf(f), pkg: packageOf(f, []), mod: moduleOf(f.module), changed: changedAgo(f.mtime, Date.now(), phrase, lang) }), [f, phrase, lang]);
  return <GallerySheet file={f} text={text} view={view} closing={closing} onClose={closeSheet} onClosed={sheetClosed} onOpen={onOpen} />;
}

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
