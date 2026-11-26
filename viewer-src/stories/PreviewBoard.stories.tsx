import type { Meta, StoryObj } from '@storybook/react-vite';
import '../static/style.css';
import { PreviewBoard } from '../src/components/PreviewBoard';
import { exampleArgs, examples } from './examples';
import { pearlBoard } from './pearl';

const meta = { title: '보드/PreviewBoard', ...exampleArgs } satisfies Meta<{ example: number }>;
export default meta;
type Story = StoryObj<{ example: number }>;
export const Pearl: Story = { render: () => <PreviewBoard board={pearlBoard} screen="board" /> };
const themes = pearlBoard.groups.find(g => g.name === 'PearlListThemesPreview')!;
const errors = pearlBoard.groups.find(g => g.name === 'PearlErrorThemesPreview')!;
const unnamed = { ...pearlBoard, groups: [
  { ...themes, cards: themes.cards.map((c, i) => i === 1 ? { ...c, label: '' } : c) },
  { ...errors, cards: errors.cards.map(c => ({ ...c, label: '' })) },
] };
export const Unnamed: Story = { render: () => <PreviewBoard board={unnamed} screen="board" /> };
export const Contract: Story = { render: ({ example }) => <PreviewBoard board={examples[example].board} screen="board" /> };
