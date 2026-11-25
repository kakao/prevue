import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { GalleryCard, GalleryPeek, shortLabel, usePeek } from './GalleryCard';
import '../../viewer-src/legacy/style.css';
import { FileIcon } from '../../viewer-src/src/components/FileIcon';
import { PreviewBoard } from '../../viewer-src/src/components/PreviewBoard';
import { pearlBoard } from '../../viewer-src/stories/pearl';
import './gallery-cover.css';
import pearl from '../../viewer-src/stories/pearl/preview-files.json';

// 갤러리(1) 시안 — 카드 격자 · 레일 입구 · 펼친 시트 · 보드 왕복(2026-11-25 사용자와 고름).
// 데이터는 .cache/gallery/*.json(소스를 정규식으로 읽은 근사)이 있으면 그것을, 없으면 pearl 픽스처를 쓴다 — 비공개 저장소 이름은 무시 경로에만 둔다.
type Preview = { fn: string; calls: string[] };
type File = { rel: string; module: string; mtime: number; functions: string[]; previews?: Preview[] };
type Data = { name: string; files: File[] };

const local = import.meta.glob<Data>('../../.cache/gallery/*.json', { eager: true, import: 'default' });
const DATA: Record<string, Data> = { pearl: { name: 'pearl', files: (pearl as { files: File[] }).files } };
for (const d of Object.values(local)) DATA[d.name] = d;

const stem = (f: File) => f.rel.slice(f.rel.lastIndexOf('/') + 1).replace(/\.kt$/, '');
const headOf = new WeakMap<File[], string[]>();
function commonHead(files: File[]) {
  let h = headOf.get(files);
  if (h) return h;
  const xs = files.map(ff => segs(ff)).filter(x => x.length);
  h = xs.reduce((a, x) => { let i = 0; while (i < a.length && i < x.length && a[i] === x[i]) i++; return a.slice(0, i); }, xs[0] ?? []);
  headOf.set(files, h);
  return h;
}
let currentFiles: File[] = [];
const pkgShort = (f: File) => { const s = segs(f), h = commonHead(currentFiles); return (s.slice(h.length).join('.') || s.join('.')); };
const segs = (f: File) => f.rel.match(/\/src\/[^/]+\/(?:java|kotlin)\/(.+)\/[^/]+$/)?.[1].split('/') ?? [];
const previewsOf = (f: File): Preview[] => f.previews ?? f.functions.map(fn => ({ fn, calls: [] }));
const moduleLabel = (m: string) => { const p = m.split(':').filter(Boolean); while (p.length > 1 && (p.at(-1) === 'impl' || p.at(-1) === 'api')) p.pop(); return p.join('/'); };

const ago = (t: number, now: number) => {
  const m = Math.round((now - t) / 60000);
  if (m < 60) return `${Math.max(m, 1)}분 전`;
  if (m < 60 * 24) return `${Math.round(m / 60)}시간 전`;
  if (m < 60 * 24 * 14) return `${Math.round(m / 1440)}일 전`;
  return new Date(t).toLocaleDateString('ko', { month: 'short', day: 'numeric' });
};

type Args = { data: string; frame: string; cardMin: number; gap: string; railLabel: string };

const IMG = import.meta.glob<string>('../design-system/img/**/*.{png,jpg}', { eager: true, query: '?url', import: 'default' });
const shotsOf = (f: File) => previewsOf(f).flatMap(p => Object.entries(IMG)
  .filter(([k]) => { const b = k.slice(k.lastIndexOf('/') + 1); return b === `${p.fn}.jpg` || b.startsWith(`${p.fn}-`) || b.startsWith(`${p.fn}_`); })
  .sort(([x], [y]) => x.localeCompare(y)).map(([, v]) => ({ src: v, fn: p.fn })));
const imagesOf = (f: File) => shotsOf(f).map(x => x.src);
const labelsOf = (f: File) => { const sh = shotsOf(f); return (sh.length ? sh.map(x => x.fn) : previewsOf(f).map(p => p.fn)).map(fn => shortLabel(fn, stem(f))); };

function LazyCard({ f, info, done, onDone, onPeek }: { f: File; info: string; done: boolean; onDone: () => void; onPeek: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const images = useMemo(() => imagesOf(f), [f]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let t = 0;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && images.length && !t) t = window.setTimeout(onDone, 400 + Math.random() * 1200);
    });
    io.observe(el);
    return () => { io.disconnect(); clearTimeout(t); };
  }, [images]);
  return <div ref={ref} className="gc-slot">
    <GalleryCard file={stem(f)} info={info} pkg={pkgShort(f)} mod={moduleLabel(f.module)} state={done ? 'done' : 'loading'} images={images} previews={previewsOf(f).map(p => p.fn)}
      aspect="4 / 3" peekKey={f.rel} onPeek={onPeek} /></div>;
}

