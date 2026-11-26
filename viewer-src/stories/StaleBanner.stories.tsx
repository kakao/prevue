import type { Meta, StoryObj } from '@storybook/react-vite';
import '../static/style.css';
import { StaleBanner } from '../src/components/StaleBanner';
import { exampleArgs, examples } from './examples';

const meta = { title: '공통/StaleBanner', ...exampleArgs } satisfies Meta<{ example: number }>;
export default meta;
type Story = StoryObj<{ example: number }>;
export const Contract: Story = { render: ({ example }) => <div className="story-shell"><StaleBanner rows={examples[example].stale} /><pre>{JSON.stringify(examples[example].stale)}</pre></div> };
