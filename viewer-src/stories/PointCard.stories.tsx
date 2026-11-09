import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import '../legacy/style.css';
import { PointCard, PointCardFloat, type PointActions } from '../src/components/PointOverlay';
import { asyncImage, cardOf, find, flat, hit, nia, pearl, PX, rectOf, SHOT, type Picked } from './point-tree';
import { pearlCard } from './workspace';
import './point-card.css';

// 가리킨 결과의 카드(D-162) — 상태별 카드, 그림 위에 선 모양, 보드에서 가리키기. 카드의 내용은 뷰어와 같은 함수(workspace/card.ts)로 짓고,
// 그림 위 표시는 뷰어와 같은 클래스(.marks .ol · .box · .box.pick, style.css)다. 트리는 pearl 0번 그림을 눈으로 본뜬 것이다(point-tree.ts).
const meta = { title: '가리키기/PointCard' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const NO: PointActions = { choose() {}, cancel() {}, follow() {}, pick() {}, peek() {}, jump() {}, close() {} };

/** 카드 높이를 재어 밑에 적는다 — 시안의 높이 실측(약 430px)을 Storybook 에서 바로 본다. */
function Height({ of, deps }: { of: () => HTMLElement | null | undefined; deps: unknown }) {
  const [h, setH] = useState(0);
  useEffect(() => { const t = setTimeout(() => setH(Math.round(of()?.getBoundingClientRect().height ?? 0)), 700); return () => clearTimeout(t); }, [deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span className="story-meta story-height" data-height={h}>{h ? `${h}px` : ''}</span>;
}

/** 상태 하나 — 트리 줄을 누르면 그 노드로 다시 가리킨 것처럼 카드 전체가 바뀐다. */
function Picker({ list, start, copied, bare, msg }: { list: Picked[]; start: Picked; copied?: boolean; bare?: boolean; msg?: string }) {
  const [here, setHere] = useState(start), wrap = useRef<HTMLDivElement>(null);
  const actions: PointActions = { ...NO, pick: r => setHere(list[Number(r.id)]) };
  return <div ref={wrap} className="story-stack">
    <PointCard card={cardOf(list, here, { copied, bare, msg })} actions={actions} />
    <Height of={() => wrap.current?.querySelector('.point-card')} deps={here} />
  </div>;
}

const tree = flat(pearl), chain = flat(nia);
const Case = ({ name, children }: { name: string; children: ReactNode }) => <div className="story-case"><span className="story-meta">{name}</span>{children}</div>;
const drink = find(tree, 'DrinkCard'), caption = tree[drink.id + 2], label = tree[caption.id + 1], screen = find(tree, 'PearlScreen');
export const States: Story = { render: () => <div className="story-sheets">{['light', 'dark'].map(theme => <section key={theme} className="story-sheet" data-theme={theme}>
  <h2>{theme}</h2>
  <div className="story-cards">
    <Case name="기본 · 트리 줄을 눌러 보세요"><Picker list={tree} start={drink} /></Case>
    <Case name="여백이 있는 노드"><Picker list={tree} start={caption} /></Case>
    <Case name="글자 노드 (Compose)"><Picker list={tree} start={label} /></Case>
    <Case name="Preview 여럿"><Picker list={tree} start={screen} /></Case>
    <Case name="복사 막힘"><Picker list={tree} start={drink} copied={false} /></Case>
    <Case name="긴 사슬 (조상 19)"><Picker list={chain} start={find(chain, asyncImage.name)} /></Case>
    <Case name="색인 없음"><Picker list={tree} start={drink} bare /></Case>
    <Case name="문장 (멘션 없음)"><Picker list={tree} start={drink} bare msg="DrinkCard.kt:73 — not in the index, so the full path is missing" /></Case>
  </div>
</section>)}</div> };

/** 무대 — 그림은 왼쪽 위 24px 에 서고, 카드는 그 밖 오른쪽에 뜬다. */
const INSET = 24, STAGE = { width: INSET + SHOT.width + 16 + 320 + 24, height: SHOT.height + INSET * 2 };
const place = (n: Picked | null) => { const r = n && rectOf(n); return r ? { left: r.left, top: r.top, width: r.width, height: r.height } : undefined; };

/**
 * 보드에서 가리키기 — 그림을 누르면 고른 노드와 카드가 뜨고, 카드 트리 줄에 올리면 그림 위에 옅은 바탕, 누르면 그 노드로 다시 가리킨다.
 * `Esc` · 닫기 · 빈 곳 클릭으로 닫힌다. still 이면 처음 노드를 고른 채 구조 테두리를 늘 보인다(그림 위 스토리).
 */
function Board({ theme, start = null, still }: { theme: string; start?: Picked | null; still?: boolean }) {
  const [here, setHere] = useState<Picked | null>(start), [hover, setHover] = useState<Picked | null>(null), [peek, setPeek] = useState<Picked | null>(null), [over, setOver] = useState(!!still);
  const [host, setHost] = useState<HTMLDivElement | null>(null), img = useRef<HTMLImageElement>(null);
  const shot = useRef(() => img.current?.getBoundingClientRect() ?? null).current;
  const close = () => { setHere(null); setPeek(null); };
  useEffect(() => { if (still) return; const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; addEventListener('keydown', esc); return () => removeEventListener('keydown', esc); }, [still]);
  const at = (e: MouseEvent<HTMLElement>) => { const r = e.currentTarget.getBoundingClientRect(); return hit(tree, (e.clientX - r.left) / PX, (e.clientY - r.top) / PX); };
  const shown = peek ?? hover;
  const actions: PointActions = { ...NO, pick: r => setHere(tree[Number(r.id)]), peek: r => setPeek(r && tree[Number(r.id)]), close };
  return <section className="story-sheet" data-theme={theme}>
    <h2>{still ? theme : `${theme} — 그림을 눌러 가리키고, 카드의 트리 줄에 올리거나 눌러 보세요. Esc · 닫기 · 빈 곳 클릭으로 닫힙니다.`}</h2>
    <div className="story-board" style={STAGE} ref={setHost} onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="story-shot cstage" style={{ left: INSET, top: INSET, width: SHOT.width, height: SHOT.height }}
        onMouseMove={still ? undefined : e => setHover(at(e))} onMouseEnter={still ? undefined : () => setOver(true)} onMouseLeave={still ? undefined : () => { setHover(null); setOver(false); }}
        onClick={still ? undefined : e => { const n = at(e); if (n) setHere(n); }}>
        <img ref={img} src={pearlCard.imageUrl!} alt="" draggable={false} />
        <div className={`marks${over ? ' over' : ''}${peek ? ' peek' : ''}`}>{tree.filter(n => n.node.b).map(n => <div key={n.id} className="ol" style={place(n)} />)}</div>
        <div className={`box${shown ? ' on' : ''}`} style={place(shown)} />
        {here && <div key={here.id} className="box pick" style={place(here)} />}
      </div>
      {here && host && <PointCardFloat host={host} shot={shot}><PointCard card={cardOf(tree, here)} actions={actions} /></PointCardFloat>}
    </div>
  </section>;
}
export const OnPreview: Story = { render: () => <div className="story-sheets story-boards"><Board theme="light" start={drink} still /><Board theme="dark" start={find(tree, 'FilterRow')} still /></div> };
export const BoardPoint: Story = { render: () => <div className="story-sheets story-boards"><Board theme="light" /><Board theme="dark" /></div> };
