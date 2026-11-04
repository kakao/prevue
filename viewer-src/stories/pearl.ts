import board from './pearl/board.json';
import type { Board } from '../src/state';

// fixtures/pearl 의 PearlPreviews.kt 보드 30장 — 실제 데몬이 보낸 상태의 보드와 그 그림이다(capture-pearl.mjs). 그림 주소만 Storybook 의 것으로 바꾼다.
const images = import.meta.glob<string>('./pearl/*.jpg', { eager: true, query: '?url', import: 'default' });
export const pearlBoard = {
  ...board,
  groups: board.groups.map(g => ({ ...g, cards: g.cards.map(c => ({ ...c, imageUrl: images[`./pearl/${c.index}.jpg`] ?? null })) })),
} satisfies Board;
