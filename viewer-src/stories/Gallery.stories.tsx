import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import '../static/style.css';
import { GalleryCard, GalleryGrid } from '../src/components/Gallery';
import { createCardQueue, viewOf, type CardAnswer, type CardView } from '../src/gallery/queue';
import { pearlBoard, pearlFiles } from './pearl';

const meta = { title: '파일/Gallery' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const shots = pearlBoard.groups.flatMap(g => g.cards).map(c => c.imageUrl).filter((u): u is string => !!u);

function answer(sheets: number, at: number, w: number, h: number): CardAnswer {
  return { sheets, front: Array.from({ length: Math.min(3, sheets) }, (_, i) => ({
    i, name: `Preview${i}`, variant: null, image: { url: shots[(at + i) % shots.length], w, h } })), failure: null };
}

const cardUrl = (i: number) => pearlBoard.groups.flatMap(g => g.cards).find(c => c.index === i)!.imageUrl!;
const WIDE_SHOTS = [{ url: cardUrl(29), w: 1486, h: 685 }, { url: cardUrl(27), w: 2134, h: 1333 }, { url: cardUrl(29), w: 1486, h: 685 }];
const wideAnswer = (sheets: number): CardAnswer => ({ sheets, front: WIDE_SHOTS.slice(0, sheets).map((image, i) => ({ i, name: `Preview${i}`, variant: null, image })), failure: null });

function fakeAsk(delay: number) {
  return (path: string) => new Promise<CardAnswer | null>(resolve => setTimeout(() => {
    const i = pearlFiles.findIndex(f => f.path === path);
    if (i >= pearlFiles.length - 2) resolve({ sheets: 1, front: [], failure: null });
    else resolve(answer(pearlFiles[i].functions.length, i, 360, 780));
  }, delay));
}

export const Pearl: Story = { render: () => {
  const cards = useMemo(() => createCardQueue(fakeAsk(500)), []);
  return <div className="story-shell gallery"><GalleryGrid files={pearlFiles} ready cards={cards} onOpen={() => {}} /></div>;
} };

export const Loading: Story = { render: () => {
  const cards = useMemo(() => createCardQueue(() => new Promise<null>(() => {})), []);
  return <div className="story-shell gallery"><GalleryGrid files={null} ready={false} cards={cards} onOpen={() => {}} /></div>;
} };

const text = { name: 'SearchScreenWithAVeryLongNameThatNeedsAMiddleCut', pkg: 'feature.search.ui.components', mod: 'feature/search' };
const views: Array<[string, CardView]> = [
  ['done', viewOf(answer(1, 0, 360, 780))],
  ['sheets', viewOf(answer(4, 1, 360, 780))],
  ['wide', viewOf(wideAnswer(2))],
  ['loading', { status: 'loading' }],
  ['failed', viewOf(null)],
];
export const Cards: Story = { render: () => <div className="story-shell gallery"><div className="gallery-grid">
  {views.map(([k, v]) => <GalleryCard key={k} text={text} view={v} />)}
</div></div> };

type VeilArgs = { outcome: 'done' | 'failed' };

function VeilDemo({ outcome }: VeilArgs) {
  const [round, setRound] = useState(0);
  const [arrived, setArrived] = useState(false);
  const view: CardView = !arrived ? { status: 'loading' } : outcome === 'done' ? viewOf(answer(3, round, 360, 780)) : viewOf(null);
  return <div className="story-shell gallery">
    <p><button type="button" onClick={() => setArrived(true)} disabled={arrived}>그림 도착</button>{' '}
      <button type="button" onClick={() => { setArrived(false); setRound(r => r + 1); }}>다시</button></p>
    <div className="gallery-grid">{[0, 1, 2].map(i => <GalleryCard key={`${round}-${i}`} text={{ ...text, name: `${text.name}${i}` }} view={view} />)}</div>
  </div>;
}

export const LoadingVeil: StoryObj<VeilArgs> = {
  args: { outcome: 'done' },
  argTypes: { outcome: { control: 'inline-radio', options: ['done', 'failed'] } },
  render: args => <VeilDemo {...args} />,
};
