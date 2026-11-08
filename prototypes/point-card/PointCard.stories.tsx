import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import '../../viewer-src/legacy/style.css';
import en from '../../plugin/viewer/strings/en.json';
import ko from '../../plugin/viewer/strings/ko.json';
import { createMessages, MessagesContext } from '../../viewer-src/src/messages';
import { pearlCard } from '../../viewer-src/stories/workspace';
import { pearl, nia, asyncImage, find, flat, cardOf, byId, rectOf, hit, toShot, SHOT, type Node } from './pearl-tree';
import { PointCard, type CardActions } from './PointCard';
import { PointCardFloat, PointMarks } from './PointFloat';
import { strings } from './strings';
import './stories.css';

// 가리키기 카드 프로토타입 — 상태별 카드, 그림 위에 선 모양, 보드에서 가리키기. 문구는 뷰어 사전에 프로토타입 문구를 얹어 읽는다.
const messages = { en: createMessages({ ...en, ...strings.en }), ko: createMessages({ ...ko, ...strings.ko }) };
const meta = {
  title: '프로토타입/PointCard',
  decorators: [(Story, context) => <MessagesContext.Provider value={messages[context.globals.language as 'en' | 'ko'] ?? messages.en}><Story /></MessagesContext.Provider>],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** 카드 높이를 재어 밑에 적는다 — 시안의 높이 실측(합의 시점 계산 약 430px)을 Storybook 에서 바로 본다. */
function Height({ of, deps }: { of: () => HTMLElement | null | undefined; deps: unknown }) {
  const [h, setH] = useState(0);
  useEffect(() => { const t = setTimeout(() => setH(Math.round(of()?.getBoundingClientRect().height ?? 0)), 700); return () => clearTimeout(t); }, [deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span className="story-meta story-height" data-height={h}>{h ? `${h}px` : ''}</span>;
}

/** 상태 하나 — 트리 줄을 누르면 그 노드로 다시 가리킨 것처럼 카드 전체가 바뀐다. */
function Picker({ root = pearl, start, copied = true, bare, msg }: { root?: Node; start: Node; copied?: boolean; bare?: boolean; msg?: string }) {
  const [here, setHere] = useState(start), wrap = useRef<HTMLDivElement>(null);
  const card = cardOf(root, here, { copied });
  const actions: CardActions = { pick: r => { const n = byId(root, r.id); if (n) setHere(n); }, peek() {}, jump() {}, close() {} };
  return <div ref={wrap} className="story-stack">
    <PointCard {...card} tree={bare ? null : card.tree} modifiers={bare ? null : card.modifiers} previews={bare ? [] : card.previews} origin={bare ? null : card.origin}
      say={msg ? { msg } : card.say} actions={actions} />
    <Height of={() => wrap.current?.querySelector('.point-card')} deps={here} />
  </div>;
}

const Case = ({ name, children }: { name: string; children: ReactNode }) => <div className="story-case"><span className="story-meta">{name}</span>{children}</div>;
const drink = find(pearl, 'DrinkCard'), caption = drink.kids[1], label = caption.kids[0], screen = find(pearl, 'PearlScreen');
export const States: Story = { render: () => <div className="story-sheets">{['light', 'dark'].map(theme => <section key={theme} className="story-sheet" data-theme={theme}>
  <h2>{theme}</h2>
  <div className="story-cards">
    <Case name="기본 · 트리 줄을 눌러 보세요"><Picker start={drink} /></Case>
    <Case name="여백이 있는 노드"><Picker start={caption} /></Case>
    <Case name="글자 노드 (Compose)"><Picker start={label} /></Case>
    <Case name="Preview 여럿"><Picker start={screen} /></Case>
    <Case name="복사 막힘"><Picker start={drink} copied={false} /></Case>
    <Case name="긴 사슬 (조상 19)"><Picker root={nia} start={asyncImage} /></Case>
    <Case name="색인 없음"><Picker start={drink} bare /></Case>
    <Case name="문장 (멘션 없음)"><Picker start={drink} bare msg="DrinkCard.kt:73 — not in the index, so the full path is missing" /></Case>
  </div>
</section>)}</div> };

const nodes = flat(pearl).filter(n => n.b).map(n => ({ id: n.id, rect: rectOf(n)! }));
/** 무대 — 그림은 왼쪽 위 24px 에 서고, 카드는 그 밖 오른쪽에 뜬다. */
const INSET = 24, STAGE = { width: INSET + SHOT.width + 16 + 320 + 24, height: SHOT.height + INSET * 2 };
const SHOT_RECT = { left: INSET, top: INSET, width: SHOT.width, height: SHOT.height };

/**
 * 보드에서 가리키기 — 그림을 누르면 박스와 카드가 뜨고, 카드 트리 줄에 올리면 그림 위에 옅은 바탕, 누르면 그 노드로 다시 가리킨다.
 * `Esc` · 닫기 · 빈 곳 클릭으로 닫힌다. still 이면 처음 노드를 고른 채 구조 테두리를 늘 보인다(그림 위 스토리).
 */
function Board({ theme, start = null, still }: { theme: string; start?: Node | null; still?: boolean }) {
  const [here, setHere] = useState<Node | null>(start), [hover, setHover] = useState<Node | null>(null), [peek, setPeek] = useState<Node | null>(null), [over, setOver] = useState(!!still);
  const close = () => { setHere(null); setPeek(null); };
  useEffect(() => { if (still) return; const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; addEventListener('keydown', esc); return () => removeEventListener('keydown', esc); }, [still]);
  const point = (e: MouseEvent<HTMLElement>) => { const r = e.currentTarget.getBoundingClientRect(); const [x, y] = toShot(e.clientX - r.left, e.clientY - r.top); return hit(pearl, x, y); };
  const shown = peek ?? hover, rect = here && rectOf(here);
  const actions: CardActions = { pick: r => { const n = byId(pearl, r.id); if (n) setHere(n); }, peek: r => setPeek(r && byId(pearl, r.id)), jump() {}, close };
  return <section className="story-sheet" data-theme={theme}>
    <h2>{still ? theme : `${theme} — 그림을 눌러 가리키고, 카드의 트리 줄에 올리거나 눌러 보세요. Esc · 닫기 · 빈 곳 클릭으로 닫힙니다.`}</h2>
    <div className="story-board" style={STAGE} onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="story-shot" style={SHOT_RECT}
        onMouseMove={still ? undefined : e => setHover(point(e))} onMouseEnter={still ? undefined : () => setOver(true)} onMouseLeave={still ? undefined : () => { setHover(null); setOver(false); }}
        onClick={still ? undefined : e => { const n = point(e); if (n) setHere(n); }}>
        <img src={pearlCard.imageUrl!} alt="" draggable={false} />
        <PointMarks nodes={nodes} over={over || !!peek} hover={shown && rectOf(shown)} pick={here && rect ? { id: here.id, rect } : null} />
      </div>
      {here && rect && <PointCardFloat shot={SHOT_RECT} box={{ ...rect, left: rect.left + INSET, top: rect.top + INSET }}>
        <PointCard {...cardOf(pearl, here)} actions={actions} />
      </PointCardFloat>}
    </div>
  </section>;
}
export const OnPreview: Story = { render: () => <div className="story-sheets"><Board theme="light" start={drink} still /><Board theme="dark" start={find(pearl, 'FilterRow')} still /></div> };
export const BoardPoint: Story = { render: () => <div className="story-sheets"><Board theme="light" /><Board theme="dark" /></div> };
