import type { Meta, StoryObj } from '@storybook/react-vite';
import '../legacy/style.css';
import { PreviewGroup } from '../src/components/PreviewBoard';
import { pearlBoard } from './pearl';

// 함수 하나가 묶음 하나다(D-62) — 한 장뿐인 함수도 머리를 가진다. 배율은 PreviewBoard 가 창 폭으로 재므로 여기서는 원래 크기다.
const meta = { title: '보드/PreviewGroup', args: { group: 0 }, argTypes: { group: { control: { type: 'range', min: 0, max: pearlBoard.groups.length - 1 } } } } satisfies Meta<{ group: number }>;
export default meta;
type Story = StoryObj<{ group: number }>;
export const Pearl: Story = { render: ({ group }) => <div className="board" id="cards"><PreviewGroup group={pearlBoard.groups[group]} /></div> };
