import type { Meta, StoryObj } from '@storybook/react-vite';
import '../legacy/style.css';
import { PreviewBoard } from '../src/components/PreviewBoard';
import { exampleArgs, examples } from './examples';
import { pearlBoard } from './pearl';

const meta = { title: '보드/PreviewBoard', ...exampleArgs } satisfies Meta<{ example: number }>;
export default meta;
type Story = StoryObj<{ example: number }>;
// 묶음마다 배율 하나(D-62) — 창 폭을 바꾸면 한 줄에 안 드는 묶음만 줄어들고 머리에 배율이 붙는다.
export const Pearl: Story = { render: () => <PreviewBoard board={pearlBoard} screen="board" /> };
// 이름 없는 장 — 섞인 묶음은 빈 첫 줄을 지켜 그림 윗선이 맞고 ▶는 크기 칸 줄에 선다. 묶음 전체에 이름이 없으면 이름표가 한 줄이다.
const themes = pearlBoard.groups[6];
const unnamed = { ...pearlBoard, groups: [
  { ...themes, cards: themes.cards.map((c, i) => i === 1 ? { ...c, label: '' } : c) },
  { ...pearlBoard.groups[7], cards: pearlBoard.groups[7].cards.map(c => ({ ...c, label: '' })) },
] };
export const Unnamed: Story = { render: () => <PreviewBoard board={unnamed} screen="board" /> };
// 계약 예제의 그림 주소는 데몬의 것이라 Storybook 에서는 비어 보인다.
export const Contract: Story = { render: ({ example }) => <PreviewBoard board={examples[example].board} screen="board" /> };
