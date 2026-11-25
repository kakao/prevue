import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo } from 'react';
import '../legacy/style.css';
import { GalleryCard, GalleryGrid } from '../src/components/Gallery';
import { createCardQueue, type CardAnswer, type CardView } from '../src/gallery/queue';
import { pearlBoard, pearlFiles } from './pearl';

// 갤러리(D-198 · D-200) — 데몬 없이 pearl 목록과 보드 그림으로 돌린다. 카드 그림은 화면에 든 카드만 하나씩 묻고, 묻는 데 잠깐 걸린다.
// 맨 뒤 두 파일은 빌드 산출물이 없는 파일처럼 그리지 못한다.
const meta = { title: '파일/Gallery' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const shots = pearlBoard.groups.flatMap(g => g.cards).map(c => c.imageUrl).filter((u): u is string => !!u);
const NOW = Math.max(...pearlFiles.map(f => f.mtime)) + 5 * 60000;

function fakeAsk(delay: number) {
  return (path: string) => new Promise<CardAnswer | null>(resolve => setTimeout(() => {
    const i = pearlFiles.findIndex(f => f.path === path);
    if (i >= pearlFiles.length - 2) resolve({ ok: false, sheets: 1, image: null, failure: null });
    else resolve({ ok: true, sheets: pearlFiles[i].functions.length, image: { url: shots[i % shots.length], w: 360, h: 780 }, failure: null });
  }, delay));
}

export const Pearl: Story = { render: () => {
  const cards = useMemo(() => createCardQueue(fakeAsk(500)), []);
  return <div className="story-shell gallery"><GalleryGrid files={pearlFiles} ready cards={cards} now={NOW} onOpen={() => {}} /></div>;
} };

export const Loading: Story = { render: () => {
  const cards = useMemo(() => createCardQueue(() => new Promise<null>(() => {})), []);
  return <div className="story-shell gallery"><GalleryGrid files={null} ready={false} cards={cards} onOpen={() => {}} /></div>;
} };

// 카드의 네 모양 — 그림 · 여러 장 · 로딩 판 · 그리지 못함. 대기와 묻는 중은 같은 로딩 판이다.
const text = { name: 'SearchScreenWithAVeryLongNameThatNeedsAMiddleCut', pkg: 'feature.search.ui.components', mod: 'feature/search', changed: '5 min ago' };
const views: Array<[string, CardView]> = [
  ['done', { status: 'done', sheets: 1, image: { url: shots[0], w: 360, h: 780 } }],
  ['sheets', { status: 'done', sheets: 4, image: { url: shots[1], w: 360, h: 780 } }],
  ['wide', { status: 'done', sheets: 2, image: { url: shots[2], w: 780, h: 360 } }],
  ['loading', { status: 'loading' }],
  ['failed', { status: 'error', sheets: 1, failure: null }],
];
export const Cards: Story = { render: () => <div className="story-shell gallery"><div className="gallery-grid">
  {views.map(([k, v]) => <GalleryCard key={k} text={text} view={v} />)}
</div></div> };
