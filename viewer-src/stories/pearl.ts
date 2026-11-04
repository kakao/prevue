import state from './pearl/state.json';
import type { Board } from '../src/state';

// fixtures/pearl 의 PearlPreviews.kt 보드 30장 — 실제 데몬이 보낸 상태와 그 그림이다(capture-pearl.mjs). 그림 주소만 Storybook 의 것으로 바꾼다.
// 보드만 쓴다 — 같은 상태의 selection 은 뷰어가 보낸 bounds 배열을 그대로 실어 계약 예제의 모양과 다르다.
const images = import.meta.glob<string>('./pearl/*.jpg', { eager: true, query: '?url', import: 'default' });
export const pearlBoard = {
  ...state.board,
  groups: state.board.groups.map(g => ({ ...g, cards: g.cards.map(c => ({ ...c, imageUrl: images[`./pearl/${c.index}.jpg`] ?? null })) })),
} satisfies Board;
