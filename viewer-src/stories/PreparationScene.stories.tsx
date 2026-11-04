import type { Meta, StoryObj } from '@storybook/react-vite';
import { pearlBoard } from './pearl';
import { SceneStory } from './preparation';

// 준비 중에는 조각 모형이 떠다니고, 다 그리면 그 자리에 실제 PNG가 선다. 틀의 모양(data-form)은 그림의 비율로 정한다.
const meta = { title: '준비/PreparationScene' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const cards = pearlBoard.groups.flatMap(g => g.cards);
export const Model: Story = { render: () => <SceneStory phase="render" /> };
export const DrawnScreen: Story = { render: () => <SceneStory phase="render" drawn={cards[0]} /> };
export const DrawnComponent: Story = { render: () => <SceneStory phase="render" drawn={cards[5]} /> };
