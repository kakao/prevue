import { Fragment, memo, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { boardMarks, clearTrees, onRelayout, setCursor, subscribeBoard, syncBoard, type BoardMarks } from '../runtime/board';
import { swapImage } from '../runtime/motion';
import { useHost } from '../host';
import { useMessages, type Messages } from '../messages';
import type { Board, Card } from '../state';
import type { CardParts } from '../workspace/point';

// 보드(FR-17) — 파일 하나의 프리뷰를 함수별로 묶은 카드. 카드는 정적 이미지이고 인터랙티브는 한 장에만 걸린다.
// 함수 하나가 묶음 하나다(D-62) — 한 장뿐인 함수도 머리를 가져, 배율 · 장 수가 늘 같은 자리에 온다. 접지 않는다.
type Group = Board['groups'][number];
export type BoardActions = {
  /** 카드의 재생 버튼 — 그 카드를 한 장으로 연다. */
  open(index: number): void;
  /** 카드 위의 가리키기. 그림 위 표시는 workspace/point.ts 가 재서 그리므로 자리만 넘긴다 — 가리킨 결과의 카드는 PointOverlay 가 그림 밖에 띄운다. */
  point(index: number, parts: CardParts, signal: AbortSignal): void;
};
export type BoardHosts = { view: HTMLElement; cards: HTMLElement };

const NO_MARKS: BoardMarks = { cursor: null, returned: null };
const cardIn = (b: Board, i: number | null) => b.groups.flatMap(g => g.cards).find(c => c.index === i);

/*
 * 묶음마다 배율 하나(D-62). 상한은 300/360 — 360dp 카드가 300px, 48dp 버튼이 40px 다. 그 배율로 한 줄에 안 들어가는 묶음만
 * 한 줄에 맞게 줄이되 0.25 아래로는 내리지 않고, 거기서도 넘치면 줄을 바꾼다. 한 함수의 변형 · 기기 세트는 같은 축척으로
 * 나란히 놓여야 비교가 된다 — 카드마다 칸에 맞추면 폰은 0.73배 · 버튼은 2.6배로 한 보드 안에서 축척이 16배 넘게 갈렸다(리뷰 5).
 * 묶음끼리는 배율이 다를 수 있어 줄인 묶음만 머리에 적는다. 창 폭으로 여기서 정한다 — 데몬 상태 · CLI 에는 없다(D-22).
 */
const CAP = 300 / 360, FLOOR = .25;
// 칸의 최소 폭 — 이름표(name= · 인터랙티브 버튼)가 놓일 자리. 100 을 넘기면 ForYouScreen 기기 다섯 장이 1440 창에서
// 한 줄을 넘는다(0.25 × 411dp = 103px).
const COL_MIN = 100;
// 묶음의 최소 폭 — 머리(이름 · 배율 · 장 수)가 읽히는 폭. 이름은 말줄임이고 전체는 툴팁에 있다.
const GROUP_MIN = 160;
// 크기를 모르는 카드(그리기 전의 내용 크기 프리뷰)는 폰 한 장 자리다. 그림이 오면 데몬이 실은 크기로 다시 잰다.
const PH_W = 360, PH_H = 640, PH_MIN_H = 120;

/** 한 줄에 들어가는 가장 큰 배율. 줄 폭은 배율에 대해 단조 증가라 이분 탐색으로 찾는다. */
export function fitScale(ws: number[], W: number, gap: number) {
  const row = (s: number) => ws.reduce((a, w) => a + Math.max(w * s, COL_MIN), 0) + gap * (ws.length - 1);
  if (row(CAP) <= W) return { s: CAP, w: row(CAP), wrap: false };
  // 하한에서도 넘치면 줄을 바꾼다. 칸 최소 폭에 걸린 작은 장은 더 줄여도 칸이 그대로라 하한까지 줄일 까닭이 없다 —
  // 줄 폭이 하한일 때와 같은 데까지만 줄인다(좁은 창에서 48dp 버튼 다섯이 12px 이 되지 않게).
  if (row(FLOOR) > W) return { s: Math.min(CAP, ...ws.map(w => w * FLOOR >= COL_MIN ? FLOOR : COL_MIN / w)), w: W, wrap: true };
  let lo = FLOOR, hi = CAP;
  for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (row(m) <= W) lo = m; else hi = m; }
  return { s: lo, w: row(lo), wrap: false };
}

