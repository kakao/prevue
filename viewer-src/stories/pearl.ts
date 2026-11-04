import board from './pearl/board.json';
import files from './pearl/preview-files.json';
import type { PreviewFile } from '../src/match';
import type { Board } from '../src/state';

// fixtures/pearl 의 PearlPreviews.kt 보드 30장 — 실제 데몬이 보낸 상태의 보드와 그 그림이다(capture-pearl.mjs). 그림 주소만 Storybook 의 것으로 바꾼다.
const images = import.meta.glob<string>('./pearl/*.jpg', { eager: true, query: '?url', import: 'default' });
export const pearlBoard = {
  ...board,
  groups: board.groups.map(g => ({ ...g, cards: g.cards.map(c => ({ ...c, imageUrl: images[`./pearl/${c.index}.jpg`] ?? null })) })),
} satisfies Board;

// 같은 데몬의 빠른 열기 목록(`/preview-files.json`) — 최근 바뀐 순이다.
export const pearlFiles = files.files satisfies PreviewFile[];
// 최근 연 파일은 브라우저에만 남는 기록이라 데몬에 없다 — 이 보드의 파일과 목록 맨 뒤 두 파일을 연 것으로 둔다.
export const pearlRecent = [board.file, ...files.files.slice(-2).map(f => f.path)];
