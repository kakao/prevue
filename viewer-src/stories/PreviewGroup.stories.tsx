import type { Meta, StoryObj } from '@storybook/react-vite';
import '../static/style.css';
import { PreviewGroup } from '../src/components/PreviewBoard';
import { pearlBoard } from './pearl';

const meta = { title: '보드/PreviewGroup', args: { group: 0 }, argTypes: { group: { control: { type: 'range', min: 0, max: pearlBoard.groups.length - 1 } } } } satisfies Meta<{ group: number }>;
export default meta;
type Story = StoryObj<{ group: number }>;
export const Pearl: Story = { render: ({ group }) => <div className="board" id="cards"><PreviewGroup group={pearlBoard.groups[group]} /></div> };