// 이 뷰어가 본 카드의 dp 크기 — 파일 · previewId 마다(previewId 는 함수 이름이라 파일끼리 겹친다).
const seenDp = new Map<string, [number, number]>();
/**
 * 배율 셈에 넣을 카드의 dp 크기 — 데몬이 실은 크기, 없으면 그 장이 마지막으로 보인 크기, 실패한 장이면 같은 묶음에서 크기를 아는 장,
 * 그래도 없으면 폰 한 장. 실패한 렌더는 그림이 없어 크기를 잃는다 — 폰 한 장(360dp)으로 셈에 넣으면 묶음 배율이 떨어져
 * 멀쩡히 그린 형제가 함께 준다(48dp 버튼 40 → 15px). 한 함수의 변형(테마 · 글자 배율 · 로케일)은 대개 크기가 같아 형제의 것을 빌린다.
 * 형제를 빌리는 것은 실패한 장뿐이다 — 그리기 전의 장은 곧 그림이 와 다시 재므로 본 적이 없으면 폰 한 장 자리다(D-62).
 */
function dimsOf(file: string, g: Group): Array<[number, number]> {
  const own = g.cards.map(c => {
    const k = file + '|' + c.previewId, seen = seenDp.get(k);
    if (c.widthDp && c.heightDp) seenDp.set(k, [c.widthDp, c.heightDp]);
    return [c.widthDp || seen?.[0], c.heightDp || seen?.[1]] as const;
  });
  const sib = own.filter(([w, h]) => w && h).sort((a, b) => b[0]! - a[0]!)[0];
  return own.map(([w, h], i) => {
    const lend = g.cards[i].failure && sib;
    return [w || (lend ? sib[0]! : PH_W), h || (lend ? sib[1]! : PH_H)];
  });
}

/**
 * 묶음의 배율을 재고 카드 · 그림 · 자리표시의 폭을 정한다. 상태가 올 때마다 · 창 폭이 바뀔 때마다 — 싸다(25장에 수십 µs).
 * 잰 뒤에만 정해지는 값(폭 · 배율 글자)이라 React 가 아니라 여기서 쓴다. 잰 폭을 돌려준다 — 보드가 숨어 있으면 0 이다.
 */
function layoutGroups(cards: HTMLElement, b: Board, phrase: Messages['phrase']) {
  const W = cards.clientWidth;
  if (!W) return 0;                          // 보드가 숨어 있으면 폭이 0 — 다시 보일 때 잰다
  const els = cards.querySelectorAll<HTMLElement>(':scope > .group');
  const inner = els[0]?.querySelector('.board');
  const gap = (inner && parseFloat(getComputedStyle(inner).columnGap)) || 24;
  b.groups.forEach((g, gi) => {
    const d = els[gi];
    if (!d) return;
    const dims = dimsOf(b.file, g);
    const { s, w, wrap } = fitScale(dims.map(x => x[0]), W, gap);
    d.style.width = wrap ? '100%' : Math.max(GROUP_MIN, w) + 'px';
    d.querySelector('.board')!.classList.toggle('spill', wrap);
    // 줄였을 때만 적는다 — 상한 그대로면 숫자가 읽을 것을 늘리지 않는다. 밀도를 모르는 기기가 섞이면 짐작이라 ≈.
    const sc = d.querySelector<HTMLElement>('.sc')!, cut = s < CAP - 1e-6, guess = g.cards.some(c => c.dpGuess);
    sc.hidden = !cut;
    sc.textContent = cut ? (guess ? '≈' : '') + Math.round(s * 100) + '%' : '';
    sc.title = phrase('zoom.tip.real') + (guess ? ' · ' + phrase('board.scale.guess') : '');
    g.cards.forEach((c, i) => {
      const el = cards.querySelector<HTMLElement>(`.card[data-i="${c.index}"]`);
      if (!el) return;
      const [dw, dh] = dims[i], col = Math.max(dw * s, COL_MIN);
      el.style.width = col + 'px';
      // 폭만 준다 — 높이는 그림의 비로 따라와야 가리키기의 배율(scaleOf)이 가로세로 하나다. 비는 그림이 오기 전의 자리용.
      const img = el.querySelector<HTMLElement>('.cstage img')!;
      img.style.width = dw * s + 'px'; img.style.aspectRatio = `auto ${dw} / ${dh}`;
      const ph = el.querySelector<HTMLElement>('.ph')!, h = Math.max(PH_MIN_H, dh * s);
      ph.style.width = col + 'px'; ph.style.height = h + 'px';
      // 실패 문장은 판에 드는 줄까지만 — 머리 "렌더 실패" 한 줄과 안쪽 여백을 뺀 높이를 줄 높이로 나눈다. 전체는 툴팁에 있다.
      ph.style.setProperty('--lines', String(Math.max(1, Math.floor((h - 55) / 16.7))));
    });
  });
  return W;
}