function Gallery(a: Args) {
  const d = DATA[a.data] ?? DATA.pearl;
  currentFiles = d.files;
  const [tabs, setTabs] = useState<File[]>([]);
  const [cur, setCur] = useState<File | null>(null);
  const pk = usePeek();
  const exp = pk.key;
  const [done, setDone] = useState<Set<string>>(new Set());
  const peek = exp ? d.files.find(ff => ff.rel === exp) ?? null : null;
  const open = (f: File) => { pk.closed(); setTabs(t => (t.includes(f) ? t : [...t, f])); setCur(f); };
  const back = () => setCur(null);
  const st = useRef({ cur, exp, close: pk.close }); st.current = { cur, exp, close: pk.close };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const { cur: c, exp: x, close } = st.current;
      if (e.key === 'Escape') { if (c) back(); else if (x) close(); }
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [d]);
  const shown = d.files;
  const now = Math.max(...d.files.map(f => f.mtime), 0);
  const width = a.frame === 'full' ? '100%' : `${a.frame}px`;
  return (
    <div className="gc-frame" style={{ width }}>
      <div className="gc-bar"><span className="brand-name">Prevue</span><span className="brand-sep" /><span className="gc-proj">{d.name}</span></div>
      <div className="gc-body">
        <nav className="gc-rail">
          <div className={cur ? 'gc-rail-all' : 'gc-rail-all on'} role="button" onClick={back}><svg viewBox="0 0 18 18" aria-hidden><path d="M3 3h5v5H3zM10 3h5v5h-5zM3 10h5v5H3zM10 10h5v5h-5z" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
            <span className="rail-open-t">{a.railLabel}</span><span className="gc-count">{d.files.length}</span></div>
          <div className="rail-h">열린 파일</div>
          {tabs.length === 0 ? <p className="rail-empty">열린 파일 없음</p>
            : tabs.map(f => <div key={f.rel} className={cur === f ? 'gc-tab on' : 'gc-tab'} role="button" onClick={() => setCur(f)}>
              <FileIcon kind="file" /><span className="rail-open-t">{stem(f)}</span></div>)}
        </nav>
        {cur ? <main className="gc-board">
          <p className="gc-board-note">시안 — 보드 내용은 pearl 예시예요. Esc · 레일 「{a.railLabel}」로 갤러리에 돌아가요.</p>
          <PreviewBoard board={pearlBoard} screen="board" />
        </main> : <main className="gc-main" style={{ ['--gc-gap' as string]: `var(${a.gap})` }}>
          <div className="gc-head"><h1>{a.railLabel}</h1><span className="gc-n">{shown.length}</span><span className="gc-sort">최근 바뀐 순</span></div>
          <div className="gc-grid" style={{ ['--gc-min' as string]: `${a.cardMin}px` }}>
            {shown.map(f => <LazyCard key={f.rel} f={f} done={done.has(f.rel)}
              onDone={() => setDone(x => new Set(x).add(f.rel))} onPeek={() => pk.open(f.rel)} info={ago(f.mtime, now)} />)}
          </div>
        </main>}
      </div>
      {peek && !cur && <GalleryPeek file={stem(peek)} info={ago(peek.mtime, now)} pkg={segs(peek).join('.')} labels={labelsOf(peek)} mod={moduleLabel(peek.module)}
        state={done.has(peek.rel) ? 'done' : 'loading'} images={imagesOf(peek)} previews={previewsOf(peek).map(p => p.fn)}
        key={peek.rel} peekKey={peek.rel} closing={pk.closing} onClosed={pk.closed} onClose={pk.close} onOpen={() => open(peek)} />}
    </div>
  );
}

const meta = {
  title: '시안/갤러리',
  render: args => <Gallery {...(args as Args)} />,
  args: {
    data: Object.keys(DATA).includes('KakaoMap') ? 'KakaoMap' : 'pearl', frame: 'full', cardMin: 300, gap: '--space-24', railLabel: '모든 Preview',
  } satisfies Args,
  argTypes: {
    data: { control: 'select', options: Object.keys(DATA) },
    frame: { control: 'inline-radio', options: ['full', '1280', '960', '640', '390'] },
    cardMin: { control: { type: 'range', min: 220, max: 420, step: 20 } },
    gap: { control: 'inline-radio', options: ['--space-12', '--space-16', '--space-24', '--space-32'] },
    railLabel: { control: 'inline-radio', options: ['모든 Preview', 'Preview 파일', '모든 파일', 'All Previews'] },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const 갤러리: Story = {};
