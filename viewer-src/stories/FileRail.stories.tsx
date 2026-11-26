import type { Meta, StoryObj } from '@storybook/react-vite';
import '../static/style.css';
import { FileRail } from '../src/components/FileRail';
import { exampleArgs, examples } from './examples';

const meta = { title: '공통/FileRail', ...exampleArgs, args: { example: 2 } } satisfies Meta<{ example: number }>;
export default meta;
type Story = StoryObj<{ example: number }>;
export const Contract: Story = { render: ({ example }) => <div className="story-shell"><FileRail tabs={examples[example].tabs} screen={examples[example].screen} /></div> };