/* 이름표 아래 칸의 아이콘 — SF Symbols 처럼 가는 선 하나. 뜻은 데몬이 kind 로 정하고 여기서는 모양만 고른다. */
const glyph = (d: ReactNode) => <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const PHONE = <><rect x="3.25" y="1.25" width="5.5" height="9.5" rx="1.2" /><path d="M5.25 9h1.5" /></>;
const GLYPH: Record<string, ReactNode> = {
  portrait: glyph(PHONE),
  landscape: glyph(<rect x="1.25" y="3" width="9.5" height="6" rx="1.2" />),
  device: glyph(PHONE),
  dark: glyph(<path d="M9.9 7.6A4.25 4.25 0 0 1 4.4 2.1a4.25 4.25 0 1 0 5.5 5.5Z" />),
  font: <span className="aa">Aa</span>,
  locale: glyph(<><circle cx="6" cy="6" r="4.75" /><path d="M1.25 6h9.5M6 1.25c1.4 1.4 2 3 2 4.75s-.6 3.35-2 4.75M6 1.25C4.6 2.65 4 4.25 4 6s.6 3.35 2 4.75" /></>),
  api: glyph(<path d="M3.5 2.5 1.25 6 3.5 9.5M8.5 2.5 10.75 6 8.5 9.5" />),
  systemUi: glyph(<><rect x="3.25" y="1.25" width="5.5" height="9.5" rx="1.2" /><path d="M3.5 3.25h5" /></>),
};
// 재생 — "크게 보기"(⤢)가 아니라 "살아 움직이게 한다"(Xcode 캔버스의 Live). 손가락은 "여기를 누르라"로 읽혀 버튼 자체를 가리켰다.
const GO = <svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 3.6v8.8a.8.8 0 0 0 1.2.68l7-4.4a.8.8 0 0 0 0-1.36l-7-4.4a.8.8 0 0 0-1.2.68z" /></svg>;

/** 인자 칸. 원래 인자(소스 표기)는 툴팁에만 둔다. */
function Specs({ card }: { card: Card }) {
  const { daemonText } = useMessages();
  return <span className="specs" title={card.args}>{card.specs.map((sp, i) => {
    const text = daemonText(sp.text);
    const [w, h] = sp.kind === 'size' ? text.split('×').map(Number) : [];
    const g = sp.kind === 'size' ? (w > h ? 'landscape' : 'portrait') : sp.kind;
    return <span className="spec" key={i}>{GLYPH[g] ?? null}<span>{text}{sp.kind === 'size' && <span className="unit">dp</span>}</span></span>;
  })}</span>;
}

// 커서가 옮겨도 바뀐 두 장만 다시 그린다.
export const PreviewCard = memo(function PreviewCard({ card: c, fn, cursor = false, returned = false, actions }: {
  card: Card;
  fn: string;
  cursor?: boolean;
  /** 작업 공간에서 돌아온 카드 — 강조를 처음부터 다시 트는 것은 ringCard 가 한다. */
  returned?: boolean;
  actions?: BoardActions;
}) {
  const { phrase, daemonText } = useMessages();
  const stage = useRef<HTMLDivElement>(null), img = useRef<HTMLImageElement>(null);
  const box = useRef<HTMLDivElement>(null), pick = useRef<HTMLDivElement>(null), marks = useRef<HTMLDivElement>(null);
  const ok = !!(c.ok && c.imageUrl);

  useLayoutEffect(() => {
    if (!actions) return;
    const abort = new AbortController();
    actions.point(c.index, { stage: stage.current!, img: img.current!, box: box.current!, pick: pick.current!, marks: marks.current! }, abort.signal);
    return () => abort.abort();
  }, [actions, c.index]);
  // 그림은 주소가 바뀔 때만 갈아 끼운다 — 새 그림이 디코드되면 옛 그림 위로 크로스페이드한다(swapImage). 그래서 src 는 JSX 가 갖지 않는다.
  // 숨김도 여기서 정한다 — 숨은 그림은 크로스페이드 없이 바로 바뀌어야 해서 바꾸기와 순서가 붙어 있다.
  useLayoutEffect(() => {
    const image = img.current!;
    if (ok) {
      if (image.dataset.url !== c.imageUrl) { swapImage(image, c.imageUrl!); box.current!.classList.remove('on'); pick.current!.hidden = true; }
      image.hidden = false;
    } else image.hidden = true;
  }, [ok, c.imageUrl]);

  // 판에 드는 줄까지만 보인다(layoutGroups 의 --lines) — 실패 문장은 400자까지라 작은 판을 넘친다.
  const failure = !ok && c.failure ? daemonText(c.failure) : null;
  return <article data-i={c.index} data-fn={fn}
    // 이름(name=)이 없으면 ▶가 크기 칸 줄로 내려온다 — 함수 이름은 묶음 머리가 갖는다(D-62). 이름 있는 장과 섞인 묶음은 빈 첫 줄을 지켜 그림 윗선이 맞는다.
    className={['card', c.isFocus && 'focus', c.stale && 'stale', !c.label && 'noname', cursor && 'cursor', returned && 'returned'].filter(Boolean).join(' ')}>
    {/* 이름표가 그림 위에 온다(D-151) — 큰 카드의 윗부분만 보여도 어느 변형인지 읽히고 ▶ 를 누를 수 있다. */}
    <div className="label">
      {/* 좁은 칸에서 이름이 말줄임되므로 툴팁 첫 줄에 이름 전체를 둔다. */}
      <span className="fn" title={c.label ? c.label + '\n' + c.title : c.title}>{c.label}</span>
      <button className="go" type="button" title={phrase('card.go.tip')} onClick={() => { setCursor(c.index); actions?.open(c.index); }}>{GO}<span className="go-t">{phrase('card.go')}</span></button>
      <div className="sub"><Specs card={c} /></div>
    </div>
    <div className="cstage" ref={stage}>
      {/* 그림 위 표시(구조 테두리 · 손 아래 · 고른 노드)는 workspace/point.ts 가 그린다 — React 는 자리만 한 번 만들고 속성을 다시 쓰지 않는다. */}
      <img alt="" hidden ref={img} /><div className="marks" aria-hidden="true" ref={marks} /><div className="box" ref={box} /><div className="box pick" hidden ref={pick} />
      <div className={failure ? 'ph bad' : 'ph'} hidden={ok} title={failure ?? ''}>{failure ? <span className="why">{failure}</span> : phrase('card.waiting')}</div>
    </div>
  </article>;
});

export function PreviewGroup({ group, marks = NO_MARKS, actions }: { group: Group; marks?: BoardMarks; actions?: BoardActions }) {
  const { phrase } = useMessages();
  // 배율(.sc)은 잰 뒤에만 정해져 layoutGroups 가 쓴다 — React 는 자리만 만든다.
  // 이름 있는 장이 하나도 없으면 맞출 상대가 없어 이름표가 한 줄이다.
  const nameless = group.cards.every(c => !c.label);
  return <section className={nameless ? 'group nameless' : 'group'} data-fn={group.name}>
    <div className="ghead"><span className="gn" title={group.name}>{group.name}</span><span className="m">
      <span className="n">{phrase('board.count', { n: group.cards.length })}</span><span className="sc" hidden />
      <span className="bad">{group.failed ? `· ${phrase('board.failed', { n: group.failed })}` : ''}</span>
    </span></div>
    <div className="gbody"><div className="board">{group.cards.map(c =>
      <PreviewCard key={c.index} card={c} fn={group.name} cursor={marks.cursor === c.index} returned={marks.returned === c.index} actions={actions} />)}</div></div>
  </section>;
}

export function PreviewBoard({ board, screen, hosts, actions }: {
  board: Board | null;
  screen: string | null;
  hosts?: BoardHosts;
  actions?: BoardActions;
}) {
  const { phrase } = useMessages();
  const { element: cards, place } = useHost(hosts?.cards);
  const [view, setView] = useState<HTMLElement | null>(null);
  const viewEl = hosts?.view ?? view;
  const marks = useSyncExternalStore(subscribeBoard, boardMarks);

  // 한 장에 있는 동안은 보던 보드를 그대로 둔다. 복귀 직후의 상태에는 아직 조작한 그림이 남아 있어,
  // 원래 그림이 오기까지 보던 보드의 배치를 보존한다.
  // 상태가 올 때마다 한 번만 정한다 — 커서 같은 다른 까닭의 렌더에서는 같은 보드를 그대로 쓴다.
  const rest = useRef<{ board: Board | null; live: string | null }>({ board: null, live: null });
  const shown = useMemo(() => {
    const r = rest.current;
    if (screen === 'focus' && board) { r.live = cardIn(board, board.focus)?.imageUrl ?? null; return r.board; }
    const current = board && cardIn(board, board.focus);
    if (board && r.board?.file === board.file && r.live && current?.imageUrl === r.live) return { ...r.board, focus: board.focus };
    r.board = board; r.live = null;
    return board;
  }, [board, screen]);
  // 카드 구성이 바뀌었을 때만 새로 짓는다 — 다시 지으면 스크롤 위치와 받아 둔 트리가 날아가고, 다른 파일의 그림에서 크로스페이드한다.
  const key = shown ? shown.file + '|' + shown.groups.map(g => g.cards.map(c => c.previewId).join(',')).join('|') : '';
  useLayoutEffect(() => { clearTrees(); }, [key]);

  const latest = useRef(shown), words = useRef(phrase), laid = useRef(0);
  latest.current = shown; words.current = phrase;
  useLayoutEffect(() => {
    if (!viewEl) return;
    if (screen !== null) viewEl.hidden = screen !== 'board';
    if (screen === 'focus') return;
    syncBoard(shown);
    if (shown && cards) laid.current = layoutGroups(cards, shown, phrase) || laid.current;
  }, [shown, screen, viewEl, cards]);
  // 폭이 바뀔 때만 다시 잰다 — 그림이 와서 높이만 바뀔 때마다 돌 이유가 없다.
  useEffect(() => {
    if (!cards) return;
    const relayout = () => { if (latest.current) laid.current = layoutGroups(cards, latest.current, words.current) || laid.current; };
    const observer = new ResizeObserver(() => { const W = cards.clientWidth; if (W && W !== laid.current) relayout(); });
    observer.observe(cards);
    onRelayout(relayout);
    return () => { observer.disconnect(); onRelayout(() => {}); };
  }, [cards]);

  const body = shown && <Fragment key={key}>{shown.groups.map((g, gi) => <PreviewGroup key={gi} group={g} marks={marks} actions={actions} />)}</Fragment>;
  if (hosts) return place(body, () => null);
  return <section id="boardView" ref={setView}>
    {place(body, (ref, children) => <div className="board" id="cards" ref={ref}>{children}</div>)}
  </section>;
}
